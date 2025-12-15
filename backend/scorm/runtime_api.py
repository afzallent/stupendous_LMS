"""
SCORM Runtime API Adapter

Implements the SCORM 1.2 and SCORM 2004 runtime API for communication
between SCORM content and the LMS.

This adapter provides the JavaScript API methods that SCORM content uses
to initialize sessions, get/set CMI data, and commit changes.
"""

from typing import Optional, Dict, Any, Tuple
from decimal import Decimal, InvalidOperation
from datetime import datetime
import json

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from .models import ScormData, ScormSCO, ScormPackage


class ScormAPIError:
    """SCORM API error codes"""
    # General errors
    NO_ERROR = "0"
    GENERAL_EXCEPTION = "101"
    GENERAL_INITIALIZATION_FAILURE = "102"
    ALREADY_INITIALIZED = "103"
    CONTENT_INSTANCE_TERMINATED = "104"
    GENERAL_TERMINATION_FAILURE = "111"
    TERMINATION_BEFORE_INITIALIZATION = "112"
    TERMINATION_AFTER_TERMINATION = "113"
    
    # Data model errors
    RETRIEVE_DATA_BEFORE_INITIALIZATION = "122"
    RETRIEVE_DATA_AFTER_TERMINATION = "123"
    STORE_DATA_BEFORE_INITIALIZATION = "132"
    STORE_DATA_AFTER_TERMINATION = "133"
    COMMIT_BEFORE_INITIALIZATION = "142"
    COMMIT_AFTER_TERMINATION = "143"
    
    # Data model element errors
    ELEMENT_NOT_SPECIFIED = "201"
    INVALID_ARGUMENT_ERROR = "301"
    ELEMENT_NOT_INITIALIZED = "301"
    ELEMENT_IS_READ_ONLY = "403"
    ELEMENT_IS_WRITE_ONLY = "404"
    INCORRECT_DATA_TYPE = "405"
    
    # Error messages
    ERROR_MESSAGES = {
        "0": "No error",
        "101": "General exception",
        "102": "General initialization failure",
        "103": "Already initialized",
        "104": "Content instance terminated",
        "111": "General termination failure",
        "112": "Termination before initialization",
        "113": "Termination after termination",
        "122": "Retrieve data before initialization",
        "123": "Retrieve data after termination",
        "132": "Store data before initialization",
        "133": "Store data after termination",
        "142": "Commit before initialization",
        "143": "Commit after termination",
        "201": "Element not specified",
        "301": "Invalid argument error",
        "403": "Element is read only",
        "404": "Element is write only",
        "405": "Incorrect data type",
    }


