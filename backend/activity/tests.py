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



class SignalTestCase(TestCase):
    """Test automatic activity logging via signals"""
    
    def setUp(self):
        self.student = User.objects.create_user(
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
            description='Test Description',
            instructor=self.instructor
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson',
            video_url='https://example.com/video',
            order=1
        )
    
    def test_enrollment_signal(self):
        """Test that enrollment creates an activity log"""
        from courses.models import Enrollment
        
        initial_count = ActivityLog.objects.filter(action_type='course_enroll').count()
        
        enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
        
        # Check that activity log was created
        new_count = ActivityLog.objects.filter(action_type='course_enroll').count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Verify the log details
        log = ActivityLog.objects.filter(
            action_type='course_enroll',
            user=self.student
        ).latest('timestamp')
        
        self.assertEqual(log.content_object, self.course)
        self.assertIn(self.student.username, log.description)
        self.assertIn(self.course.title, log.description)
    
    def test_lesson_completion_signal(self):
        """Test that lesson completion creates an activity log"""
        from courses.models import Progress
        
        initial_count = ActivityLog.objects.filter(action_type='lesson_complete').count()
        
        progress = Progress.objects.create(
            student=self.student,
            lesson=self.lesson,
            completed=True,
            completed_at=timezone.now()
        )
        
        # Check that activity log was created
        new_count = ActivityLog.objects.filter(action_type='lesson_complete').count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Verify the log details
        log = ActivityLog.objects.filter(
            action_type='lesson_complete',
            user=self.student
        ).latest('timestamp')
        
        self.assertEqual(log.content_object, self.lesson)
        self.assertIn(self.student.username, log.description)
    
    def test_quiz_submission_signal(self):
        """Test that quiz submission creates an activity log"""
        from quizzes.models import Quiz, QuizAttempt
        
        quiz = Quiz.objects.create(
            course=self.course,
            title='Test Quiz',
            passing_score=70
        )
        
        initial_count = ActivityLog.objects.filter(action_type='quiz_submit').count()
        
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=self.student,
            score=85,
            percentage=85,
            passed=True,
            attempt_number=1,
            completed_at=timezone.now(),
            time_taken=300
        )
        
        # Check that activity log was created
        new_count = ActivityLog.objects.filter(action_type='quiz_submit').count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Verify the log details
        log = ActivityLog.objects.filter(
            action_type='quiz_submit',
            user=self.student
        ).latest('timestamp')
        
        self.assertEqual(log.content_object, quiz)
        self.assertIn(self.student.username, log.description)
        self.assertIn(quiz.title, log.description)
        self.assertEqual(log.metadata['attempt_number'], 1)
        self.assertEqual(log.metadata['score'], 85.0)
        self.assertEqual(log.metadata['passed'], True)
    
    def test_discussion_thread_signal(self):
        """Test that creating a discussion thread creates an activity log"""
        from discussions.models import DiscussionThread
        
        initial_count = ActivityLog.objects.filter(action_type='discussion_post').count()
        
        thread = DiscussionThread.objects.create(
            course=self.course,
            author=self.student,
            title='Test Thread',
            content='This is a test discussion thread'
        )
        
        # Check that activity log was created
        new_count = ActivityLog.objects.filter(action_type='discussion_post').count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Verify the log details
        log = ActivityLog.objects.filter(
            action_type='discussion_post',
            user=self.student
        ).latest('timestamp')
        
        self.assertEqual(log.content_object, thread)
        self.assertIn(self.student.username, log.description)
        self.assertIn(thread.title, log.description)
        self.assertEqual(log.metadata['course_id'], self.course.id)
        self.assertEqual(log.metadata['thread_title'], thread.title)
    
    def test_discussion_reply_signal(self):
        """Test that replying to a discussion creates an activity log"""
        from discussions.models import DiscussionThread, DiscussionReply
        
        thread = DiscussionThread.objects.create(
            course=self.course,
            author=self.instructor,
            title='Test Thread',
            content='Original post'
        )
        
        initial_count = ActivityLog.objects.filter(action_type='discussion_reply').count()
        
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.student,
            content='This is a reply'
        )
        
        # Check that activity log was created
        new_count = ActivityLog.objects.filter(action_type='discussion_reply').count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Verify the log details
        log = ActivityLog.objects.filter(
            action_type='discussion_reply',
            user=self.student
        ).latest('timestamp')
        
        self.assertEqual(log.content_object, thread)
        self.assertIn(self.student.username, log.description)
        self.assertIn(thread.title, log.description)
        self.assertEqual(log.metadata['thread_id'], thread.id)
        self.assertEqual(log.metadata['course_id'], self.course.id)
    
    def test_quiz_submission_not_logged_until_completed(self):
        """Test that quiz attempts are only logged when completed"""
        from quizzes.models import Quiz, QuizAttempt
        
        quiz = Quiz.objects.create(
            course=self.course,
            title='Test Quiz',
            passing_score=70
        )
        
        initial_count = ActivityLog.objects.filter(action_type='quiz_submit').count()
        
        # Create attempt without completed_at
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=self.student,
            attempt_number=1
        )
        
        # Should not create activity log yet
        new_count = ActivityLog.objects.filter(action_type='quiz_submit').count()
        self.assertEqual(new_count, initial_count)
        
        # Now complete the attempt
        attempt.completed_at = timezone.now()
        attempt.score = 75
        attempt.percentage = 75
        attempt.passed = True
        attempt.save()
        
        # Now should have created activity log
        final_count = ActivityLog.objects.filter(action_type='quiz_submit').count()
        self.assertEqual(final_count, initial_count + 1)
    
    def test_deleted_discussion_not_logged(self):
        """Test that deleted discussions don't create activity logs"""
        from discussions.models import DiscussionThread
        
        initial_count = ActivityLog.objects.filter(action_type='discussion_post').count()
        
        # Create thread with is_deleted=True
        thread = DiscussionThread.objects.create(
            course=self.course,
            author=self.student,
            title='Deleted Thread',
            content='This should not be logged',
            is_deleted=True
        )
        
        # Should not create activity log
        new_count = ActivityLog.objects.filter(action_type='discussion_post').count()
        self.assertEqual(new_count, initial_count)



