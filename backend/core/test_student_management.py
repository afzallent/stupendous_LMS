"""
Tests for Student Management API

Tests the GET /api/trainer/students/ endpoint that returns
all unique students enrolled in trainer's courses with their
enrollment count and overall progress.

Requirements: 3.1, 3.2, 3.3
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from courses.models import Course, Lesson, Enrollment, Progress

User = get_user_model()


@pytest.mark.django_db
class TestStudentManagementView:
    """Test suite for StudentManagementView"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create trainer
        self.trainer = User.objects.create_user(
            username='trainer1',
            email='trainer1@example.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create students
        self.student1 = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            password='testpass123',
            is_student=True,
            first_name='Alice',
            last_name='Anderson'
        )
        
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@example.com',
            password='testpass123',
            is_student=True,
            first_name='Bob',
            last_name='Brown'
        )
        
        self.student3 = User.objects.create_user(
            username='student3',
            email='student3@example.com',
            password='testpass123',
            is_student=True,
            first_name='Charlie',
            last_name='Chen'
        )
        
        # Create courses
        self.course1 = Course.objects.create(
            title='Course 1',
            description='Test course 1',
            instructor=self.trainer,
            status='published'
        )
        
        self.course2 = Course.objects.create(
            title='Course 2',
            description='Test course 2',
            instructor=self.trainer,
            status='published'
        )
        
        # Create lessons for course1
        self.lesson1_1 = Lesson.objects.create(
            course=self.course1,
            title='Lesson 1.1',
            order=1
        )
        self.lesson1_2 = Lesson.objects.create(
            course=self.course1,
            title='Lesson 1.2',
            order=2
        )
        
        # Create lessons for course2
        self.lesson2_1 = Lesson.objects.create(
            course=self.course2,
            title='Lesson 2.1',
            order=1
        )
        self.lesson2_2 = Lesson.objects.create(
            course=self.course2,
            title='Lesson 2.2',
            order=2
        )
        self.lesson2_3 = Lesson.objects.create(
            course=self.course2,
            title='Lesson 2.3',
            order=3
        )
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access the endpoint"""
        url = reverse('trainer-students')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_student_access_denied(self):
        """Test that students cannot access the endpoint"""
        self.client.force_authenticate(user=self.student1)
        url = reverse('trainer-students')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_trainer_with_no_courses(self):
        """Test trainer with no courses returns empty list"""
        # Create a trainer with no courses
        trainer2 = User.objects.create_user(
            username='trainer2',
            email='trainer2@example.com',
            password='testpass123',
            is_instructor=True
        )
        
        self.client.force_authenticate(user=trainer2)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['results'] == []
    
    def test_trainer_with_no_enrollments(self):
        """Test trainer with courses but no enrollments"""
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['results'] == []
    
    def test_single_student_single_course(self):
        """Test single student enrolled in one course"""
        # Enroll student1 in course1
        Enrollment.objects.create(student=self.student1, course=self.course1)
        
        # Complete one lesson (50% progress)
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson1_1,
            completed=True
        )
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        
        student_data = response.data['results'][0]
        assert student_data['id'] == self.student1.id
        assert student_data['username'] == 'student1'
        assert student_data['email'] == 'student1@example.com'
        assert student_data['first_name'] == 'Alice'
        assert student_data['last_name'] == 'Anderson'
        assert student_data['enrolled_course_count'] == 1
        assert student_data['overall_progress'] == 50.0
    
    def test_multiple_students_unique_list(self):
        """Test that student list contains unique students only (Requirement 3.1)"""
        # Enroll students in courses
        Enrollment.objects.create(student=self.student1, course=self.course1)
        Enrollment.objects.create(student=self.student1, course=self.course2)
        Enrollment.objects.create(student=self.student2, course=self.course1)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2  # Only 2 unique students
        
        # Verify student1 appears only once
        student_ids = [s['id'] for s in response.data['results']]
        assert student_ids.count(self.student1.id) == 1
        assert student_ids.count(self.student2.id) == 1
    
    def test_enrolled_course_count(self):
        """Test enrolled course count is correct (Requirement 3.2)"""
        # Enroll student1 in both courses
        Enrollment.objects.create(student=self.student1, course=self.course1)
        Enrollment.objects.create(student=self.student1, course=self.course2)
        
        # Enroll student2 in one course
        Enrollment.objects.create(student=self.student2, course=self.course1)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Find student1 in results
        student1_data = next(s for s in response.data['results'] if s['id'] == self.student1.id)
        assert student1_data['enrolled_course_count'] == 2
        
        # Find student2 in results
        student2_data = next(s for s in response.data['results'] if s['id'] == self.student2.id)
        assert student2_data['enrolled_course_count'] == 1
    
    def test_overall_progress_calculation(self):
        """Test overall progress is average across all enrollments (Requirement 3.3)"""
        # Enroll student1 in both courses
        Enrollment.objects.create(student=self.student1, course=self.course1)
        Enrollment.objects.create(student=self.student1, course=self.course2)
        
        # Course1: Complete 1 out of 2 lessons (50%)
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson1_1,
            completed=True
        )
        
        # Course2: Complete 2 out of 3 lessons (66.67%)
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson2_1,
            completed=True
        )
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson2_2,
            completed=True
        )
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        student_data = response.data['results'][0]
        # Overall progress should be average: (50 + 66.67) / 2 = 58.33
        expected_progress = (50.0 + 66.67) / 2
        assert abs(student_data['overall_progress'] - expected_progress) < 0.1
    
    def test_zero_progress_for_no_completed_lessons(self):
        """Test that students with no completed lessons have 0% progress"""
        # Enroll student1 but don't complete any lessons
        Enrollment.objects.create(student=self.student1, course=self.course1)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        student_data = response.data['results'][0]
        assert student_data['overall_progress'] == 0.0
    
    def test_pagination_default_page_size(self):
        """Test pagination returns 20 students per page"""
        # Create 25 students and enroll them
        students = []
        for i in range(25):
            student = User.objects.create_user(
                username=f'student{i+10}',
                email=f'student{i+10}@example.com',
                password='testpass123',
                is_student=True,
                first_name=f'Student{i+10}',
                last_name=f'Last{i+10}'
            )
            students.append(student)
            Enrollment.objects.create(student=student, course=self.course1)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 25
        assert len(response.data['results']) == 20  # First page has 20 students
        assert response.data['next'] is not None  # There's a next page
    
    def test_pagination_second_page(self):
        """Test pagination second page"""
        # Create 25 students and enroll them
        students = []
        for i in range(25):
            student = User.objects.create_user(
                username=f'student{i+10}',
                email=f'student{i+10}@example.com',
                password='testpass123',
                is_student=True,
                first_name=f'Student{i+10}',
                last_name=f'Last{i+10}'
            )
            students.append(student)
            Enrollment.objects.create(student=student, course=self.course1)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url, {'page': 2})
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 25
        assert len(response.data['results']) == 5  # Second page has remaining 5 students
        assert response.data['next'] is None  # No more pages
    
    def test_students_sorted_by_name(self):
        """Test that students are sorted by last name, then first name"""
        # Enroll students in different order
        Enrollment.objects.create(student=self.student3, course=self.course1)  # Charlie Chen
        Enrollment.objects.create(student=self.student1, course=self.course1)  # Alice Anderson
        Enrollment.objects.create(student=self.student2, course=self.course1)  # Bob Brown
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Should be sorted: Anderson, Brown, Chen
        results = response.data['results']
        assert results[0]['last_name'] == 'Anderson'
        assert results[1]['last_name'] == 'Brown'
        assert results[2]['last_name'] == 'Chen'
    
    def test_course_with_no_lessons(self):
        """Test handling of courses with no lessons"""
        # Create a course with no lessons
        course3 = Course.objects.create(
            title='Course 3',
            description='Empty course',
            instructor=self.trainer,
            status='published'
        )
        
        # Enroll student
        Enrollment.objects.create(student=self.student1, course=course3)
        
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        student_data = response.data['results'][0]
        assert student_data['overall_progress'] == 0.0
    
    def test_only_trainer_own_students(self):
        """Test that trainer only sees students from their own courses"""
        # Create another trainer with their own course
        trainer2 = User.objects.create_user(
            username='trainer2',
            email='trainer2@example.com',
            password='testpass123',
            is_instructor=True
        )
        
        course3 = Course.objects.create(
            title='Course 3',
            description='Another trainer course',
            instructor=trainer2,
            status='published'
        )
        
        # Enroll student1 in trainer1's course
        Enrollment.objects.create(student=self.student1, course=self.course1)
        
        # Enroll student2 in trainer2's course
        Enrollment.objects.create(student=self.student2, course=course3)
        
        # Trainer1 should only see student1
        self.client.force_authenticate(user=self.trainer)
        url = reverse('trainer-students')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == self.student1.id


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
