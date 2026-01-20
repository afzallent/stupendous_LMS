"""
Tests for analytics API views and utility functions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from courses.models import Course, Lesson, Chapter, Enrollment, Progress
from activity.models import ActivityLog
from analytics.utils import (
    calculate_trainer_analytics,
    calculate_course_statistics,
    calculate_enrollment_trends,
    calculate_completion_rates,
)

User = get_user_model()


class AnalyticsUtilsTestCase(TestCase):
    """Test cases for analytics utility functions"""

    def setUp(self):
        """Set up test data"""
        # Create trainer
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            is_instructor=True
        )

        # Create students
        self.student1 = User.objects.create_user(
            username='student1',
            email='student1@example.com',
            is_student=True
        )
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@example.com',
            is_student=True
        )
        self.student3 = User.objects.create_user(
            username='student3',
            email='student3@example.com',
            is_student=True
        )

        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.trainer,
            status='published'
        )

        # Create chapter
        self.chapter = Chapter.objects.create(
            course=self.course,
            title='Test Chapter',
            order=1
        )

        # Create lessons
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            chapter=self.chapter,
            title='Lesson 1',
            order=1
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            chapter=self.chapter,
            title='Lesson 2',
            order=2
        )
        self.lesson3 = Lesson.objects.create(
            course=self.course,
            chapter=self.chapter,
            title='Lesson 3',
            order=3
        )

        # Enroll students
        self.enrollment1 = Enrollment.objects.create(
            student=self.student1,
            course=self.course
        )
        self.enrollment2 = Enrollment.objects.create(
            student=self.student2,
            course=self.course
        )
        self.enrollment3 = Enrollment.objects.create(
            student=self.student3,
            course=self.course
        )

    def test_calculate_trainer_analytics(self):
        """Test trainer analytics calculation"""
        analytics = calculate_trainer_analytics(self.trainer)

        self.assertEqual(analytics['total_courses'], 1)
        self.assertEqual(analytics['total_enrollments'], 3)
        self.assertEqual(analytics['total_students'], 3)
        self.assertEqual(analytics['total_lessons'], 3)
        self.assertEqual(len(analytics['courses']), 1)

        # Check course-specific data
        course_data = analytics['courses'][0]
        self.assertEqual(course_data['id'], self.course.id)
        self.assertEqual(course_data['enrollment_count'], 3)
        self.assertEqual(course_data['lesson_count'], 3)

    def test_calculate_course_statistics_no_progress(self):
        """Test course statistics with no student progress"""
        stats = calculate_course_statistics(self.course.id, self.trainer)

        self.assertEqual(stats['course_id'], self.course.id)
        self.assertEqual(stats['enrollments'], 3)
        self.assertEqual(stats['total_lessons'], 3)
        self.assertEqual(stats['completion_rate'], 0)
        self.assertEqual(stats['avg_progress'], 0)

    def test_calculate_course_statistics_with_progress(self):
        """Test course statistics with student progress"""
        # Mark some lessons as completed for student1
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson1,
            completed=True,
            completed_at=timezone.now()
        )
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson2,
            completed=True,
            completed_at=timezone.now()
        )
        Progress.objects.create(
            student=self.student1,
            lesson=self.lesson3,
            completed=True,
            completed_at=timezone.now()
        )

        stats = calculate_course_statistics(self.course.id, self.trainer)

        self.assertEqual(stats['completed_students'], 1)
        self.assertEqual(stats['completion_rate'], 33.33)  # 1 out of 3 students

    def test_calculate_enrollment_trends(self):
        """Test enrollment trends calculation"""
        # Create enrollments with different dates
        old_enrollment = Enrollment.objects.create(
            student=User.objects.create_user(
                username='old_student',
                email='old@example.com',
                is_student=True
            ),
            course=self.course
        )
        old_enrollment.enrolled_at = timezone.now() - timedelta(days=10)
        old_enrollment.save()

        trends = calculate_enrollment_trends(self.trainer, 'daily')

        self.assertIsInstance(trends, list)
        self.assertGreater(len(trends), 0)

        # Check that each trend has date and count
        for trend in trends:
            self.assertIn('date', trend)
            self.assertIn('count', trend)

    def test_calculate_completion_rates(self):
        """Test completion rates calculation"""
        # Mark student1 as completed all lessons
        for lesson in [self.lesson1, self.lesson2, self.lesson3]:
            Progress.objects.create(
                student=self.student1,
                lesson=lesson,
                completed=True,
                completed_at=timezone.now()
            )

        rates = calculate_completion_rates(self.trainer)

        self.assertEqual(len(rates), 1)
        self.assertEqual(rates[0]['course_id'], self.course.id)
        self.assertEqual(rates[0]['total_enrolled'], 3)
        self.assertEqual(rates[0]['total_completed'], 1)
        self.assertAlmostEqual(rates[0]['completion_rate'], 33.33, places=1)


class AnalyticsAPITestCase(TestCase):
    """Test cases for analytics API endpoints"""

    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()

        # Create trainer
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@example.com',
            password='testpass123',
            is_instructor=True
        )

        # Create student
        self.student = User.objects.create_user(
            username='student',
            email='student@example.com',
            password='testpass123',
            is_student=True
        )

        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.trainer
        )

        # Create lessons
        self.lesson1 = Lesson.objects.create(
            course=self.course,
            title='Lesson 1',
            order=1
        )
        self.lesson2 = Lesson.objects.create(
            course=self.course,
            title='Lesson 2',
            order=2
        )

    def test_trainer_analytics_view_unauthorized(self):
        """Test that unauthenticated users cannot access analytics"""
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trainer_analytics_view_student_forbidden(self):
        """Test that students cannot access trainer analytics"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_trainer_analytics_view_success(self):
        """Test successful retrieval of trainer analytics"""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/analytics/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_courses', response.data)
        self.assertIn('total_students', response.data)
        self.assertIn('total_enrollments', response.data)
        self.assertIn('total_lessons', response.data)
        self.assertIn('courses', response.data)

    def test_course_statistics_view_success(self):
        """Test successful retrieval of course statistics"""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get(f'/api/analytics/course/{self.course.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course_id'], self.course.id)
        self.assertIn('enrollments', response.data)
        self.assertIn('completion_rate', response.data)

    def test_course_statistics_view_not_found(self):
        """Test course statistics for non-existent course"""
        self.client.force_authenticate(user=self.trainer)
        response = self.client.get('/api/analytics/course/9999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_enrollment_trends_view(self):
        """Test enrollment trends endpoint"""
        self.client.force_authenticate(user=self.trainer)

        response = self.client.get('/api/analytics/enrollment_trends/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Test with period parameter
        response = self.client.get('/api/analytics/enrollment_trends/?period=weekly')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test invalid period
        response = self.client.get('/api/analytics/enrollment_trends/?period=invalid')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_completion_rates_view(self):
        """Test completion rates endpoint"""
        self.client.force_authenticate(user=self.trainer)

        response = self.client.get('/api/analytics/completion_rates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