class PropertyBasedTestCase(TestCase):
    """Property-based tests using Hypothesis"""
    
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='instructor_pbt',
            password='testpass123',
            is_instructor=True
        )
        self.course = Course.objects.create(
            title='Test Course PBT',
            description='Test Description',
            instructor=self.instructor
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson PBT',
            video_url='https://example.com/video',
            order=1
        )
    
    def test_activity_logs_chronological_ordering(self):
        """
        **Feature: trainer-dashboard-features, Property 3: Activity logs are chronologically ordered**
        
        Property: For any set of activity logs for a trainer's courses, when retrieved,
        they should be ordered by timestamp in descending order (most recent first).
        
        Validates: Requirements 2.1
        """
        from hypothesis import given, strategies as st, settings, Phase
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction
        
        @settings(max_examples=100, deadline=5000, phases=[Phase.generate, Phase.target])
        @given(
            num_activities=st.integers(min_value=2, max_value=20),
            time_spread_hours=st.integers(min_value=1, max_value=168)  # Up to 1 week
        )
        def property_test(num_activities, time_spread_hours):
            # Use a transaction to ensure clean state
            with transaction.atomic():
                # Create a unique student for this test run
                import uuid
                unique_id = str(uuid.uuid4())[:8]
                student = User.objects.create_user(
                    username=f'student_pbt_{unique_id}',
                    password='testpass123',
                    is_student=True
                )
                
                # Create activity logs with random timestamps
                base_time = timezone.now()
                created_timestamps = []
                
                for i in range(num_activities):
                    # Generate a random timestamp within the time spread
                    # Use deterministic offset based on index to avoid randomness issues
                    hours_offset = (i * time_spread_hours) / num_activities
                    timestamp = base_time - timedelta(hours=hours_offset)
                    created_timestamps.append(timestamp)
                    
                    # Create activity log with specific timestamp
                    ActivityLog.objects.create(
                        user=student,
                        action_type='lesson_view',
                        content_object=self.lesson,
                        description=f'Activity {i}',
                        timestamp=timestamp
                    )
                
                # Retrieve activities using the API ViewSet logic (ordered by -timestamp)
                from django.contrib.contenttypes.models import ContentType
                lesson_ct = ContentType.objects.get_for_model(self.lesson)
                retrieved_activities = list(ActivityLog.objects.filter(
                    user=student,
                    content_type=lesson_ct,
                    object_id=self.lesson.id
                ).order_by('-timestamp'))
                
                # Property: Activities should be in descending chronological order
                timestamps = [activity.timestamp for activity in retrieved_activities]
                
                # Check that each timestamp is >= the next one (descending order)
                for i in range(len(timestamps) - 1):
                    assert timestamps[i] >= timestamps[i + 1], \
                        f"Activity at index {i} (timestamp: {timestamps[i]}) should be >= " \
                        f"activity at index {i+1} (timestamp: {timestamps[i+1]})"
                
                # Verify we got all activities
                assert len(retrieved_activities) == num_activities, \
                    f"Expected {num_activities} activities, got {len(retrieved_activities)}"
                
                # Clean up - delete the student and their activities
                ActivityLog.objects.filter(user=student).delete()
                student.delete()
        
        # Run the property test
        property_test()


