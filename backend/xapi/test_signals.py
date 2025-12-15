"""
Tests for xAPI signal-based statement generation

These tests verify that xAPI statements are automatically generated
when learning activities occur through Django signals.
"""
import pytest
from django.utils import timezone
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Enrollment, Progress
from quizzes.models import Quiz, QuizAttempt
from xapi.models import XAPIStatement

User = get_user_model()


@pytest.mark.django_db
class TestLessonCompletionSignal:
    """Test automatic xAPI statement generation for lesson completion"""
    
    def test_statement_generated_on_lesson_completion(self):
        """Test that completing a lesson generates an xAPI statement"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=instructor
        )
        lesson = Lesson.objects.create(
            course=course,
            title='Test Lesson',
            order=1,
            content='Test content'
        )
        
        # Create progress and mark as completed
        progress = Progress.objects.create(
            student=student,
            lesson=lesson,
            completed=True
        )
        
        # Verify statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            lesson=lesson
        )
        assert statements.count() == 1
        
        statement = statements.first()
        assert statement.verb_id == "http://adlnet.gov/expapi/verbs/completed"
        assert statement.actor_name == student.username
        assert statement.result_completion is True
        assert statement.user == student
        assert statement.lesson == lesson
        assert statement.course == course
    
    def test_no_statement_on_incomplete_lesson(self):
        """Test that incomplete lessons don't generate statements"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor2',
            email='instructor2@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student2',
            email='student2@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 2',
            description='Test Description',
            instructor=instructor
        )
        lesson = Lesson.objects.create(
            course=course,
            title='Test Lesson 2',
            order=1,
            content='Test content'
        )
        
        # Create progress but don't mark as completed
        progress = Progress.objects.create(
            student=student,
            lesson=lesson,
            completed=False
        )
        
        # Verify no statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            lesson=lesson
        )
        assert statements.count() == 0
    
    def test_no_duplicate_statements_on_update(self):
        """Test that updating a completed progress doesn't create duplicate statements"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor3',
            email='instructor3@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student3',
            email='student3@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 3',
            description='Test Description',
            instructor=instructor
        )
        lesson = Lesson.objects.create(
            course=course,
            title='Test Lesson 3',
            order=1,
            content='Test content'
        )
        
        # Create and complete progress
        progress = Progress.objects.create(
            student=student,
            lesson=lesson,
            completed=True
        )
        
        # Verify one statement was created
        assert XAPIStatement.objects.filter(user=student, lesson=lesson).count() == 1
        
        # Update the progress (save again)
        progress.save()
        
        # Verify still only one statement
        assert XAPIStatement.objects.filter(user=student, lesson=lesson).count() == 1


@pytest.mark.django_db
class TestQuizAttemptSignal:
    """Test automatic xAPI statement generation for quiz attempts"""
    
    def test_passed_statement_generated_on_quiz_pass(self):
        """Test that passing a quiz generates a 'passed' xAPI statement"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor4',
            email='instructor4@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student4',
            email='student4@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 4',
            description='Test Description',
            instructor=instructor
        )
        quiz = Quiz.objects.create(
            course=course,
            title='Test Quiz',
            passing_score=70
        )
        
        # Create a passing quiz attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            score=85,
            max_score=100,
            percentage=85,
            passed=True,
            completed_at=timezone.now(),
            time_taken=300  # 5 minutes
        )
        
        # Verify statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            quiz=quiz
        )
        assert statements.count() == 1
        
        statement = statements.first()
        assert statement.verb_id == "http://adlnet.gov/expapi/verbs/passed"
        assert statement.actor_name == student.username
        assert statement.result_success is True
        assert statement.result_completion is True
        assert float(statement.result_score_raw) == 85.0
        assert float(statement.result_score_max) == 100.0
        assert statement.result_duration == "PT300S"
        assert statement.user == student
        assert statement.quiz == quiz
        assert statement.course == course
    
    def test_failed_statement_generated_on_quiz_fail(self):
        """Test that failing a quiz generates a 'failed' xAPI statement"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor5',
            email='instructor5@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student5',
            email='student5@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 5',
            description='Test Description',
            instructor=instructor
        )
        quiz = Quiz.objects.create(
            course=course,
            title='Test Quiz 2',
            passing_score=70
        )
        
        # Create a failing quiz attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            score=50,
            max_score=100,
            percentage=50,
            passed=False,
            completed_at=timezone.now(),
            time_taken=180  # 3 minutes
        )
        
        # Verify statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            quiz=quiz
        )
        assert statements.count() == 1
        
        statement = statements.first()
        assert statement.verb_id == "http://adlnet.gov/expapi/verbs/failed"
        assert statement.actor_name == student.username
        assert statement.result_success is False
        assert statement.result_completion is True
        assert float(statement.result_score_raw) == 50.0
        assert float(statement.result_score_max) == 100.0
        assert statement.result_duration == "PT180S"
    
    def test_no_statement_on_incomplete_quiz(self):
        """Test that incomplete quiz attempts don't generate statements"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor6',
            email='instructor6@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student6',
            email='student6@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 6',
            description='Test Description',
            instructor=instructor
        )
        quiz = Quiz.objects.create(
            course=course,
            title='Test Quiz 3',
            passing_score=70
        )
        
        # Create an incomplete quiz attempt (no completed_at)
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            score=0,
            max_score=100,
            percentage=0,
            passed=False
        )
        
        # Verify no statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            quiz=quiz
        )
        assert statements.count() == 0


