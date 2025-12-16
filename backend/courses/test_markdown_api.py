"""
Tests for Markdown content API endpoints.

Requirements: 11.1, 11.2, 11.4, 11.5
"""
import pytest
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse

from courses.models import Course, Lesson, Enrollment, Progress
from courses.content_models import MarkdownLesson, ContentInteraction
from courses.markdown_manager import MarkdownContentManager

User = get_user_model()


class TestMarkdownContentManager(TestCase):
    """Tests for MarkdownContentManager class."""
    
    def setUp(self):
        self.manager = MarkdownContentManager()
    
    def test_render_markdown_basic(self):
        """Test basic markdown rendering."""
        content = "# Hello\n\nThis is **bold** text."
        html = self.manager.render_markdown(content)
        
        self.assertIn('<h1', html)
        self.assertIn('Hello', html)
        self.assertIn('<strong>bold</strong>', html)
    
    def test_render_markdown_code_block(self):
        """Test code block rendering with syntax highlighting."""
        content = "```python\ndef hello():\n    print('Hello')\n```"
        html = self.manager.render_markdown(content)
        
        self.assertIn('highlight', html)
    
    def test_extract_toc(self):
        """Test table of contents extraction."""
        content = "# Heading 1\n\n## Heading 2\n\n### Heading 3"
        toc = self.manager.extract_toc(content)
        
        self.assertEqual(len(toc), 3)
        self.assertEqual(toc[0]['level'], 1)
        self.assertEqual(toc[0]['text'], 'Heading 1')
        self.assertEqual(toc[1]['level'], 2)
        self.assertEqual(toc[2]['level'], 3)
    
    def test_count_words(self):
        """Test word counting."""
        content = "This is a test with five words."
        word_count = self.manager.count_words(content)
        
        # Should count actual words, not markdown syntax
        self.assertGreater(word_count, 0)
    
    def test_calculate_reading_time(self):
        """Test reading time calculation."""
        # 200 words should be 1 minute
        content = " ".join(["word"] * 200)
        reading_time = self.manager.calculate_reading_time(content)
        
        self.assertEqual(reading_time, 1)
        
        # 400 words should be 2 minutes
        content = " ".join(["word"] * 400)
        reading_time = self.manager.calculate_reading_time(content)
        
        self.assertEqual(reading_time, 2)
    
    def test_validate_markdown_valid(self):
        """Test validation of valid markdown."""
        content = "# Valid Markdown\n\nSome content here."
        result = self.manager.validate_markdown(content)
        
        self.assertTrue(result.is_valid)
        self.assertEqual(len(result.errors), 0)
    
    def test_validate_markdown_empty(self):
        """Test validation of empty content."""
        result = self.manager.validate_markdown("")
        
        self.assertFalse(result.is_valid)
        self.assertGreater(len(result.errors), 0)
    
    def test_validate_markdown_unclosed_code_block(self):
        """Test validation detects unclosed code blocks."""
        content = "# Test\n\n```python\ncode here"
        result = self.manager.validate_markdown(content)
        
        self.assertFalse(result.is_valid)
    
    def test_seconds_to_iso8601_duration(self):
        """Test ISO 8601 duration conversion."""
        # 0 seconds
        self.assertEqual(self.manager._seconds_to_iso8601_duration(0), 'PT0S')
        
        # 30 seconds
        self.assertEqual(self.manager._seconds_to_iso8601_duration(30), 'PT30S')
        
        # 2 minutes
        self.assertEqual(self.manager._seconds_to_iso8601_duration(120), 'PT2M')
        
        # 1 hour 30 minutes 45 seconds
        self.assertEqual(self.manager._seconds_to_iso8601_duration(5445), 'PT1H30M45S')


