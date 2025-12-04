from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ActivityLog, SessionActivity, LessonTimeTracking, DailyActivitySummary
from .utils import log_activity, get_user_activity_stats
from courses.models import Course, Lesson

User = get_user_model()


class ActivityLogTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            is_student=True
        )
        self.instructor = User.objects.create_user(
            username='instructor',
            password='testpass123',
            is_instructor=True
        )
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor
        )

    def test_log_activity_creation(self):
        """Test creating an activity log"""
        log = log_activity(
            user=self.user,
            action_type='course_view',
            content_object=self.course,
            description='Viewed test course'
        )
        
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action_type, 'course_view')
        self.assertEqual(log.content_object, self.course)

    def test_activity_log_without_user(self):
        """Test logging activity for anonymous user"""
        log = log_activity(
            user=None,
            action_type='course_view',
            content_object=self.course,
            description='Anonymous view'
        )
        
        self.assertIsNotNone(log)
        self.assertIsNone(log.user)

    def test_activity_log_with_metadata(self):
        """Test logging activity with custom metadata"""
        metadata = {'search_query': 'python', 'results': 5}
        log = log_activity(
            user=self.user,
            action_type='search',
            description='Searched for courses',
            metadata=metadata
        )
        
        self.assertEqual(log.metadata, metadata)


class SessionActivityTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_session_creation(self):
        """Test creating a session activity"""
        session = SessionActivity.objects.create(
            user=self.user,
            session_key='test_session_123',
            ip_address='127.0.0.1'
        )
        
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.page_views, 0)
        self.assertIsNone(session.ended_at)

    def test_session_duration(self):
        """Test session duration calculation"""
        session = SessionActivity.objects.create(
            user=self.user,
            session_key='test_session_123'
        )
        
        # Duration should be very small (just created)
        self.assertGreaterEqual(session.duration, 0)
        self.assertLess(session.duration, 2)  # Less than 2 seconds


class LessonTimeTrackingTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='student',
            password='testpass123',
            is_student=True
        )
        self.instructor = User.objects.create_user(
            username='instructor',
            password='testpass123',
            is_instructor=True
        )
        self.course = Course.objects.create(
            title='Test Course',
            description='Test',
            instructor=self.instructor
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson',
            video_url='https://example.com/video',
            order=1
        )

    def test_lesson_tracking_creation(self):
        """Test creating lesson time tracking"""
        tracking = LessonTimeTracking.objects.create(
            student=self.user,
            lesson=self.lesson,
            time_spent=120
        )
        
        self.assertEqual(tracking.student, self.user)
        self.assertEqual(tracking.lesson, self.lesson)
        self.assertEqual(tracking.time_spent, 120)
        self.assertFalse(tracking.completed)

    def test_mark_complete(self):
        """Test marking lesson as complete"""
        tracking = LessonTimeTracking.objects.create(
            student=self.user,
            lesson=self.lesson
        )
        
        tracking.mark_complete()
        
        self.assertTrue(tracking.completed)
        self.assertIsNotNone(tracking.completed_at)


class UtilityFunctionsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            is_student=True
        )

    def test_get_user_activity_stats(self):
        """Test getting user activity statistics"""
        # Create some activities
        for i in range(5):
            log_activity(
                user=self.user,
                action_type='course_view',
                description=f'Activity {i}'
            )
        
        stats = get_user_activity_stats(self.user, days=7)
        
        self.assertIn('total_activities', stats)
        self.assertIn('activity_counts', stats)
        self.assertEqual(stats['total_activities'], 5)