@pytest.mark.django_db
class TestEnrollmentSignal:
    """Test automatic xAPI statement generation for course enrollment"""
    
    def test_statement_generated_on_enrollment(self):
        """Test that enrolling in a course generates an xAPI statement"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor7',
            email='instructor7@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student7',
            email='student7@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 7',
            description='Test Description',
            instructor=instructor
        )
        
        # Create enrollment
        enrollment = Enrollment.objects.create(
            student=student,
            course=course
        )
        
        # Verify statement was created
        statements = XAPIStatement.objects.filter(
            user=student,
            course=course
        )
        assert statements.count() == 1
        
        statement = statements.first()
        assert statement.verb_id == "http://adlnet.gov/expapi/verbs/registered"
        assert statement.actor_name == student.username
        assert statement.user == student
        assert statement.course == course
        assert statement.lesson is None  # No lesson for enrollment
        assert statement.quiz is None  # No quiz for enrollment
    
    def test_no_duplicate_statements_on_enrollment_update(self):
        """Test that updating an enrollment doesn't create duplicate statements"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor8',
            email='instructor8@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student8',
            email='student8@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 8',
            description='Test Description',
            instructor=instructor
        )
        
        # Create enrollment
        enrollment = Enrollment.objects.create(
            student=student,
            course=course
        )
        
        # Verify one statement was created
        assert XAPIStatement.objects.filter(user=student, course=course).count() == 1
        
        # Update the enrollment (save again)
        enrollment.save()
        
        # Verify still only one statement
        assert XAPIStatement.objects.filter(user=student, course=course).count() == 1


@pytest.mark.django_db
class TestSignalIntegration:
    """Test integration of multiple signals"""
    
    def test_complete_learning_journey(self):
        """Test that a complete learning journey generates all expected statements"""
        # Create test data
        instructor = User.objects.create_user(
            username='instructor9',
            email='instructor9@test.com',
            password='testpass123'
        )
        student = User.objects.create_user(
            username='student9',
            email='student9@test.com',
            password='testpass123'
        )
        course = Course.objects.create(
            title='Test Course 9',
            description='Test Description',
            instructor=instructor
        )
        lesson = Lesson.objects.create(
            course=course,
            title='Test Lesson',
            order=1,
            content='Test content'
        )
        quiz = Quiz.objects.create(
            course=course,
            title='Test Quiz',
            passing_score=70
        )
        
        # 1. Enroll in course
        enrollment = Enrollment.objects.create(
            student=student,
            course=course
        )
        
        # 2. Complete lesson
        progress = Progress.objects.create(
            student=student,
            lesson=lesson,
            completed=True
        )
        
        # 3. Pass quiz
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            score=85,
            max_score=100,
            percentage=85,
            passed=True,
            completed_at=timezone.now()
        )
        
        # Verify all statements were created
        all_statements = XAPIStatement.objects.filter(user=student, course=course)
        assert all_statements.count() == 3
        
        # Verify each statement type
        registered_statements = all_statements.filter(
            verb_id="http://adlnet.gov/expapi/verbs/registered"
        )
        assert registered_statements.count() == 1
        
        completed_statements = all_statements.filter(
            verb_id="http://adlnet.gov/expapi/verbs/completed"
        )
        assert completed_statements.count() == 1
        
        passed_statements = all_statements.filter(
            verb_id="http://adlnet.gov/expapi/verbs/passed"
        )
        assert passed_statements.count() == 1
