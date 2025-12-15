"""
SCORM Runtime API Views

REST API endpoints for SCORM runtime communication. These endpoints
implement the backend for SCORM API methods (LMSInitialize, LMSGetValue,
LMSSetValue, LMSCommit, LMSFinish).

**Validates: Requirements 2.1, 2.2, 2.5**
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from ..runtime_api import ScormAPIAdapter
from ..serializers.runtime_serializers import (
    ScormInitializeSerializer,
    ScormInitializeResponseSerializer,
    ScormGetValueSerializer,
    ScormGetValueResponseSerializer,
    ScormSetValueSerializer,
    ScormSetValueResponseSerializer,
    ScormCommitSerializer,
    ScormCommitResponseSerializer,
    ScormTerminateSerializer,
    ScormTerminateResponseSerializer,
)


# Store active SCORM sessions in memory
# In production, this should use a cache like Redis
_active_sessions = {}


def _get_session_key(student_id: int, sco_id: int) -> str:
    """Generate a unique session key."""
    return f"{student_id}_{sco_id}"


def _get_or_create_adapter(student_id: int, sco_id: int, version: str = '1.2', force_new: bool = False) -> ScormAPIAdapter:
    """
    Get existing adapter or create a new one.
    
    Args:
        student_id: Student ID
        sco_id: SCO ID
        version: SCORM version
        force_new: If True, always create a new adapter (used for initialize)
    """
    session_key = _get_session_key(student_id, sco_id)
    
    if force_new or session_key not in _active_sessions:
        _active_sessions[session_key] = ScormAPIAdapter(student_id, sco_id, version)
    
    return _active_sessions[session_key]


def _remove_adapter(student_id: int, sco_id: int) -> None:
    """Remove adapter from active sessions."""
    session_key = _get_session_key(student_id, sco_id)
    if session_key in _active_sessions:
        del _active_sessions[session_key]


class ScormInitializeView(APIView):
    """
    SCORM Initialize endpoint (LMSInitialize).
    
    Initializes a SCORM session for a student and SCO.
    This must be called before any other SCORM API methods.
    
    **POST /api/scorm/runtime/initialize/**
    
    Request body:
    ```json
    {
        "student_id": 1,
        "sco_id": 1,
        "parameter": ""
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "result": "true",
        "error_code": "0",
        "error_message": "No error"
    }
    ```
    
    **Validates: Requirements 2.1**
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle SCORM initialize request."""
        serializer = ScormInitializeSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_id = serializer.validated_data['student_id']
        sco_id = serializer.validated_data['sco_id']
        parameter = serializer.validated_data.get('parameter', '')
        
        # Always create a new adapter for initialize (force_new=True)
        adapter = _get_or_create_adapter(student_id, sco_id, force_new=True)
        
        # Call initialize
        result = adapter.initialize(parameter)
        
        # Prepare response
        response_data = {
            'success': result == "true",
            'result': result,
            'error_code': adapter.get_last_error(),
            'error_message': adapter.get_error_string(adapter.get_last_error())
        }
        
        response_serializer = ScormInitializeResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ScormGetValueView(APIView):
    """
    SCORM Get Value endpoint (LMSGetValue).
    
    Retrieves the value of a CMI data model element.
    
    **POST /api/scorm/runtime/get-value/**
    
    Request body:
    ```json
    {
        "student_id": 1,
        "sco_id": 1,
        "element": "cmi.core.lesson_status"
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "value": "incomplete",
        "error_code": "0",
        "error_message": "No error"
    }
    ```
    
    **Validates: Requirements 2.2**
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle SCORM get value request."""
        serializer = ScormGetValueSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_id = serializer.validated_data['student_id']
        sco_id = serializer.validated_data['sco_id']
        element = serializer.validated_data['element']
        
        # Get adapter (must be initialized first)
        adapter = _get_or_create_adapter(student_id, sco_id)
        
        # Call get_value
        value = adapter.get_value(element)
        
        # Prepare response
        response_data = {
            'success': adapter.get_last_error() == "0",
            'value': value,
            'error_code': adapter.get_last_error(),
            'error_message': adapter.get_error_string(adapter.get_last_error())
        }
        
        response_serializer = ScormGetValueResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ScormSetValueView(APIView):
    """
    SCORM Set Value endpoint (LMSSetValue).
    
    Sets the value of a CMI data model element.
    Changes are not persisted until commit is called.
    
    **POST /api/scorm/runtime/set-value/**
    
    Request body:
    ```json
    {
        "student_id": 1,
        "sco_id": 1,
        "element": "cmi.core.lesson_status",
        "value": "completed"
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "result": "true",
        "error_code": "0",
        "error_message": "No error"
    }
    ```
    
    **Validates: Requirements 2.2**
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle SCORM set value request."""
        serializer = ScormSetValueSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_id = serializer.validated_data['student_id']
        sco_id = serializer.validated_data['sco_id']
        element = serializer.validated_data['element']
        value = serializer.validated_data['value']
        
        # Get adapter (must be initialized first)
        adapter = _get_or_create_adapter(student_id, sco_id)
        
        # Call set_value
        result = adapter.set_value(element, value)
        
        # Prepare response
        response_data = {
            'success': result == "true",
            'result': result,
            'error_code': adapter.get_last_error(),
            'error_message': adapter.get_error_string(adapter.get_last_error())
        }
        
        response_serializer = ScormSetValueResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ScormCommitView(APIView):
    """
    SCORM Commit endpoint (LMSCommit).
    
    Persists all CMI data changes to the database.
    Should be called periodically and before termination.
    
    **POST /api/scorm/runtime/commit/**
    
    Request body:
    ```json
    {
        "student_id": 1,
        "sco_id": 1,
        "parameter": ""
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "result": "true",
        "error_code": "0",
        "error_message": "No error"
    }
    ```
    
    **Validates: Requirements 2.5**
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle SCORM commit request."""
        serializer = ScormCommitSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_id = serializer.validated_data['student_id']
        sco_id = serializer.validated_data['sco_id']
        parameter = serializer.validated_data.get('parameter', '')
        
        # Get adapter (must be initialized first)
        adapter = _get_or_create_adapter(student_id, sco_id)
        
        # Call commit
        result = adapter.commit(parameter)
        
        # Prepare response
        response_data = {
            'success': result == "true",
            'result': result,
            'error_code': adapter.get_last_error(),
            'error_message': adapter.get_error_string(adapter.get_last_error())
        }
        
        response_serializer = ScormCommitResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ScormTerminateView(APIView):
    """
    SCORM Terminate endpoint (LMSFinish).
    
    Commits any pending changes and terminates the SCORM session.
    No further API calls should be made after termination.
    
    **POST /api/scorm/runtime/terminate/**
    
    Request body:
    ```json
    {
        "student_id": 1,
        "sco_id": 1,
        "parameter": ""
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "result": "true",
        "error_code": "0",
        "error_message": "No error"
    }
    ```
    
    **Validates: Requirements 2.5**
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle SCORM terminate request."""
        serializer = ScormTerminateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_id = serializer.validated_data['student_id']
        sco_id = serializer.validated_data['sco_id']
        parameter = serializer.validated_data.get('parameter', '')
        
        # Get adapter (don't create new one - must be initialized first)
        # This ensures terminate fails if initialize wasn't called
        adapter = _get_or_create_adapter(student_id, sco_id, force_new=False)
        
        # Call terminate
        result = adapter.terminate(parameter)
        
        # Remove adapter from active sessions
        _remove_adapter(student_id, sco_id)
        
        # Prepare response
        response_data = {
            'success': result == "true",
            'result': result,
            'error_code': adapter.get_last_error(),
            'error_message': adapter.get_error_string(adapter.get_last_error())
        }
        
        response_serializer = ScormTerminateResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
