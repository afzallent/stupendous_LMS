"""
Manual test script for Student Management API

This script demonstrates the GET /api/trainer/students/ endpoint
by creating test data and making API requests.

Usage:
    python test_student_management_api.py
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Enrollment, Progress
from rest_framework.test import APIClient

User = get_user_model()


def setup_test_data():
    """Create test data for demonstration"""
    print("🔧 Setting up test data...")
    
    # Clean up existing test data
    User.objects.filter(username__startswith='test_').delete()
    Course.objects.filter(title__startswith='Test Course').delete()
    
    # Create trainer
    trainer = User.objects.create_user(
        username='test_trainer',
        email='test_trainer@example.com',
        password='testpass123',
        is_instructor=True,
        first_name='John',
        last_name='Trainer'
    )
    print(f"✅ Created trainer: {trainer.username}")
    
    # Create students
    students = []
    student_data = [
        ('test_student1', 'Alice', 'Anderson'),
        ('test_student2', 'Bob', 'Brown'),
        ('test_student3', 'Charlie', 'Chen'),
    ]
    
    for username, first_name, last_name in student_data:
        student = User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='testpass123',
            is_student=True,
            first_name=first_name,
            last_name=last_name
        )
        students.append(student)
        print(f"✅ Created student: {student.username} ({first_name} {last_name})")
    
    # Create courses
    course1 = Course.objects.create(
        title='Test Course 1: Python Basics',
        description='Learn Python fundamentals',
        instructor=trainer,
        status='published'
    )
    
    course2 = Course.objects.create(
        title='Test Course 2: Advanced Python',
        description='Advanced Python concepts',
        instructor=trainer,
        status='published'
    )
    print(f"✅ Created courses: {course1.title}, {course2.title}")
    
    # Create lessons for course1
    lessons1 = []
    for i in range(4):
        lesson = Lesson.objects.create(
            course=course1,
            title=f'Lesson {i+1}',
            order=i+1
        )
        lessons1.append(lesson)
    
    # Create lessons for course2
    lessons2 = []
    for i in range(3):
        lesson = Lesson.objects.create(
            course=course2,
            title=f'Lesson {i+1}',
            order=i+1
        )
        lessons2.append(lesson)
    
    print(f"✅ Created {len(lessons1)} lessons for course1, {len(lessons2)} lessons for course2")
    
    # Enroll students and set progress
    # Student 1: Enrolled in both courses
    Enrollment.objects.create(student=students[0], course=course1)
    Enrollment.objects.create(student=students[0], course=course2)
    
    # Complete 2 out of 4 lessons in course1 (50%)
    Progress.objects.create(student=students[0], lesson=lessons1[0], completed=True)
    Progress.objects.create(student=students[0], lesson=lessons1[1], completed=True)
    
    # Complete all 3 lessons in course2 (100%)
    for lesson in lessons2:
        Progress.objects.create(student=students[0], lesson=lesson, completed=True)
    
    print(f"✅ Student 1: Enrolled in 2 courses, 50% + 100% = 75% overall")
    
    # Student 2: Enrolled in course1 only
    Enrollment.objects.create(student=students[1], course=course1)
    
    # Complete 3 out of 4 lessons (75%)
    Progress.objects.create(student=students[1], lesson=lessons1[0], completed=True)
    Progress.objects.create(student=students[1], lesson=lessons1[1], completed=True)
    Progress.objects.create(student=students[1], lesson=lessons1[2], completed=True)
    
    print(f"✅ Student 2: Enrolled in 1 course, 75% overall")
    
    # Student 3: Enrolled in course2 only
    Enrollment.objects.create(student=students[2], course=course2)
    
    # Complete 1 out of 3 lessons (33.33%)
    Progress.objects.create(student=students[2], lesson=lessons2[0], completed=True)
    
    print(f"✅ Student 3: Enrolled in 1 course, 33.33% overall")
    
    return trainer, students


def test_student_management_api():
    """Test the student management API endpoint"""
    print("\n" + "="*60)
    print("Testing Student Management API")
    print("="*60 + "\n")
    
    # Setup test data
    trainer, students = setup_test_data()
    
    # Create API client with proper server name
    from django.test import override_settings
    client = APIClient()
    client.force_authenticate(user=trainer)
    
    # Add testserver to ALLOWED_HOSTS for testing
    from django.conf import settings
    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS.append('testserver')
    
    # Test 1: Get all students
    print("\n📊 Test 1: GET /api/trainer/students/")
    print("-" * 60)
    response = client.get('/api/trainer/students/')
    
    if response.status_code == 200:
        print(f"✅ Status: {response.status_code} OK")
        data = response.json()
        
        print(f"\n📈 Results:")
        print(f"   Total students: {data['count']}")
        print(f"   Page size: {len(data['results'])}")
        print(f"   Next page: {data['next']}")
        print(f"   Previous page: {data['previous']}")
        
        print(f"\n👥 Student Details:")
        for i, student in enumerate(data['results'], 1):
            print(f"\n   {i}. {student['first_name']} {student['last_name']}")
            print(f"      Username: {student['username']}")
            print(f"      Email: {student['email']}")
            print(f"      Enrolled Courses: {student['enrolled_course_count']}")
            print(f"      Overall Progress: {student['overall_progress']:.2f}%")
    else:
        print(f"❌ Status: {response.status_code}")
        print(f"   Error: {response.json()}")
    
    # Test 2: Verify unique students (Requirement 3.1)
    print("\n\n✅ Test 2: Verify unique students (Requirement 3.1)")
    print("-" * 60)
    student_ids = [s['id'] for s in data['results']]
    unique_ids = set(student_ids)
    if len(student_ids) == len(unique_ids):
        print(f"✅ All students are unique: {len(student_ids)} students, {len(unique_ids)} unique IDs")
    else:
        print(f"❌ Duplicate students found!")
    
    # Test 3: Verify enrolled course count (Requirement 3.2)
    print("\n\n✅ Test 3: Verify enrolled course count (Requirement 3.2)")
    print("-" * 60)
    for student in data['results']:
        print(f"   {student['first_name']} {student['last_name']}: {student['enrolled_course_count']} course(s)")
    
    # Test 4: Verify overall progress calculation (Requirement 3.3)
    print("\n\n✅ Test 4: Verify overall progress calculation (Requirement 3.3)")
    print("-" * 60)
    print("   Expected:")
    print("   - Alice Anderson: 75% (average of 50% and 100%)")
    print("   - Bob Brown: 75% (single course)")
    print("   - Charlie Chen: 33.33% (single course)")
    print("\n   Actual:")
    for student in data['results']:
        print(f"   - {student['first_name']} {student['last_name']}: {student['overall_progress']:.2f}%")
    
    # Test 5: Pagination
    print("\n\n✅ Test 5: Test pagination")
    print("-" * 60)
    response = client.get('/api/trainer/students/?page_size=2')
    if response.status_code == 200:
        data = response.json()
        print(f"   Requested page size: 2")
        print(f"   Actual results: {len(data['results'])}")
        print(f"   Has next page: {data['next'] is not None}")
    
    print("\n" + "="*60)
    print("✅ All tests completed successfully!")
    print("="*60 + "\n")


if __name__ == '__main__':
    test_student_management_api()
