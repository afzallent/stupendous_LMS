"""
Unit tests for SCORM Runtime API Endpoints.

Tests the REST API endpoints that expose SCORM runtime functionality
to frontend SCORM players.

**Validates: Requirements 2.1, 2.2, 2.5**
"""

import pytest
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from courses.models import Course, Lesson
from scorm.models import ScormPackage, ScormSCO, ScormData


User = get_user_model()


@pytest.mark.django_db
class TestScormRuntimeAPIEndpoints(TestCase):
    """Test suite for SCORM Runtime API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
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
        
        # Authenticate as student
        self.client.force_authenticate(user=self.student)
    
    def tearDown(self):
        """Clean up after each test"""
        # Clear the session cache to prevent state leakage between tests
        from scorm.views.runtime_views import _active_sessions
        _active_sessions.clear()
    
    def test_initialize_endpoint_success(self):
        """
        Test POST /api/scorm/runtime/initialize/ succeeds.
        
        **Validates: Requirements 2.1**
        """
        url = '/api/scorm/runtime/initialize/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'parameter': ''
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['result'] == 'true'
        assert response.data['error_code'] == '0'
        assert response.data['error_message'] == 'No error'
        
        # Verify ScormData was created
        scorm_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert scorm_data.lesson_status == 'not attempted'
        assert scorm_data.entry == 'ab-initio'
    
    def test_initialize_endpoint_requires_authentication(self):
        """Test that initialize endpoint requires authentication"""
        self.client.force_authenticate(user=None)
        
        url = '/api/scorm/runtime/initialize/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_initialize_endpoint_missing_fields(self):
        """Test that initialize endpoint validates required fields"""
        url = '/api/scorm/runtime/initialize/'
        data = {
            'student_id': self.student.id
            # Missing sco_id
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'sco_id' in response.data
    
    def test_get_value_endpoint_success(self):
        """
        Test POST /api/scorm/runtime/get-value/ succeeds.
        
        **Validates: Requirements 2.2**
        """
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Get value
        url = '/api/scorm/runtime/get-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['value'] == 'not attempted'
        assert response.data['error_code'] == '0'
    
    def test_get_value_endpoint_student_name(self):
        """Test getting student name via endpoint"""
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Get student name
        url = '/api/scorm/runtime/get-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.student_name'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['value'] == 'Test Student'
    
    def test_get_value_endpoint_before_initialization(self):
        """Test that get value before initialization returns error"""
        url = '/api/scorm/runtime/get-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False
        assert response.data['value'] == ''
        assert response.data['error_code'] == '122'  # RETRIEVE_DATA_BEFORE_INITIALIZATION
    
    def test_set_value_endpoint_success(self):
        """
        Test POST /api/scorm/runtime/set-value/ succeeds.
        
        **Validates: Requirements 2.2**
        """
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Set value
        url = '/api/scorm/runtime/set-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status',
            'value': 'completed'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['result'] == 'true'
        assert response.data['error_code'] == '0'
    
    def test_set_value_endpoint_lesson_location(self):
        """Test setting lesson location (bookmark) via endpoint"""
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Set lesson location
        url = '/api/scorm/runtime/set-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_location',
            'value': 'page15'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
    
    def test_set_value_endpoint_read_only_element(self):
        """Test that setting read-only element returns error"""
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Try to set read-only element
        url = '/api/scorm/runtime/set-value/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.student_id',
            'value': '999'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False
        assert response.data['error_code'] == '403'  # ELEMENT_IS_READ_ONLY
    
    def test_commit_endpoint_success(self):
        """
        Test POST /api/scorm/runtime/commit/ succeeds.
        
        **Validates: Requirements 2.5**
        """
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Set some values
        set_url = '/api/scorm/runtime/set-value/'
        self.client.post(set_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status',
            'value': 'completed'
        }, format='json')
        
        # Commit
        url = '/api/scorm/runtime/commit/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'parameter': ''
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['result'] == 'true'
        assert response.data['error_code'] == '0'
        
        # Verify data was saved to database
        scorm_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert scorm_data.lesson_status == 'completed'
    
    def test_commit_endpoint_before_initialization(self):
        """Test that commit before initialization returns error"""
        url = '/api/scorm/runtime/commit/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False
        assert response.data['error_code'] == '142'  # COMMIT_BEFORE_INITIALIZATION
    
    def test_terminate_endpoint_success(self):
        """
        Test POST /api/scorm/runtime/terminate/ succeeds.
        
        **Validates: Requirements 2.5**
        """
        # Initialize first
        init_url = '/api/scorm/runtime/initialize/'
        self.client.post(init_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Set some values
        set_url = '/api/scorm/runtime/set-value/'
        self.client.post(set_url, {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status',
            'value': 'completed'
        }, format='json')
        
        # Terminate
        url = '/api/scorm/runtime/terminate/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'parameter': ''
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['result'] == 'true'
        assert response.data['error_code'] == '0'
        
        # Verify data was committed to database
        scorm_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert scorm_data.lesson_status == 'completed'
    
    def test_terminate_endpoint_before_initialization(self):
        """Test that terminate before initialization returns error"""
        url = '/api/scorm/runtime/terminate/'
        data = {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False
        assert response.data['error_code'] == '112'  # TERMINATION_BEFORE_INITIALIZATION
    
    def test_full_scorm_session_workflow(self):
        """
        Test complete SCORM session workflow through API endpoints.
        
        This test validates the entire flow:
        1. Initialize session
        2. Get initial values
        3. Set values
        4. Commit changes
        5. Terminate session
        
        **Validates: Requirements 2.1, 2.2, 2.5**
        """
        # 1. Initialize
        init_response = self.client.post('/api/scorm/runtime/initialize/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        assert init_response.data['success'] is True
        
        # 2. Get initial lesson status
        get_response = self.client.post('/api/scorm/runtime/get-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status'
        }, format='json')
        assert get_response.data['value'] == 'not attempted'
        
        # 3. Set lesson status to incomplete
        set_response1 = self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status',
            'value': 'incomplete'
        }, format='json')
        assert set_response1.data['success'] is True
        
        # 4. Set lesson location
        set_response2 = self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_location',
            'value': 'page10'
        }, format='json')
        assert set_response2.data['success'] is True
        
        # 5. Set score
        set_response3 = self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.score.raw',
            'value': '85'
        }, format='json')
        assert set_response3.data['success'] is True
        
        # 6. Commit changes
        commit_response = self.client.post('/api/scorm/runtime/commit/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        assert commit_response.data['success'] is True
        
        # 7. Update to completed
        set_response4 = self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_status',
            'value': 'completed'
        }, format='json')
        assert set_response4.data['success'] is True
        
        # 8. Terminate session (should commit automatically)
        terminate_response = self.client.post('/api/scorm/runtime/terminate/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        assert terminate_response.data['success'] is True
        
        # 9. Verify all data was saved
        scorm_data = ScormData.objects.get(student=self.student, sco=self.sco)
        assert scorm_data.lesson_status == 'completed'
        assert scorm_data.lesson_location == 'page10'
        assert str(scorm_data.score_raw) == '85.00'
    
    def test_multiple_students_separate_sessions(self):
        """Test that multiple students can have separate SCORM sessions"""
        # Create second student
        student2 = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123'
        )
        student2.is_student = True
        student2.save()
        
        # Initialize session for first student
        self.client.post('/api/scorm/runtime/initialize/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_location',
            'value': 'page5'
        }, format='json')
        
        self.client.post('/api/scorm/runtime/commit/', {
            'student_id': self.student.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Initialize session for second student
        self.client.post('/api/scorm/runtime/initialize/', {
            'student_id': student2.id,
            'sco_id': self.sco.id
        }, format='json')
        
        self.client.post('/api/scorm/runtime/set-value/', {
            'student_id': student2.id,
            'sco_id': self.sco.id,
            'element': 'cmi.core.lesson_location',
            'value': 'page15'
        }, format='json')
        
        self.client.post('/api/scorm/runtime/commit/', {
            'student_id': student2.id,
            'sco_id': self.sco.id
        }, format='json')
        
        # Verify separate data
        data1 = ScormData.objects.get(student=self.student, sco=self.sco)
        data2 = ScormData.objects.get(student=student2, sco=self.sco)
        
        assert data1.lesson_location == 'page5'
        assert data2.lesson_location == 'page15'