class TestMarkdownAPIEndpoints(TestCase):
    """Tests for Markdown API endpoints."""
    
    def setUp(self):
        from rest_framework.test import APIClient
        
        self.client = APIClient()
        
        # Create test users
        self.instructor = User.objects.create_user(
            username='md_instructor',
            password='test123',
            is_instructor=True,
            email='md_instructor@test.com'
        )
        self.student = User.objects.create_user(
            username='md_student',
            password='test123',
            is_student=True,
            email='md_student@test.com'
        )
        
        # Create test course and lesson
        self.course = Course.objects.create(
            title='Markdown Test Course',
            description='Test course for markdown',
            instructor=self.instructor
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Markdown Test Lesson',
            content_type=Lesson.CONTENT_TYPE_MARKDOWN,
            order=1
        )
        
        # Create enrollment
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
    
    def test_create_markdown_content_as_instructor(self):
        """Test creating markdown content as instructor."""
        self.client.force_authenticate(user=self.instructor)
        
        response = self.client.post(
            f'/api/lessons/{self.lesson.id}/markdown/',
            data={'content': '# Test Lesson\n\nThis is test content.'},
            format='json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('rendered_html', data)
        self.assertIn('word_count', data)
        self.assertIn('estimated_reading_time', data)
    
    def test_create_markdown_content_as_student_forbidden(self):
        """Test that students cannot create markdown content."""
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            f'/api/lessons/{self.lesson.id}/markdown/',
            data={'content': '# Test'},
            format='json'
        )
        
        self.assertEqual(response.status_code, 403)
    
    def test_get_markdown_content_as_enrolled_student(self):
        """Test getting markdown content as enrolled student."""
        # First create the content
        MarkdownLesson.objects.create(
            lesson=self.lesson,
            markdown_text='# Test\n\nContent here.'
        )
        
        self.client.force_authenticate(user=self.student)
        
        response = self.client.get(f'/api/lessons/{self.lesson.id}/markdown/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('content', data)
        self.assertIn('rendered_html', data)
        self.assertIn('toc', data)
    
    def test_get_markdown_content_not_enrolled_forbidden(self):
        """Test that non-enrolled users cannot get content."""
        # Create another student not enrolled
        other_student = User.objects.create_user(
            username='other_student',
            password='test123',
            is_student=True
        )
        
        MarkdownLesson.objects.create(
            lesson=self.lesson,
            markdown_text='# Test'
        )
        
        self.client.force_authenticate(user=other_student)
        
        response = self.client.get(f'/api/lessons/{self.lesson.id}/markdown/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_track_scroll_progress(self):
        """Test tracking scroll progress."""
        MarkdownLesson.objects.create(
            lesson=self.lesson,
            markdown_text='# Test'
        )
        
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            f'/api/lessons/{self.lesson.id}/markdown/track/',
            data={'scroll_percentage': 50, 'time_spent': 30},
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify interaction was recorded
        interaction = ContentInteraction.objects.filter(
            student=self.student,
            lesson=self.lesson,
            interaction_type=ContentInteraction.INTERACTION_SCROLLED
        ).first()
        self.assertIsNotNone(interaction)
        self.assertEqual(interaction.interaction_data['scroll_percentage'], 50)
    
    def test_mark_lesson_complete(self):
        """Test marking lesson as complete."""
        MarkdownLesson.objects.create(
            lesson=self.lesson,
            markdown_text='# Test'
        )
        
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            f'/api/lessons/{self.lesson.id}/markdown/complete/',
            data={'time_spent': 120},
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('xapi_statement_id', data)
        
        # Verify progress was updated
        progress = Progress.objects.get(student=self.student, lesson=self.lesson)
        self.assertTrue(progress.completed)
    
    def test_mark_lesson_complete_generates_xapi_statement(self):
        """Test that completing a lesson generates an xAPI statement."""
        from xapi.models import XAPIStatement
        
        MarkdownLesson.objects.create(
            lesson=self.lesson,
            markdown_text='# Test'
        )
        
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            f'/api/lessons/{self.lesson.id}/markdown/complete/',
            data={'time_spent': 120},
            format='json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify xAPI statement was created
        statement = XAPIStatement.objects.get(statement_id=data['xapi_statement_id'])
        self.assertEqual(statement.verb_id, 'http://adlnet.gov/expapi/verbs/completed')
        self.assertEqual(statement.result_duration, 'PT2M')  # 120 seconds = 2 minutes