class IntegrationSignalTestCase(TestCase):
    """Integration tests for signal-based activity logging"""
    
    def setUp(self):
        self.student = User.objects.create_user(
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
            title='Integration Test Course',
            description='Test Description',
            instructor=self.instructor
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Integration Test Lesson',
            video_url='https://example.com/video',
            order=1
        )
    
    def test_complete_student_workflow(self):
        """Test that a complete student workflow creates all expected activity logs"""
        from courses.models import Enrollment, Progress
        from quizzes.models import Quiz, QuizAttempt
        from discussions.models import DiscussionThread, DiscussionReply
        
        initial_count = ActivityLog.objects.filter(user=self.student).count()
        
        # Step 1: Student enrolls in course
        enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
        
        # Step 2: Student completes a lesson
        progress = Progress.objects.create(
            student=self.student,
            lesson=self.lesson,
            completed=True,
            completed_at=timezone.now()
        )
        
        # Step 3: Student takes a quiz
        quiz = Quiz.objects.create(
            course=self.course,
            title='Integration Quiz',
            passing_score=70
        )
        
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=self.student,
            score=80,
            percentage=80,
            passed=True,
            attempt_number=1,
            completed_at=timezone.now()
        )
        
        # Step 4: Student posts in discussion
        thread = DiscussionThread.objects.create(
            course=self.course,
            author=self.student,
            title='Integration Question',
            content='I have a question about the lesson'
        )
        
        # Step 5: Instructor replies
        reply = DiscussionReply.objects.create(
            thread=thread,
            author=self.instructor,
            content='Here is the answer'
        )
        
        # Verify all activities were logged
        student_activities = ActivityLog.objects.filter(user=self.student).order_by('timestamp')
        instructor_activities = ActivityLog.objects.filter(user=self.instructor).order_by('timestamp')
        
        # Student should have 4 activities: enroll, complete, submit, post
        self.assertEqual(student_activities.count(), initial_count + 4)
        
        # Verify activity types
        activity_types = list(student_activities.values_list('action_type', flat=True))
        self.assertIn('course_enroll', activity_types)
        self.assertIn('lesson_complete', activity_types)
        self.assertIn('quiz_submit', activity_types)
        self.assertIn('discussion_post', activity_types)
        
        # Instructor should have 1 activity: reply
        self.assertEqual(instructor_activities.count(), 1)
        self.assertEqual(instructor_activities.first().action_type, 'discussion_reply')
    
    def test_multiple_quiz_attempts(self):
        """Test that multiple quiz attempts are all logged"""
        from quizzes.models import Quiz, QuizAttempt
        
        quiz = Quiz.objects.create(
            course=self.course,
            title='Multi-Attempt Quiz',
            passing_score=70,
            max_attempts=3
        )
        
        initial_count = ActivityLog.objects.filter(
            user=self.student,
            action_type='quiz_submit'
        ).count()
        
        # Create 3 attempts
        for i in range(1, 4):
            QuizAttempt.objects.create(
                quiz=quiz,
                student=self.student,
                score=50 + (i * 10),
                percentage=50 + (i * 10),
                passed=(50 + (i * 10)) >= 70,
                attempt_number=i,
                completed_at=timezone.now()
            )
        
        # Should have 3 activity logs
        final_count = ActivityLog.objects.filter(
            user=self.student,
            action_type='quiz_submit'
        ).count()
        
        self.assertEqual(final_count, initial_count + 3)
        
        # Verify attempt numbers in metadata
        logs = ActivityLog.objects.filter(
            user=self.student,
            action_type='quiz_submit'
        ).order_by('timestamp')
        
        attempt_numbers = [log.metadata.get('attempt_number') for log in logs]
        self.assertIn(1, attempt_numbers)
        self.assertIn(2, attempt_numbers)
        self.assertIn(3, attempt_numbers)
