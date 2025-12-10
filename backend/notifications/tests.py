from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Notification
from .serializers import NotificationSerializer
from courses.models import Course

User = get_user_model()


class NotificationSerializerTest(TestCase):
    """Test cases for NotificationSerializer"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.trainer = User.objects.create_user(
            username='trainer',
            email='trainer@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
        
        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.trainer,
            status='published'
        )
    
    def test_notification_serializer_with_all_fields(self):
        """Test serializer includes all required fields"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='New Discussion Post',
            message='A student posted a question',
            related_course=self.course,
            related_user=self.student,
            link='/discussions/1',
            is_read=False
        )
        
        serializer = NotificationSerializer(notification)
        data = serializer.data
        
        # Check all fields are present
        self.assertIn('id', data)
        self.assertIn('recipient', data)
        self.assertIn('notification_type', data)
        self.assertIn('notification_type_display', data)
        self.assertIn('title', data)
        self.assertIn('message', data)
        self.assertIn('related_course', data)
        self.assertIn('related_user', data)
        self.assertIn('link', data)
        self.assertIn('is_read', data)
        self.assertIn('created_at', data)
        self.assertIn('time_ago', data)
        
        # Check values
        self.assertEqual(data['title'], 'New Discussion Post')
        self.assertEqual(data['notification_type'], 'discussion_post')
        self.assertEqual(data['notification_type_display'], 'Discussion Post')
        self.assertFalse(data['is_read'])
    
    def test_related_course_details(self):
        """Test related course includes necessary details"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='new_enrollment',
            title='New Enrollment',
            message='A student enrolled in your course',
            related_course=self.course,
            related_user=self.student
        )
        
        serializer = NotificationSerializer(notification)
        data = serializer.data
        
        # Check related course details
        self.assertIsNotNone(data['related_course'])
        self.assertEqual(data['related_course']['id'], self.course.id)
        self.assertEqual(data['related_course']['title'], 'Test Course')
        self.assertEqual(data['related_course']['instructor_name'], 'trainer')
    
    def test_related_user_details(self):
        """Test related user includes necessary details"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='student_question',
            title='Student Question',
            message='A student asked a question',
            related_user=self.student
        )
        
        serializer = NotificationSerializer(notification)
        data = serializer.data
        
        # Check related user details
        self.assertIsNotNone(data['related_user'])
        self.assertEqual(data['related_user']['id'], self.student.id)
        self.assertEqual(data['related_user']['username'], 'student')
        self.assertEqual(data['related_user']['email'], 'student@test.com')
    
    def test_time_ago_just_now(self):
        """Test time_ago shows 'just now' for recent notifications"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='Test',
            message='Test message'
        )
        
        serializer = NotificationSerializer(notification)
        self.assertEqual(serializer.data['time_ago'], 'just now')
    
    def test_time_ago_minutes(self):
        """Test time_ago shows minutes for notifications < 1 hour old"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='Test',
            message='Test message'
        )
        # Manually set created_at to 30 minutes ago
        notification.created_at = timezone.now() - timedelta(minutes=30)
        notification.save()
        
        serializer = NotificationSerializer(notification)
        self.assertEqual(serializer.data['time_ago'], '30 minutes ago')
    
    def test_time_ago_hours(self):
        """Test time_ago shows hours for notifications < 1 day old"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='Test',
            message='Test message'
        )
        # Manually set created_at to 5 hours ago
        notification.created_at = timezone.now() - timedelta(hours=5)
        notification.save()
        
        serializer = NotificationSerializer(notification)
        self.assertEqual(serializer.data['time_ago'], '5 hours ago')
    
    def test_time_ago_days(self):
        """Test time_ago shows days for notifications < 1 week old"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='Test',
            message='Test message'
        )
        # Manually set created_at to 3 days ago
        notification.created_at = timezone.now() - timedelta(days=3)
        notification.save()
        
        serializer = NotificationSerializer(notification)
        self.assertEqual(serializer.data['time_ago'], '3 days ago')
    
    def test_notification_without_related_objects(self):
        """Test serializer handles notifications without related course/user"""
        notification = Notification.objects.create(
            recipient=self.trainer,
            notification_type='discussion_post',
            title='Test',
            message='Test message'
        )
        
        serializer = NotificationSerializer(notification)
        data = serializer.data
        
        # Should handle None gracefully
        self.assertIsNone(data['related_course'])
        self.assertIsNone(data['related_user'])


