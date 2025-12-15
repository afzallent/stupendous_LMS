"""
Tests for XAPIStatementGenerator
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from courses.models import Course, Lesson
from quizzes.models import Quiz
from xapi.statement_generator import XAPIStatementGenerator
from xapi.models import XAPIStatement

User = get_user_model()


@pytest.mark.django_db
class TestXAPIStatementGenerator:
    """Test suite for XAPIStatementGenerator"""
    
    @pytest.fixture
    def generator(self):
        """Create a statement generator instance"""
        return XAPIStatementGenerator(base_url="http://testserver")
    
    @pytest.fixture
    def student(self):
        """Create a test student"""
        return User.objects.create_user(
            username="teststudent",
            email="student@test.com",
            password="testpass123",
            first_name="Test",
            last_name="Student"
        )
    
    @pytest.fixture
    def instructor(self):
        """Create a test instructor"""
        return User.objects.create_user(
            username="testinstructor",
            email="instructor@test.com",
            password="testpass123",
            is_instructor=True
        )
    
    @pytest.fixture
    def course(self, instructor):
        """Create a test course"""
        return Course.objects.create(
            title="Test Course",
            description="A test course for xAPI",
            instructor=instructor
        )
    
    @pytest.fixture
    def lesson(self, course):
        """Create a test lesson"""
        return Lesson.objects.create(
            course=course,
            title="Test Lesson",
            content="Test lesson content",
            order=1,
            content_type=Lesson.CONTENT_TYPE_VIDEO
        )
    
    @pytest.fixture
    def quiz(self, course):
        """Create a test quiz"""
        return Quiz.objects.create(
            course=course,
            title="Test Quiz",
            description="A test quiz",
            passing_score=70
        )
    
    def test_generate_lesson_completed(self, generator, student, lesson):
        """Test generating a lesson completed statement"""
        statement = generator.generate_lesson_completed(student, lesson)
        
        assert statement is not None
        assert isinstance(statement, XAPIStatement)
        assert statement.verb_id == generator.VERB_COMPLETED
        assert statement.verb_display == {"en-US": "completed"}
        assert statement.actor_name == "Test Student"
        assert statement.actor_mbox == "student@test.com"
        assert lesson.title in statement.object_json["definition"]["name"]["en-US"]
        assert statement.result_completion is True
        assert statement.user == student
        assert statement.lesson == lesson
        assert statement.course == lesson.course
    
    def test_generate_quiz_passed(self, generator, student, quiz):
        """Test generating a quiz passed statement"""
        score = 85
        max_score = 100
        
        statement = generator.generate_quiz_passed(student, quiz, score, max_score)
        
        assert statement is not None
        assert isinstance(statement, XAPIStatement)
        assert statement.verb_id == generator.VERB_PASSED
        assert statement.verb_display == {"en-US": "passed"}
        assert statement.actor_name == "Test Student"
        assert statement.result_score_raw == Decimal('85')
        assert statement.result_score_max == Decimal('100')
        assert statement.result_score_scaled == Decimal('0.85')
        assert statement.result_success is True
        assert statement.result_completion is True
        assert statement.user == student
        assert statement.quiz == quiz
        assert statement.course == quiz.course
    
    def test_generate_quiz_failed(self, generator, student, quiz):
        """Test generating a quiz failed statement"""
        score = 45
        max_score = 100
        
        statement = generator.generate_quiz_failed(student, quiz, score, max_score)
        
        assert statement is not None
        assert isinstance(statement, XAPIStatement)
        assert statement.verb_id == generator.VERB_FAILED
        assert statement.verb_display == {"en-US": "failed"}
        assert statement.actor_name == "Test Student"
        assert statement.result_score_raw == Decimal('45')
        assert statement.result_score_max == Decimal('100')
        assert statement.result_score_scaled == Decimal('0.45')
        assert statement.result_success is False
        assert statement.result_completion is True
        assert statement.user == student
        assert statement.quiz == quiz
    
    def test_generate_course_registered(self, generator, student, course):
        """Test generating a course registration statement"""
        statement = generator.generate_course_registered(student, course)
        
        assert statement is not None
        assert isinstance(statement, XAPIStatement)
        assert statement.verb_id == generator.VERB_REGISTERED
        assert statement.verb_display == {"en-US": "registered"}
        assert statement.actor_name == "Test Student"
        assert course.title in statement.object_json["definition"]["name"]["en-US"]
        assert statement.user == student
        assert statement.course == course
    
    def test_generate_video_interaction_played(self, generator, student, lesson):
        """Test generating a video played statement"""
        statement = generator.generate_video_interaction(student, lesson, 'played')
        
        assert statement is not None
        assert isinstance(statement, XAPIStatement)
        assert statement.verb_id == generator.VERB_PLAYED
        assert statement.verb_display == {"en-US": "played"}
        assert statement.actor_name == "Test Student"
        assert statement.user == student
        assert statement.lesson == lesson
    
    def test_generate_video_interaction_paused(self, generator, student, lesson):
        """Test generating a video paused statement"""
        statement = generator.generate_video_interaction(student, lesson, 'paused', position=120)
        
        assert statement is not None
        assert statement.verb_id == generator.VERB_PAUSED
        assert statement.verb_display == {"en-US": "paused"}
        # Check that position is in the result extensions
        assert "extensions" in statement.result_json
        assert statement.result_json["extensions"]["http://id.tincanapi.com/extension/position"] == 120
    
    def test_generate_video_interaction_seeked(self, generator, student, lesson):
        """Test generating a video seeked statement"""
        statement = generator.generate_video_interaction(student, lesson, 'seeked', position=300)
        
        assert statement is not None
        assert statement.verb_id == generator.VERB_SEEKED
        assert statement.verb_display == {"en-US": "seeked"}
        assert statement.result_json["extensions"]["http://id.tincanapi.com/extension/position"] == 300
    
    def test_generate_video_interaction_completed(self, generator, student, lesson):
        """Test generating a video completed statement"""
        statement = generator.generate_video_interaction(
            student, lesson, 'completed', duration="PT5M30S"
        )
        
        assert statement is not None
        assert statement.verb_id == generator.VERB_COMPLETED
        assert statement.verb_display == {"en-US": "completed"}
        assert statement.result_completion is True
        assert statement.result_duration == "PT5M30S"
    
    def test_generate_video_interaction_invalid_action(self, generator, student, lesson):
        """Test that invalid video action raises ValueError"""
        with pytest.raises(ValueError, match="Invalid video action"):
            generator.generate_video_interaction(student, lesson, 'invalid_action')
    
    def test_statement_has_unique_id(self, generator, student, lesson):
        """Test that each statement gets a unique UUID"""
        statement1 = generator.generate_lesson_completed(student, lesson)
        statement2 = generator.generate_lesson_completed(student, lesson)
        
        assert statement1.statement_id != statement2.statement_id
    
    def test_statement_has_timestamp(self, generator, student, lesson):
        """Test that statements have timestamps"""
        before = timezone.now()
        statement = generator.generate_lesson_completed(student, lesson)
        after = timezone.now()
        
        assert statement.timestamp is not None
        assert before <= statement.timestamp <= after
        assert statement.stored is not None
    
    def test_actor_with_no_email(self, generator, instructor, lesson):
        """Test generating statement for user without email"""
        instructor.email = ""
        instructor.save()
        
        statement = generator.generate_lesson_completed(instructor, lesson)
        
        assert statement is not None
        assert statement.actor_mbox is None
        assert statement.actor_account_name == str(instructor.id)
    
    def test_quiz_score_calculation(self, generator, student, quiz):
        """Test that scaled score is calculated correctly"""
        # Test various score combinations
        test_cases = [
            (100, 100, 1.0),
            (50, 100, 0.5),
            (0, 100, 0.0),
            (75, 150, 0.5),
        ]
        
        for score, max_score, expected_scaled in test_cases:
            statement = generator.generate_quiz_passed(student, quiz, score, max_score)
            assert float(statement.result_score_scaled) == expected_scaled
    
    def test_context_includes_parent_course(self, generator, student, lesson):
        """Test that lesson statements include course as parent in context"""
        statement = generator.generate_lesson_completed(student, lesson)
        
        assert "contextActivities" in statement.context_json
        assert "parent" in statement.context_json["contextActivities"]
        parent = statement.context_json["contextActivities"]["parent"][0]
        assert lesson.course.title in parent["definition"]["name"]["en-US"]
    
    def test_video_context_includes_lesson_and_course(self, generator, student, lesson):
        """Test that video statements include both lesson and course in context"""
        statement = generator.generate_video_interaction(student, lesson, 'played')
        
        assert "contextActivities" in statement.context_json
        assert "parent" in statement.context_json["contextActivities"]
        assert "grouping" in statement.context_json["contextActivities"]
        
        parent = statement.context_json["contextActivities"]["parent"][0]
        assert lesson.title in parent["definition"]["name"]["en-US"]
        
        grouping = statement.context_json["contextActivities"]["grouping"][0]
        assert lesson.course.title in grouping["definition"]["name"]["en-US"]
