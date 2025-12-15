"""
Unit tests for SCORM Runtime API Adapter.

Tests the ScormAPIAdapter class implementation of SCORM 1.2 and 2004
runtime API methods.
"""

import pytest
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from courses.models import Course, Lesson
from scorm.models import ScormPackage, ScormSCO, ScormData
from scorm.runtime_api import ScormAPIAdapter, ScormAPIError


User = get_user_model()


@pytest.mark.django_db
class TestScormAPIAdapter(TestCase):
    """Test suite for ScormAPIAdapter"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user (student)
        self.student = User.objects.create_user(
            username='teststudent',
            email='student@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Student'
        )
        self.student.is_student = True
        self.student.save()
        
        # Create instructor
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123'
        )
        self.instructor.is_instructor = True
        self.instructor.save()
        
        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course description',
            instructor=self.instructor
        )
        
        # Create lesson
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson',
            order=1
        )
        
        # Create SCORM package
        self.package = ScormPackage.objects.create(
            course=self.course,
            lesson=self.lesson,
            version='1.2',
            identifier='test-package-001',
            title='Test SCORM Package',
            description='Test package description',
            manifest_data={'test': 'data'},
            content_path='scorm_packages/test-package-001/',
            launch_url='index.html',
            uploaded_by=self.instructor,
            completion_criteria='status',
            passing_score=80,
            allow_retry=True
        )
        
        # Create SCO
        self.sco = ScormSCO.objects.create(
            package=self.package,
            identifier='sco-001',
            title='Test SCO',
            launch_url='sco/index.html',
            order=0
        )
    
    def test_initialize_new_session(self):
        """Test initializing a new SCORM session"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        result = adapter.initialize()
        
        assert result == "true"
        assert adapter.state == ScormAPIAdapter.STATE_INITIALIZED
        assert adapter.last_error == ScormAPIError.NO_ERROR
        assert adapter.scorm_data is not None
        assert adapter.scorm_data.entry == 'ab-initio'
        assert adapter.scorm_data.lesson_status == 'not attempted'
    
    def test_initialize_resume_session(self):
        """Test resuming an existing SCORM session"""
        # Create existing session data
        existing_data = ScormData.objects.create(
            student=self.student,
            sco=self.sco,
            lesson_status='incomplete',
            lesson_location='page5',
            suspend_data='{"progress": 50}',
            cmi_data={'test': 'value'}
        )
        
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        result = adapter.initialize()
        
        assert result == "true"
        assert adapter.state == ScormAPIAdapter.STATE_INITIALIZED
        assert adapter.scorm_data.entry == 'resume'
        assert adapter.session_data == {'test': 'value'}
    
    def test_initialize_already_initialized(self):
        """Test that initializing twice returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        adapter.initialize()
        result = adapter.initialize()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.ALREADY_INITIALIZED
    
    def test_initialize_after_termination(self):
        """Test that initializing after termination returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        adapter.initialize()
        adapter.terminate()
        result = adapter.initialize()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.CONTENT_INSTANCE_TERMINATED
    
    def test_get_value_student_id(self):
        """Test getting student ID"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        value = adapter.get_value('cmi.core.student_id')
        
        assert value == str(self.student.id)
        assert adapter.last_error == ScormAPIError.NO_ERROR
    
    def test_get_value_student_name(self):
        """Test getting student name"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        value = adapter.get_value('cmi.core.student_name')
        
        assert value == 'Test Student'
        assert adapter.last_error == ScormAPIError.NO_ERROR
    
    def test_get_value_lesson_status(self):
        """Test getting lesson status"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        value = adapter.get_value('cmi.core.lesson_status')
        
        assert value == 'not attempted'
        assert adapter.last_error == ScormAPIError.NO_ERROR
    
    def test_get_value_before_initialization(self):
        """Test that getting value before initialization returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        value = adapter.get_value('cmi.core.lesson_status')
        
        assert value == ""
        assert adapter.last_error == ScormAPIError.RETRIEVE_DATA_BEFORE_INITIALIZATION
    
    def test_get_value_after_termination(self):
        """Test that getting value after termination returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.terminate()
        
        value = adapter.get_value('cmi.core.lesson_status')
        
        assert value == ""
        assert adapter.last_error == ScormAPIError.RETRIEVE_DATA_AFTER_TERMINATION
    
    def test_get_value_write_only_element(self):
        """Test that getting write-only element returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        value = adapter.get_value('cmi.core.session_time')
        
        assert value == ""
        assert adapter.last_error == ScormAPIError.ELEMENT_IS_WRITE_ONLY
    
    def test_set_value_lesson_status(self):
        """Test setting lesson status"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        result = adapter.set_value('cmi.core.lesson_status', 'completed')
        
        assert result == "true"
        assert adapter.scorm_data.lesson_status == 'completed'
        assert adapter.last_error == ScormAPIError.NO_ERROR
    
    def test_set_value_lesson_location(self):
        """Test setting lesson location (bookmark)"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        result = adapter.set_value('cmi.core.lesson_location', 'page10')
        
        assert result == "true"
        assert adapter.scorm_data.lesson_location == 'page10'
        assert adapter.last_error == ScormAPIError.NO_ERROR
    
    def test_set_value_score(self):
        """Test setting score values"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        adapter.set_value('cmi.core.score.raw', '85')
        adapter.set_value('cmi.core.score.min', '0')
        adapter.set_value('cmi.core.score.max', '100')
        
        assert adapter.scorm_data.score_raw == Decimal('85')
        assert adapter.scorm_data.score_min == Decimal('0')
        assert adapter.scorm_data.score_max == Decimal('100')
    
    def test_set_value_invalid_score(self):
        """Test setting invalid score returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        result = adapter.set_value('cmi.core.score.raw', 'invalid')
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.INCORRECT_DATA_TYPE
    
    def test_set_value_suspend_data(self):
        """Test setting suspend data"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        suspend_data = '{"page": 5, "answers": [1, 2, 3]}'
        result = adapter.set_value('cmi.suspend_data', suspend_data)
        
        assert result == "true"
        assert adapter.scorm_data.suspend_data == suspend_data
    
    def test_set_value_before_initialization(self):
        """Test that setting value before initialization returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        result = adapter.set_value('cmi.core.lesson_status', 'completed')
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.STORE_DATA_BEFORE_INITIALIZATION
    
    def test_set_value_after_termination(self):
        """Test that setting value after termination returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.terminate()
        
        result = adapter.set_value('cmi.core.lesson_status', 'completed')
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.STORE_DATA_AFTER_TERMINATION
    
    def test_set_value_read_only_element(self):
        """Test that setting read-only element returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        result = adapter.set_value('cmi.core.student_id', '999')
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.ELEMENT_IS_READ_ONLY
    
    def test_commit_success(self):
        """Test committing data to database"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.set_value('cmi.core.lesson_status', 'completed')
        adapter.set_value('cmi.core.lesson_location', 'page15')
        
        result = adapter.commit()
        
        assert result == "true"
        assert adapter.last_error == ScormAPIError.NO_ERROR
        
        # Verify data was saved to database
        saved_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert saved_data.lesson_status == 'completed'
        assert saved_data.lesson_location == 'page15'
    
    def test_commit_before_initialization(self):
        """Test that committing before initialization returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        result = adapter.commit()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.COMMIT_BEFORE_INITIALIZATION
    
    def test_commit_after_termination(self):
        """Test that committing after termination returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.terminate()
        
        result = adapter.commit()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.COMMIT_AFTER_TERMINATION
    
    def test_terminate_success(self):
        """Test terminating session"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.set_value('cmi.core.lesson_status', 'completed')
        
        result = adapter.terminate()
        
        assert result == "true"
        assert adapter.state == ScormAPIAdapter.STATE_TERMINATED
        assert adapter.last_error == ScormAPIError.NO_ERROR
        
        # Verify data was committed
        saved_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert saved_data.lesson_status == 'completed'
    
    def test_terminate_before_initialization(self):
        """Test that terminating before initialization returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        result = adapter.terminate()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.TERMINATION_BEFORE_INITIALIZATION
    
    def test_terminate_after_termination(self):
        """Test that terminating twice returns error"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        adapter.terminate()
        
        result = adapter.terminate()
        
        assert result == "false"
        assert adapter.last_error == ScormAPIError.TERMINATION_AFTER_TERMINATION
    
    def test_get_last_error(self):
        """Test getting last error code"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        # Initially no error
        assert adapter.get_last_error() == ScormAPIError.NO_ERROR
        
        # After error
        adapter.get_value('cmi.core.lesson_status')
        assert adapter.get_last_error() == ScormAPIError.RETRIEVE_DATA_BEFORE_INITIALIZATION
    
    def test_get_error_string(self):
        """Test getting error description"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        error_string = adapter.get_error_string(ScormAPIError.NO_ERROR)
        assert error_string == "No error"
        
        error_string = adapter.get_error_string(ScormAPIError.ALREADY_INITIALIZED)
        assert error_string == "Already initialized"
    
    def test_get_diagnostic(self):
        """Test getting diagnostic information"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        
        diagnostic = adapter.get_diagnostic(ScormAPIError.GENERAL_EXCEPTION)
        assert diagnostic == "General exception"
    
    def test_cmi_data_round_trip(self):
        """
        Test that CMI data can be set, committed, and retrieved correctly.
        
        **Validates: Property 6 - CMI data round-trip**
        """
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        # Set various CMI values
        adapter.set_value('cmi.core.lesson_status', 'completed')
        adapter.set_value('cmi.core.lesson_location', 'page20')
        adapter.set_value('cmi.core.score.raw', '92')
        adapter.set_value('cmi.suspend_data', '{"test": "data"}')
        
        # Commit changes
        adapter.commit()
        
        # Create new adapter instance (simulating new session)
        adapter2 = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter2.initialize()
        
        # Verify all values match
        assert adapter2.get_value('cmi.core.lesson_status') == 'completed'
        assert adapter2.get_value('cmi.core.lesson_location') == 'page20'
        assert adapter2.get_value('cmi.core.score.raw') == '92.00'
        assert adapter2.get_value('cmi.suspend_data') == '{"test": "data"}'
    
    def test_session_time_accumulation(self):
        """Test that session time is added to total time"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        # Set initial total time
        adapter.scorm_data.total_time = "0000:10:00.00"
        
        # Set session time
        adapter.set_value('cmi.core.session_time', '0000:05:30.00')
        
        # Commit
        adapter.commit()
        
        # Verify total time was updated
        assert adapter.scorm_data.total_time == "0000:15:30.00"
    
    def test_nested_cmi_data(self):
        """Test setting and getting nested CMI data"""
        adapter = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter.initialize()
        
        # Set nested value
        adapter.set_value('cmi.interactions.0.id', 'question1')
        adapter.set_value('cmi.interactions.0.result', 'correct')
        
        # Get nested values
        value1 = adapter.get_value('cmi.interactions.0.id')
        value2 = adapter.get_value('cmi.interactions.0.result')
        
        assert value1 == 'question1'
        assert value2 == 'correct'
    
    def test_state_restoration(self):
        """
        Test that SCORM state is properly restored on re-launch.
        
        **Validates: Property 28 - SCORM state restoration**
        """
        # First session
        adapter1 = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter1.initialize()
        adapter1.set_value('cmi.core.lesson_status', 'incomplete')
        adapter1.set_value('cmi.core.lesson_location', 'page7')
        adapter1.set_value('cmi.core.score.raw', '75')
        adapter1.set_value('cmi.suspend_data', '{"progress": 75}')
        adapter1.terminate()
        
        # Second session (re-launch)
        adapter2 = ScormAPIAdapter(
            student_id=self.student.id,
            sco_id=self.sco.id,
            version='1.2'
        )
        adapter2.initialize()
        
        # Verify all state was restored
        assert adapter2.get_value('cmi.core.lesson_status') == 'incomplete'
        assert adapter2.get_value('cmi.core.lesson_location') == 'page7'
        assert adapter2.get_value('cmi.core.score.raw') == '75.00'
        assert adapter2.get_value('cmi.suspend_data') == '{"progress": 75}'
        assert adapter2.scorm_data.entry == 'resume'