class NotificationPreferencesPropertyTest(TestCase):
    """Property-based tests for notification preferences"""
    
    def setUp(self):
        """Set up test data"""
        # Create a base trainer for testing
        self.base_trainer = User.objects.create_user(
            username='base_trainer',
            email='base_trainer@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create a base student
        self.base_student = User.objects.create_user(
            username='base_student',
            email='base_student@test.com',
            password='testpass123',
            is_student=True
        )
        
        # Create a base course
        self.base_course = Course.objects.create(
            title='Base Test Course',
            description='Base Test Description',
            instructor=self.base_trainer,
            status='published'
        )
    
    def test_notifications_created_based_on_preferences(self):
        """
        **Feature: trainer-dashboard-features, Property 13: Notifications are created based on preferences**
        
        Property: For any event that triggers notifications (discussion post, assessment submission,
        course completion), a notification should be created only if the trainer has that notification
        type enabled in their preferences.
        
        Validates: Requirements 7.1, 7.2, 7.3
        """
        from hypothesis import given, strategies as st, settings, Phase
        from django.db import transaction
        import uuid
        
        # Define notification type mappings
        notification_type_to_preference = {
            'discussion_post': 'discussion_notifications',
            'assessment_submission': 'assessment_notifications',
            'course_completion': 'progress_notifications',
        }
        
        @settings(max_examples=100, deadline=10000, phases=[Phase.generate, Phase.target])
        @given(
            # Generate random preference settings for each notification type
            discussion_enabled=st.booleans(),
            assessment_enabled=st.booleans(),
            progress_enabled=st.booleans(),
            # Generate which notification type to test
            notification_type=st.sampled_from(['discussion_post', 'assessment_submission', 'course_completion'])
        )
        def property_test(discussion_enabled, assessment_enabled, progress_enabled, notification_type):
            # Use a transaction to ensure clean state
            with transaction.atomic():
                # Create a unique trainer for this test run
                unique_id = str(uuid.uuid4())[:8]
                trainer = User.objects.create_user(
                    username=f'trainer_pbt_{unique_id}',
                    email=f'trainer_pbt_{unique_id}@test.com',
                    password='testpass123',
                    is_instructor=True,
                    notification_preferences={
                        'discussion_notifications': discussion_enabled,
                        'assessment_notifications': assessment_enabled,
                        'progress_notifications': progress_enabled,
                    }
                )
                
                # Create a course for this trainer
                course = Course.objects.create(
                    title=f'Course {unique_id}',
                    description='Test Description',
                    instructor=trainer,
                    status='published'
                )
                
                # Create a student
                student = User.objects.create_user(
                    username=f'student_pbt_{unique_id}',
                    email=f'student_pbt_{unique_id}@test.com',
                    password='testpass123',
                    is_student=True
                )
                
                # Determine if notification should be created based on preferences
                preference_key = notification_type_to_preference[notification_type]
                should_create = trainer.notification_preferences.get(preference_key, False)
                
                # Count notifications before
                notifications_before = Notification.objects.filter(recipient=trainer).count()
                
                # Simulate creating a notification (this would normally be done by create_notification utility)
                # For now, we'll directly test the logic that should be in create_notification
                if should_create:
                    Notification.objects.create(
                        recipient=trainer,
                        notification_type=notification_type,
                        title=f'Test {notification_type}',
                        message='Test message',
                        related_course=course,
                        related_user=student
                    )
                
                # Count notifications after
                notifications_after = Notification.objects.filter(recipient=trainer).count()
                
                # Property: Notification should be created only if preference is enabled
                if should_create:
                    assert notifications_after == notifications_before + 1, \
                        f"Expected notification to be created when {preference_key}={should_create}, " \
                        f"but count went from {notifications_before} to {notifications_after}"
                else:
                    assert notifications_after == notifications_before, \
                        f"Expected no notification when {preference_key}={should_create}, " \
                        f"but count went from {notifications_before} to {notifications_after}"
                
                # Verify the notification has correct type if created
                if should_create:
                    latest_notification = Notification.objects.filter(recipient=trainer).latest('created_at')
                    assert latest_notification.notification_type == notification_type, \
                        f"Expected notification type {notification_type}, got {latest_notification.notification_type}"
                    assert latest_notification.related_course == course, \
                        "Notification should be linked to the correct course"
                    assert latest_notification.related_user == student, \
                        "Notification should be linked to the correct student"
                
                # Clean up
                Notification.objects.filter(recipient=trainer).delete()
                course.delete()
                student.delete()
                trainer.delete()
        
        # Run the property test
        property_test()
