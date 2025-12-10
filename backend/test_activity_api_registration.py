"""
Test ActivityLogViewSet API registration, filtering, and ordering.
Tests for task 21: Register ActivityLogViewSet in api_urls.py
"""
import pytest
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType
from unittest.mock import patch

from courses.models import Course, Lesson, Enrollment
from activity.models import ActivityLog

User = get_user_model()


@override_settings(
    # Disable signal receivers during tests to have predictable activity log counts
    SIGNAL_RECEIVERS_DISABLED=True
)
class ActivityLogViewSetRegistrationTest(TestCase):
    """Test ActivityLogViewSet is properly registered and accessible."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        # Disconnect signals to prevent automatic activity log creation
        from django.db.models.signals import post_save
        from activity import signals
        post_save.disconnect(signals.log_course_enrollment, sender='courses.Enrollment')
        post_save.disconnect(signals.log_lesson_completion, sender='courses.Progress')
        post_save.disconnect(signals.log_quiz_submission, sender='quizzes.QuizAttempt')
        post_save.disconnect(signals.log_discussion_post, sender='discussions.DiscussionThread')
        post_save.disconnect(signals.log_discussion_reply, sender='discussions.DiscussionReply')
        
        # Create users
        self.trainer = User.objects.create_user(
            username='trainer1',
            email='trainer1@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        self.student1 = User.objects.create_user(
            username='student1',
            email='student1@test.com',
            password='testpass123',
            is_student=True
        )
        
        self.student2 = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123',
            is_student=True
        )
        
        # Create courses
        self.course1 = Course.objects.create(
            title='Course 1',
            description='Test course 1',
            instructor=self.trainer
        )
        
        self.course2 = Course.objects.create(
            title='Course 2',
            description='Test course 2',
            instructor=self.trainer
        )
        
        # Create lessons
        self.lesson1 = Lesson.objects.create(
            course=self.course1,
            title='Lesson 1',
            content='Content 1',
            order=1
        )
        
        self.lesson2 = Lesson.objects.create(
            course=self.course1,
            title='Lesson 2',
            content='Content 2',
            order=2
        )
        
        self.lesson3 = Lesson.objects.create(
            course=self.course2,
            title='Lesson 3',
            content='Content 3',
            order=1
        )
        
        # Enroll students (signals are disconnected, so no automatic logs)
        Enrollment.objects.create(student=self.student1, course=self.course1)
        Enrollment.objects.create(student=self.student2, course=self.course1)
        Enrollment.objects.create(student=self.student1, course=self.course2)
        
        # Get content types
        self.course_ct = ContentType.objects.get_for_model(Course)
        self.lesson_ct = ContentType.objects.get_for_model(Lesson)
        
        # Create activity logs with different timestamps
        now = timezone.now()
        
        # Student 1 activities in course 1
        ActivityLog.objects.create(
            user=self.student1,
            action_type='lesson_view',
            content_type=self.lesson_ct,
            object_id=self.lesson1.id,
            description='Viewed Lesson 1',
            timestamp=now - timedelta(days=5)
        )
        
        ActivityLog.objects.create(
            user=self.student1,
            action_type='lesson_complete',
            content_type=self.lesson_ct,
            object_id=self.lesson1.id,
            description='Completed Lesson 1',
            timestamp=now - timedelta(days=4)
        )
        
        # Student 2 activities in course 1
        ActivityLog.objects.create(
            user=self.student2,
            action_type='lesson_view',
            content_type=self.lesson_ct,
            object_id=self.lesson2.id,
            description='Viewed Lesson 2',
            timestamp=now - timedelta(days=3)
        )
        
        # Student 1 activities in course 2
        ActivityLog.objects.create(
            user=self.student1,
            action_type='lesson_view',
            content_type=self.lesson_ct,
            object_id=self.lesson3.id,
            description='Viewed Lesson 3',
            timestamp=now - timedelta(days=2)
        )
        
        ActivityLog.objects.create(
            user=self.student1,
            action_type='course_view',
            content_type=self.course_ct,
            object_id=self.course2.id,
            description='Viewed Course 2',
            timestamp=now - timedelta(days=1)
        )
    
    def tearDown(self):
        """Reconnect signals after tests."""
        from django.db.models.signals import post_save
        from activity import signals
        post_save.connect(signals.log_course_enrollment, sender='courses.Enrollment')
        post_save.connect(signals.log_lesson_completion, sender='courses.Progress')
        post_save.connect(signals.log_quiz_submission, sender='quizzes.QuizAttempt')
        post_save.connect(signals.log_discussion_post, sender='discussions.DiscussionThread')
        post_save.connect(signals.log_discussion_reply, sender='discussions.DiscussionReply')
    
    def test_viewset_is_registered(self):
        """Test that ActivityLogViewSet is accessible via API."""
        self.client.force_authenticate(user=self.trainer)
        
        # Try to access the list endpoint
        url = reverse('activity_api:activity-log-list')
        response = self.client.get(url)
        
        # Should return 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_recent_action_is_registered(self):
        """Test that the recent action is accessible."""
        self.client.force_authenticate(user=self.trainer)
        
        # Try to access the recent endpoint
        url = reverse('activity_api:activity-log-recent')
        response = self.client.get(url)
        
        # Should return 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
    
    def test_chronological_ordering(self):
        """Test that activities are returned in chronological order (most recent first)."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 5 activities total
        self.assertEqual(len(results), 5)
        
        # Verify they are in descending order (most recent first)
        timestamps = [result['timestamp'] for result in results]
        for i in range(len(timestamps) - 1):
            # Each timestamp should be >= the next one (descending order)
            self.assertGreaterEqual(timestamps[i], timestamps[i + 1])
    
    def test_filter_by_course(self):
        """Test filtering activities by course."""
        self.client.force_authenticate(user=self.trainer)
        
        # Filter by course 1
        url = reverse('activity_api:activity-log-list')
        response = self.client.get(url, {'course': self.course1.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 3 activities from course 1 (2 from student1, 1 from student2)
        self.assertEqual(len(results), 3)
        
        # Filter by course 2
        response = self.client.get(url, {'course': self.course2.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 2 activities from course 2
        self.assertEqual(len(results), 2)
    
    def test_filter_by_student(self):
        """Test filtering activities by student."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        
        # Filter by student 1
        response = self.client.get(url, {'student': self.student1.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 4 activities from student1
        self.assertEqual(len(results), 4)
        
        # Verify all activities are from student1
        for result in results:
            self.assertEqual(result['user'], self.student1.id)
        
        # Filter by student 2
        response = self.client.get(url, {'student': self.student2.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 1 activity from student2
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['user'], self.student2.id)
    
    def test_filter_by_action_type(self):
        """Test filtering activities by action type."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        
        # Filter by lesson_view
        response = self.client.get(url, {'action_type': 'lesson_view'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 3 lesson_view activities
        self.assertEqual(len(results), 3)
        
        # Verify all are lesson_view
        for result in results:
            self.assertEqual(result['action_type'], 'lesson_view')
        
        # Filter by lesson_complete
        response = self.client.get(url, {'action_type': 'lesson_complete'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 1 lesson_complete activity
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['action_type'], 'lesson_complete')
    
    def test_filter_by_date_range(self):
        """Test filtering activities by date range."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        now = timezone.now()
        
        # Filter from 3 days ago
        date_from = (now - timedelta(days=3)).strftime('%Y-%m-%d')
        response = self.client.get(url, {'date_from': date_from})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 3 activities (from last 3 days)
        self.assertEqual(len(results), 3)
        
        # Filter to 4 days ago
        date_to = (now - timedelta(days=4)).strftime('%Y-%m-%d')
        response = self.client.get(url, {'date_to': date_to})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 2 activities (older than 4 days)
        self.assertEqual(len(results), 2)
        
        # Filter with both date_from and date_to
        date_from = (now - timedelta(days=4)).strftime('%Y-%m-%d')
        date_to = (now - timedelta(days=2)).strftime('%Y-%m-%d')
        response = self.client.get(url, {'date_from': date_from, 'date_to': date_to})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 3 activities (between 4 and 2 days ago)
        self.assertEqual(len(results), 3)
    
    def test_combined_filters(self):
        """Test combining multiple filters."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        
        # Filter by course and student
        response = self.client.get(url, {
            'course': self.course1.id,
            'student': self.student1.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 2 activities (student1 in course1)
        self.assertEqual(len(results), 2)
        
        # Filter by course, student, and action_type
        response = self.client.get(url, {
            'course': self.course1.id,
            'student': self.student1.id,
            'action_type': 'lesson_view'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should have 1 activity (student1 viewing lesson in course1)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['action_type'], 'lesson_view')
    
    def test_recent_endpoint_limit(self):
        """Test that recent endpoint respects limit parameter."""
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-recent')
        
        # Test with limit=2
        response = self.client.get(url, {'limit': 2})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
        
        # Test with limit=10 (should return all 5)
        response = self.client.get(url, {'limit': 10})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 5)
        self.assertEqual(len(response.data['results']), 5)
    
    def test_permission_required(self):
        """Test that only instructors can access the endpoint."""
        # Try without authentication
        url = reverse('activity_api:activity-log-list')
        response = self.client.get(url)
        
        # Should return 401 Unauthorized or 403 Forbidden
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        
        # Try with student authentication
        self.client.force_authenticate(user=self.student1)
        response = self.client.get(url)
        
        # Should return 403 Forbidden (students are not instructors)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_trainer_only_sees_own_courses(self):
        """Test that trainers only see activities from their own courses."""
        # Create another trainer with their own course
        other_trainer = User.objects.create_user(
            username='trainer2',
            email='trainer2@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        other_course = Course.objects.create(
            title='Other Course',
            description='Another trainer\'s course',
            instructor=other_trainer
        )
        
        other_lesson = Lesson.objects.create(
            course=other_course,
            title='Other Lesson',
            content='Other content',
            order=1
        )
        
        # Create activity in other trainer's course
        ActivityLog.objects.create(
            user=self.student1,
            action_type='lesson_view',
            content_type=self.lesson_ct,
            object_id=other_lesson.id,
            description='Viewed Other Lesson',
            timestamp=timezone.now()
        )
        
        # Authenticate as first trainer
        self.client.force_authenticate(user=self.trainer)
        
        url = reverse('activity_api:activity-log-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should still have only 5 activities (not 6)
        self.assertEqual(len(results), 5)
        
        # Verify none of the activities are from the other course
        for result in results:
            # The description should not contain "Other Lesson"
            self.assertNotIn('Other Lesson', result['description'])


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