class ScormAPIAdapter:
    """
    SCORM API adapter implementing SCORM 1.2 and 2004 runtime APIs.
    
    This class provides the backend implementation for SCORM API methods
    that SCORM content calls via JavaScript. It manages CMI data storage,
    session state, and error handling.
    
    **Validates: Requirements 2.1, 2.2, 2.5**
    """
    
    # Session states
    STATE_NOT_INITIALIZED = "not_initialized"
    STATE_INITIALIZED = "initialized"
    STATE_TERMINATED = "terminated"
    
    # Read-only CMI elements (SCORM 1.2)
    READONLY_ELEMENTS_12 = {
        'cmi.core._children',
        'cmi.core.student_id',
        'cmi.core.student_name',
        'cmi.core.credit',
        'cmi.core.entry',
        'cmi.core.total_time',
        'cmi.core.lesson_mode',
        'cmi.launch_data',
        'cmi.comments_from_lms',
        'cmi.student_data._children',
        'cmi.student_data.mastery_score',
        'cmi.student_data.max_time_allowed',
        'cmi.student_data.time_limit_action',
    }
    
    # Write-only CMI elements (SCORM 1.2)
    WRITEONLY_ELEMENTS_12 = {
        'cmi.core.session_time',
    }
    
    def __init__(self, student_id: int, sco_id: int, version: str = '1.2'):
        """
        Initialize the SCORM API adapter.
        
        Args:
            student_id: ID of the student
            sco_id: ID of the SCO (Sharable Content Object)
            version: SCORM version ('1.2' or '2004')
        """
        self.student_id = student_id
        self.sco_id = sco_id
        self.version = version
        self.state = self.STATE_NOT_INITIALIZED
        self.last_error = ScormAPIError.NO_ERROR
        self.scorm_data: Optional[ScormData] = None
        self.session_data: Dict[str, Any] = {}
        self.session_start_time: Optional[datetime] = None
    
    def initialize(self, parameter: str = "") -> str:
        """
        Initialize the SCORM session (LMSInitialize).
        
        This method must be called before any other API methods.
        It loads existing CMI data or creates a new session.
        
        Args:
            parameter: Reserved parameter (should be empty string)
            
        Returns:
            "true" on success, "false" on failure
            
        **Validates: Requirements 2.1**
        """
        # Check if already initialized
        if self.state == self.STATE_INITIALIZED:
            self.last_error = ScormAPIError.ALREADY_INITIALIZED
            return "false"
        
        # Check if already terminated
        if self.state == self.STATE_TERMINATED:
            self.last_error = ScormAPIError.CONTENT_INSTANCE_TERMINATED
            return "false"
        
        try:
            # Load or create ScormData
            sco = ScormSCO.objects.get(id=self.sco_id)
            
            self.scorm_data, created = ScormData.objects.get_or_create(
                student_id=self.student_id,
                sco=sco,
                defaults={
                    'lesson_status': 'not attempted',
                    'entry': 'ab-initio',
                    'cmi_data': {}
                }
            )
            
            # Set entry mode
            if created:
                self.scorm_data.entry = 'ab-initio'
            else:
                # If lesson was previously completed or passed, entry is empty
                if self.scorm_data.lesson_status in ['completed', 'passed']:
                    self.scorm_data.entry = ''
                else:
                    self.scorm_data.entry = 'resume'
            
            # Initialize session data from stored CMI data
            self.session_data = self.scorm_data.cmi_data.copy()
            
            # Mark as initialized
            self.state = self.STATE_INITIALIZED
            self.session_start_time = timezone.now()
            self.last_error = ScormAPIError.NO_ERROR
            
            return "true"
        
        except ObjectDoesNotExist:
            self.last_error = ScormAPIError.GENERAL_INITIALIZATION_FAILURE
            return "false"
        except Exception as e:
            self.last_error = ScormAPIError.GENERAL_EXCEPTION
            return "false"
    
    def get_value(self, element: str) -> str:
        """
        Get a CMI data model value (LMSGetValue).
        
        Retrieves the value of a specified CMI element from the current session.
        
        Args:
            element: CMI element path (e.g., "cmi.core.lesson_status")
            
        Returns:
            String value of the element, or empty string on error
            
        **Validates: Requirements 2.2**
        """
        # Check state
        if self.state == self.STATE_NOT_INITIALIZED:
            self.last_error = ScormAPIError.RETRIEVE_DATA_BEFORE_INITIALIZATION
            return ""
        
        if self.state == self.STATE_TERMINATED:
            self.last_error = ScormAPIError.RETRIEVE_DATA_AFTER_TERMINATION
            return ""
        
        # Check if element is write-only
        if self.version == '1.2' and element in self.WRITEONLY_ELEMENTS_12:
            self.last_error = ScormAPIError.ELEMENT_IS_WRITE_ONLY
            return ""
        
        try:
            # Handle special read-only elements
            if element == 'cmi.core.student_id':
                value = str(self.student_id)
            elif element == 'cmi.core.student_name':
                # Get student name from user model
                from core.models import User
                try:
                    user = User.objects.get(id=self.student_id)
                    value = f"{user.first_name} {user.last_name}".strip() or user.username
                except User.DoesNotExist:
                    value = "Unknown Student"
            elif element == 'cmi.core.credit':
                value = self.scorm_data.credit
            elif element == 'cmi.core.entry':
                value = self.scorm_data.entry
            elif element == 'cmi.core.lesson_mode':
                value = self.scorm_data.mode
            elif element == 'cmi.core.total_time':
                value = self.scorm_data.total_time or "0000:00:00.00"
            elif element == 'cmi.core.lesson_status':
                value = self.scorm_data.lesson_status
            elif element == 'cmi.core.lesson_location':
                value = self.scorm_data.lesson_location or ""
            elif element == 'cmi.core.score.raw':
                value = str(self.scorm_data.score_raw) if self.scorm_data.score_raw is not None else ""
            elif element == 'cmi.core.score.min':
                value = str(self.scorm_data.score_min) if self.scorm_data.score_min is not None else ""
            elif element == 'cmi.core.score.max':
                value = str(self.scorm_data.score_max) if self.scorm_data.score_max is not None else ""
            elif element == 'cmi.suspend_data':
                value = self.scorm_data.suspend_data or ""
            elif element == 'cmi.launch_data':
                # Get launch data from SCO
                value = ""  # TODO: Implement launch data from SCO
            elif element == 'cmi.student_data.mastery_score':
                # Get mastery score from package settings
                value = str(self.scorm_data.sco.package.passing_score) if self.scorm_data.sco.package.passing_score else ""
            elif element == 'cmi.student_data.max_time_allowed':
                value = self.scorm_data.sco.max_time_allowed or ""
            elif element == 'cmi.student_data.time_limit_action':
                value = self.scorm_data.sco.time_limit_action or ""
            else:
                # Try to get from session data
                value = self._get_nested_value(self.session_data, element)
            
            self.last_error = ScormAPIError.NO_ERROR
            return str(value)
        
        except Exception as e:
            self.last_error = ScormAPIError.GENERAL_EXCEPTION
            return ""
    
    def set_value(self, element: str, value: str) -> str:
        """
        Set a CMI data model value (LMSSetValue).
        
        Stores a value for a specified CMI element in the current session.
        Changes are not persisted until commit() is called.
        
        Args:
            element: CMI element path (e.g., "cmi.core.lesson_status")
            value: Value to set
            
        Returns:
            "true" on success, "false" on failure
            
        **Validates: Requirements 2.2**
        """
        # Check state
        if self.state == self.STATE_NOT_INITIALIZED:
            self.last_error = ScormAPIError.STORE_DATA_BEFORE_INITIALIZATION
            return "false"
        
        if self.state == self.STATE_TERMINATED:
            self.last_error = ScormAPIError.STORE_DATA_AFTER_TERMINATION
            return "false"
        
        # Check if element is read-only
        if self.version == '1.2' and element in self.READONLY_ELEMENTS_12:
            self.last_error = ScormAPIError.ELEMENT_IS_READ_ONLY
            return "false"
        
        try:
            # Handle special writable elements
            if element == 'cmi.core.lesson_status':
                # Validate lesson status value
                valid_statuses = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted']
                if value not in valid_statuses:
                    self.last_error = ScormAPIError.INCORRECT_DATA_TYPE
                    return "false"
                self.scorm_data.lesson_status = value
            
            elif element == 'cmi.core.lesson_location':
                self.scorm_data.lesson_location = value
            
            elif element == 'cmi.core.score.raw':
                try:
                    self.scorm_data.score_raw = Decimal(value)
                except (InvalidOperation, ValueError):
                    self.last_error = ScormAPIError.INCORRECT_DATA_TYPE
                    return "false"
            
            elif element == 'cmi.core.score.min':
                try:
                    self.scorm_data.score_min = Decimal(value)
                except (InvalidOperation, ValueError):
                    self.last_error = ScormAPIError.INCORRECT_DATA_TYPE
                    return "false"
            
            elif element == 'cmi.core.score.max':
                try:
                    self.scorm_data.score_max = Decimal(value)
                except (InvalidOperation, ValueError):
                    self.last_error = ScormAPIError.INCORRECT_DATA_TYPE
                    return "false"
            
            elif element == 'cmi.core.session_time':
                # Store session time (will be added to total_time on commit)
                self.scorm_data.session_time = value
            
            elif element == 'cmi.core.exit':
                # Store exit mode
                valid_exits = ['time-out', 'suspend', 'logout', '']
                if value not in valid_exits:
                    self.last_error = ScormAPIError.INCORRECT_DATA_TYPE
                    return "false"
                self.scorm_data.exit = value
            
            elif element == 'cmi.suspend_data':
                self.scorm_data.suspend_data = value
            
            else:
                # Store in session data
                self._set_nested_value(self.session_data, element, value)
            
            self.last_error = ScormAPIError.NO_ERROR
            return "true"
        
        except Exception as e:
            self.last_error = ScormAPIError.GENERAL_EXCEPTION
            return "false"
    
    def commit(self, parameter: str = "") -> str:
        """
        Persist CMI data to database (LMSCommit).
        
        Saves all changes made during the session to the database.
        This should be called periodically and before termination.
        
        Args:
            parameter: Reserved parameter (should be empty string)
            
        Returns:
            "true" on success, "false" on failure
            
        **Validates: Requirements 2.5**
        """
        # Check state
        if self.state == self.STATE_NOT_INITIALIZED:
            self.last_error = ScormAPIError.COMMIT_BEFORE_INITIALIZATION
            return "false"
        
        if self.state == self.STATE_TERMINATED:
            self.last_error = ScormAPIError.COMMIT_AFTER_TERMINATION
            return "false"
        
        try:
            # Update session time to total time
            if self.scorm_data.session_time:
                self.scorm_data.total_time = self._add_times(
                    self.scorm_data.total_time or "0000:00:00.00",
                    self.scorm_data.session_time
                )
            
            # Store session data in cmi_data JSON field
            self.scorm_data.cmi_data = self.session_data.copy()
            
            # Save to database
            self.scorm_data.save()
            
            self.last_error = ScormAPIError.NO_ERROR
            return "true"
        
        except Exception as e:
            self.last_error = ScormAPIError.GENERAL_EXCEPTION
            return "false"
    
    def terminate(self, parameter: str = "") -> str:
        """
        Terminate the SCORM session (LMSFinish).
        
        Commits any pending changes and closes the session.
        No further API calls should be made after termination.
        
        Args:
            parameter: Reserved parameter (should be empty string)
            
        Returns:
            "true" on success, "false" on failure
            
        **Validates: Requirements 2.5**
        """
        # Check state
        if self.state == self.STATE_NOT_INITIALIZED:
            self.last_error = ScormAPIError.TERMINATION_BEFORE_INITIALIZATION
            return "false"
        
        if self.state == self.STATE_TERMINATED:
            self.last_error = ScormAPIError.TERMINATION_AFTER_TERMINATION
            return "false"
        
        try:
            # Commit any pending changes
            commit_result = self.commit()
            if commit_result == "false":
                self.last_error = ScormAPIError.GENERAL_TERMINATION_FAILURE
                return "false"
            
            # Mark as terminated
            self.state = self.STATE_TERMINATED
            self.last_error = ScormAPIError.NO_ERROR
            
            return "true"
        
        except Exception as e:
            self.last_error = ScormAPIError.GENERAL_EXCEPTION
            return "false"
    
    def get_last_error(self) -> str:
        """
        Get the error code from the last API call (LMSGetLastError).
        
        Returns:
            Error code as string
        """
        return self.last_error
    
    def get_error_string(self, error_code: str) -> str:
        """
        Get a short description of an error code (LMSGetErrorString).
        
        Args:
            error_code: Error code to look up
            
        Returns:
            Error description string
        """
        return ScormAPIError.ERROR_MESSAGES.get(error_code, "Unknown error")
    
    def get_diagnostic(self, error_code: str) -> str:
        """
        Get detailed diagnostic information for an error (LMSGetDiagnostic).
        
        Args:
            error_code: Error code to get diagnostics for
            
        Returns:
            Diagnostic information string
        """
        # For now, return the same as error string
        # Can be extended to provide more detailed information
        return self.get_error_string(error_code)
    
    # Helper methods
    
    def _get_nested_value(self, data: Dict, path: str) -> Any:
        """
        Get a value from nested dictionary using dot notation.
        
        Args:
            data: Dictionary to search
            path: Dot-separated path (e.g., "cmi.core.lesson_status")
            
        Returns:
            Value at path, or empty string if not found
        """
        keys = path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return ""
        
        return current
    
    def _set_nested_value(self, data: Dict, path: str, value: Any) -> None:
        """
        Set a value in nested dictionary using dot notation.
        
        Args:
            data: Dictionary to modify
            path: Dot-separated path (e.g., "cmi.core.lesson_status")
            value: Value to set
        """
        keys = path.split('.')
        current = data
        
        # Navigate to the parent of the target key
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Set the value
        current[keys[-1]] = value
    
    def _add_times(self, time1: str, time2: str) -> str:
        """
        Add two SCORM time values in format HHHH:MM:SS.SS.
        
        Args:
            time1: First time value
            time2: Second time value
            
        Returns:
            Sum of times in SCORM format
        """
        try:
            # Parse time1
            parts1 = time1.split(':')
            hours1 = int(parts1[0])
            minutes1 = int(parts1[1])
            seconds1 = float(parts1[2])
            
            # Parse time2
            parts2 = time2.split(':')
            hours2 = int(parts2[0])
            minutes2 = int(parts2[1])
            seconds2 = float(parts2[2])
            
            # Add times
            total_seconds = seconds1 + seconds2
            total_minutes = minutes1 + minutes2
            total_hours = hours1 + hours2
            
            # Handle overflow
            if total_seconds >= 60:
                total_minutes += int(total_seconds // 60)
                total_seconds = total_seconds % 60
            
            if total_minutes >= 60:
                total_hours += int(total_minutes // 60)
                total_minutes = total_minutes % 60
            
            # Format result
            return f"{total_hours:04d}:{total_minutes:02d}:{total_seconds:05.2f}"
        
        except Exception:
            # If parsing fails, return time1
            return time1
