"""
Tests for SCORM upload API endpoint.

Tests the POST /api/scorm/upload/ endpoint for uploading SCORM packages.
"""

import os
import io
import zipfile
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from courses.models import Course, Lesson
from scorm.models.scorm_models import ScormPackage, ScormSCO


User = get_user_model()


class ScormUploadAPITest(TestCase):
    """Test SCORM package upload API endpoint"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test users
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
        
        # Create test course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course description',
            instructor=self.instructor
        )
    
    def _create_test_scorm_package(self, version='1.2'):
        """
        Create a minimal valid SCORM package for testing.
        
        Args:
            version: SCORM version ('1.2' or '2004')
        
        Returns:
            SimpleUploadedFile containing the SCORM package
        """
        # Create manifest XML based on version
        if version == '1.2':
            manifest_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test_scorm_12" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
    </metadata>
    <organizations default="test_org">
        <organization identifier="test_org">
            <title>Test SCORM 1.2 Package</title>
            <item identifier="item_1" identifierref="resource_1">
                <title>Test Lesson</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
            <file href="index.html"/>
        </resource>
    </resources>
</manifest>'''
        else:  # 2004
            manifest_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test_scorm_2004" version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                              http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                              http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                              http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>2004 4th Edition</schemaversion>
    </metadata>
    <organizations default="test_org">
        <organization identifier="test_org">
            <title>Test SCORM 2004 Package</title>
            <item identifier="item_1" identifierref="resource_1">
                <title>Test Lesson</title>
            </item>
        </organization>
    </organizations>
    <resources>
        <resource identifier="resource_1" type="webcontent" adlcp:scormType="sco" href="index.html">
            <file href="index.html"/>
        </resource>
    </resources>
</manifest>'''
        
        # Create simple HTML file
        index_html = '''<!DOCTYPE html>
<html>
<head>
    <title>Test SCORM Content</title>
</head>
<body>
    <h1>Test SCORM Content</h1>
    <p>This is a test SCORM package.</p>
</body>
</html>'''
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr('imsmanifest.xml', manifest_xml)
            zip_file.writestr('index.html', index_html)
        
        zip_buffer.seek(0)
        
        return SimpleUploadedFile(
            f'test_scorm_{version}.zip',
            zip_buffer.read(),
            content_type='application/zip'
        )
    
    def test_upload_scorm_12_package_success(self):
        """Test successful upload of SCORM 1.2 package"""
        self.client.force_authenticate(user=self.instructor)
        
        scorm_file = self._create_test_scorm_package(version='1.2')
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
                'completion_criteria': 'status',
                'allow_retry': True,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('lesson_id', response.data)
        self.assertIn('package_id', response.data)
        self.assertEqual(response.data['scorm_version'], '1.2')
        
        # Verify database records
        self.assertEqual(Lesson.objects.filter(course=self.course).count(), 1)
        self.assertEqual(ScormPackage.objects.count(), 1)
        self.assertEqual(ScormSCO.objects.count(), 1)
        
        # Verify lesson details
        lesson = Lesson.objects.get(id=response.data['lesson_id'])
        self.assertEqual(lesson.content_type, Lesson.CONTENT_TYPE_SCORM)
        self.assertEqual(lesson.course, self.course)
        
        # Verify package details
        package = ScormPackage.objects.get(id=response.data['package_id'])
        self.assertEqual(package.version, '1.2')
        self.assertEqual(package.course, self.course)
        self.assertEqual(package.lesson, lesson)
        self.assertEqual(package.uploaded_by, self.instructor)
    
    def test_upload_scorm_2004_package_success(self):
        """Test successful upload of SCORM 2004 package"""
        self.client.force_authenticate(user=self.instructor)
        
        scorm_file = self._create_test_scorm_package(version='2004')
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['scorm_version'], '2004')
    
    def test_upload_without_authentication(self):
        """Test upload fails without authentication"""
        scorm_file = self._create_test_scorm_package()
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_upload_by_non_instructor(self):
        """Test upload fails when user is not the course instructor"""
        self.client.force_authenticate(user=self.student)
        
        scorm_file = self._create_test_scorm_package()
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['success'])
    
    def test_upload_invalid_course_id(self):
        """Test upload fails with invalid course ID"""
        self.client.force_authenticate(user=self.instructor)
        
        scorm_file = self._create_test_scorm_package()
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': 99999,  # Non-existent course
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_upload_non_zip_file(self):
        """Test upload fails with non-ZIP file"""
        self.client.force_authenticate(user=self.instructor)
        
        # Create a text file instead of ZIP
        text_file = SimpleUploadedFile(
            'test.txt',
            b'This is not a ZIP file',
            content_type='text/plain'
        )
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': text_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_upload_missing_manifest(self):
        """Test upload fails when manifest is missing"""
        self.client.force_authenticate(user=self.instructor)
        
        # Create ZIP without manifest
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr('index.html', '<html><body>Test</body></html>')
        
        zip_buffer.seek(0)
        scorm_file = SimpleUploadedFile(
            'test_no_manifest.zip',
            zip_buffer.read(),
            content_type='application/zip'
        )
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('imsmanifest.xml not found', str(response.data['errors']))
    
    def test_upload_with_passing_score(self):
        """Test upload with score-based completion criteria"""
        self.client.force_authenticate(user=self.instructor)
        
        scorm_file = self._create_test_scorm_package()
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
                'completion_criteria': 'score',
                'passing_score': 80,
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify package settings
        package = ScormPackage.objects.get(id=response.data['package_id'])
        self.assertEqual(package.completion_criteria, 'score')
        self.assertEqual(package.passing_score, 80)
    
    def test_upload_score_criteria_without_passing_score(self):
        """Test upload fails when score criteria is set but passing_score is missing"""
        self.client.force_authenticate(user=self.instructor)
        
        scorm_file = self._create_test_scorm_package()
        
        response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
                'completion_criteria': 'score',
                # Missing passing_score
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_list_packages(self):
        """Test listing SCORM packages"""
        self.client.force_authenticate(user=self.instructor)
        
        # Upload a package first
        scorm_file = self._create_test_scorm_package()
        self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        # List packages
        response = self.client.get('/api/scorm/packages/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['course'], self.course.id)
    
    def test_get_package_detail(self):
        """Test retrieving package details"""
        self.client.force_authenticate(user=self.instructor)
        
        # Upload a package first
        scorm_file = self._create_test_scorm_package()
        upload_response = self.client.post(
            '/api/scorm/upload/',
            {
                'course_id': self.course.id,
                'scorm_package': scorm_file,
            },
            format='multipart'
        )
        
        package_id = upload_response.data['package_id']
        
        # Get package details
        response = self.client.get(f'/api/scorm/packages/{package_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], package_id)
        self.assertEqual(response.data['course'], self.course.id)
