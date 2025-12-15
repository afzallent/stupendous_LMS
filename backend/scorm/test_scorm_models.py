"""
Tests for SCORM data models.

Verifies that ScormPackage, ScormSCO, and ScormData models
can be created, retrieved, and updated correctly.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson
from scorm.models import ScormPackage, ScormSCO, ScormData

User = get_user_model()


class ScormPackageModelTest(TestCase):
    """Test ScormPackage model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.user
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson',
            content_type='scorm',
            order=1
        )
    
    def test_create_scorm_package(self):
        """Test creating a SCORM package"""
        package = ScormPackage.objects.create(
            course=self.course,
            lesson=self.lesson,
            version='1.2',
            identifier='test-package-001',
            title='Test SCORM Package',
            description='A test package',
            manifest_data={'test': 'data'},
            content_path='/media/scorm/test-package/',
            launch_url='index.html',
            uploaded_by=self.user,
            completion_criteria='status',
            allow_retry=True
        )
        
        self.assertEqual(package.title, 'Test SCORM Package')
        self.assertEqual(package.version, '1.2')
        self.assertEqual(package.course, self.course)
        self.assertEqual(package.lesson, self.lesson)
        self.assertTrue(package.allow_retry)
        self.assertEqual(str(package), 'Test SCORM Package (1.2)')
    
    def test_scorm_package_unique_identifier(self):
        """Test that package identifiers must be unique"""
        ScormPackage.objects.create(
            course=self.course,
            version='1.2',
            identifier='unique-id-001',
            title='Package 1',
            manifest_data={},
            content_path='/path1/',
            launch_url='index.html',
            uploaded_by=self.user
        )
        
        # Creating another package with the same identifier should fail
        with self.assertRaises(Exception):
            ScormPackage.objects.create(
                course=self.course,
                version='2004',
                identifier='unique-id-001',  # Same identifier
                title='Package 2',
                manifest_data={},
                content_path='/path2/',
                launch_url='index.html',
                uploaded_by=self.user
            )


class ScormSCOModelTest(TestCase):
    """Test ScormSCO model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.user
        )
        self.package = ScormPackage.objects.create(
            course=self.course,
            version='1.2',
            identifier='test-package-001',
            title='Test Package',
            manifest_data={},
            content_path='/media/scorm/test/',
            launch_url='index.html',
            uploaded_by=self.user
        )
    
    def test_create_sco(self):
        """Test creating a SCO"""
        sco = ScormSCO.objects.create(
            package=self.package,
            identifier='sco-001',
            title='Introduction',
            launch_url='intro.html',
            order=1
        )
        
        self.assertEqual(sco.title, 'Introduction')
        self.assertEqual(sco.package, self.package)
        self.assertEqual(sco.order, 1)
        self.assertEqual(str(sco), 'Test Package - Introduction')
    
    def test_sco_ordering(self):
        """Test that SCOs are ordered correctly"""
        sco1 = ScormSCO.objects.create(
            package=self.package,
            identifier='sco-001',
            title='Lesson 1',
            launch_url='lesson1.html',
            order=2
        )
        sco2 = ScormSCO.objects.create(
            package=self.package,
            identifier='sco-002',
            title='Lesson 2',
            launch_url='lesson2.html',
            order=1
        )
        
        scos = list(ScormSCO.objects.all())
        self.assertEqual(scos[0], sco2)  # Order 1 comes first
        self.assertEqual(scos[1], sco1)  # Order 2 comes second


class ScormDataModelTest(TestCase):
    """Test ScormData model"""
    
    def setUp(self):
        """Set up test data"""
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
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor
        )
        self.package = ScormPackage.objects.create(
            course=self.course,
            version='1.2',
            identifier='test-package-001',
            title='Test Package',
            manifest_data={},
            content_path='/media/scorm/test/',
            launch_url='index.html',
            uploaded_by=self.instructor
        )
        self.sco = ScormSCO.objects.create(
            package=self.package,
            identifier='sco-001',
            title='Test SCO',
            launch_url='test.html',
            order=1
        )
    
    def test_create_scorm_data(self):
        """Test creating SCORM data"""
        data = ScormData.objects.create(
            student=self.student,
            sco=self.sco,
            lesson_status='incomplete',
            lesson_location='page-5',
            score_raw=75.5,
            score_min=0,
            score_max=100,
            cmi_data={'custom': 'data'}
        )
        
        self.assertEqual(data.student, self.student)
        self.assertEqual(data.sco, self.sco)
        self.assertEqual(data.lesson_status, 'incomplete')
        self.assertEqual(data.score_raw, 75.5)
        self.assertEqual(str(data), 'student - Test SCO (incomplete)')
    
    def test_scorm_data_unique_student_sco(self):
        """Test that student-SCO combination must be unique"""
        ScormData.objects.create(
            student=self.student,
            sco=self.sco,
            lesson_status='incomplete'
        )
        
        # Creating another record for same student-SCO should fail
        with self.assertRaises(Exception):
            ScormData.objects.create(
                student=self.student,
                sco=self.sco,
                lesson_status='completed'
            )
    
    def test_scorm_data_default_values(self):
        """Test default values for SCORM data"""
        data = ScormData.objects.create(
            student=self.student,
            sco=self.sco
        )
        
        self.assertEqual(data.lesson_status, 'not attempted')
        self.assertEqual(data.credit, 'credit')
        self.assertEqual(data.mode, 'normal')
        self.assertEqual(data.cmi_data, {})
    
    def test_scorm_data_update(self):
        """Test updating SCORM data"""
        data = ScormData.objects.create(
            student=self.student,
            sco=self.sco,
            lesson_status='incomplete',
            score_raw=50
        )
        
        # Update the data
        data.lesson_status = 'completed'
        data.score_raw = 85
        data.save()
        
        # Retrieve and verify
        updated_data = ScormData.objects.get(student=self.student, sco=self.sco)
        self.assertEqual(updated_data.lesson_status, 'completed')
        self.assertEqual(updated_data.score_raw, 85)
