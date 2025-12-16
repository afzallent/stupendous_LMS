"""
Tests for HTML Embed API endpoints.

Requirements: 13.1, 13.2, 13.4, 13.5
"""
import pytest
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User
from courses.models import Course, Lesson, Enrollment
from courses.content_models import HTMLEmbed
from courses.html_embed_manager import HTMLEmbedManager


class TestHTMLEmbedManager(TestCase):
    """Tests for HTMLEmbedManager class."""
    
    def setUp(self):
        self.manager = HTMLEmbedManager()
    
    def test_sanitize_html_removes_script_tags(self):
        """Test that script tags are removed from HTML."""
        html = '<div>Hello</div><script>alert("xss")</script><p>World</p>'
        sanitized = self.manager.sanitize_html(html)
        
        assert '<script>' not in sanitized
        assert 'alert' not in sanitized
        assert '<div>Hello</div>' in sanitized
        assert '<p>World</p>' in sanitized
    
    def test_sanitize_html_removes_onclick_handlers(self):
        """Test that onclick handlers are removed."""
        html = '<div onclick="alert(\'xss\')">Click me</div>'
        sanitized = self.manager.sanitize_html(html)
        
        assert 'onclick' not in sanitized
        assert '<div' in sanitized
        assert 'Click me' in sanitized
    
    def test_sanitize_html_removes_javascript_urls(self):
        """Test that javascript: URLs are removed."""
        html = '<a href="javascript:alert(\'xss\')">Click</a>'
        sanitized = self.manager.sanitize_html(html)
        
        assert 'javascript:' not in sanitized
    
    def test_sanitize_html_removes_iframe_tags(self):
        """Test that iframe tags are removed."""
        html = '<div>Content</div><iframe src="http://evil.com"></iframe>'
        sanitized = self.manager.sanitize_html(html)
        
        assert '<iframe' not in sanitized
        assert '<div>Content</div>' in sanitized
    
    def test_sanitize_html_preserves_safe_content(self):
        """Test that safe HTML content is preserved."""
        html = '<div class="container"><h1>Title</h1><p>Paragraph</p></div>'
        sanitized = self.manager.sanitize_html(html)
        
        assert '<div class="container">' in sanitized
        assert '<h1>Title</h1>' in sanitized
        assert '<p>Paragraph</p>' in sanitized
    
    def test_validate_allowed_origins_valid(self):
        """Test validation of valid origins."""
        origins = ['https://example.com', 'https://trusted.org']
        result = self.manager.validate_allowed_origins(origins)
        
        assert result.is_valid
        assert len(result.errors) == 0
    
    def test_validate_allowed_origins_invalid_no_scheme(self):
        """Test validation rejects origins without scheme."""
        origins = ['example.com']
        result = self.manager.validate_allowed_origins(origins)
        
        assert not result.is_valid
        assert any('scheme' in e.lower() for e in result.errors)
    
    def test_validate_allowed_origins_empty_list(self):
        """Test validation accepts empty list."""
        result = self.manager.validate_allowed_origins([])
        
        assert result.is_valid
    
    def test_validate_xapi_message_valid(self):
        """Test validation of valid xAPI message."""
        # Create a mock embed with xAPI enabled
        class MockEmbed:
            enable_xapi_messaging = True
            allowed_origins = ['https://example.com']
            def is_origin_allowed(self, origin):
                return origin in self.allowed_origins
        
        embed = MockEmbed()
        message = {
            'statement': {
                'actor': {'mbox': 'mailto:test@example.com'},
                'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed'},
                'object': {'id': 'http://example.com/activity/1'}
            },
            'origin': 'https://example.com'
        }
        
        result = self.manager.validate_xapi_message(message, embed)
        
        assert result.is_valid
    
    def test_validate_xapi_message_disabled(self):
        """Test validation fails when xAPI messaging is disabled."""
        class MockEmbed:
            enable_xapi_messaging = False
            allowed_origins = []
        
        embed = MockEmbed()
        message = {'statement': {}}
        
        result = self.manager.validate_xapi_message(message, embed)
        
        assert not result.is_valid
        assert any('not enabled' in e for e in result.errors)
    
    def test_validate_xapi_message_invalid_origin(self):
        """Test validation fails for unauthorized origin."""
        class MockEmbed:
            enable_xapi_messaging = True
            allowed_origins = ['https://trusted.com']
            def is_origin_allowed(self, origin):
                return origin in self.allowed_origins
        
        embed = MockEmbed()
        message = {
            'statement': {
                'actor': {},
                'verb': {},
                'object': {}
            },
            'origin': 'https://evil.com'
        }
        
        result = self.manager.validate_xapi_message(message, embed)
        
        assert not result.is_valid
        assert any('not in the allowed origins' in e for e in result.errors)
    
    def test_validate_xapi_message_missing_statement(self):
        """Test validation fails when statement is missing."""
        class MockEmbed:
            enable_xapi_messaging = True
            allowed_origins = []
        
        embed = MockEmbed()
        message = {'origin': 'https://example.com'}
        
        result = self.manager.validate_xapi_message(message, embed)
        
        assert not result.is_valid
        assert any('does not contain a statement' in e for e in result.errors)


@pytest.mark.django_db
class TestHTMLEmbedAPIEndpoints(TestCase):
    """Tests for HTML Embed API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create instructor user
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@example.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create student user
        self.student = User.objects.create_user(
            username='student',
            email='student@example.com',
            password='testpass123',
            is_student=True
        )
        
        # Create course and lesson
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor
        )
        
        self.lesson = Lesson.objects.create(
            course=self.course,
            title='Test Lesson',
            content='Test Lesson Content',
            order=1
        )
        
        # Enroll student
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
    
    def test_create_html_embed_as_instructor(self):
        """Test creating HTML embed as instructor."""
        self.client.force_authenticate(user=self.instructor)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        data = {
            'embed_type': 'url',
            'external_url': 'https://example.com/content',
            'width': '100%',
            'height': '500px',
            'allow_scripts': True,
            'enable_xapi_messaging': True,
            'allowed_origins': ['https://example.com']
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['embed_type'] == 'url'
        assert response.data['external_url'] == 'https://example.com/content'
        assert 'iframe_html' in response.data
        assert 'xapi_listener_script' in response.data
    
    def test_create_html_embed_as_student_forbidden(self):
        """Test that students cannot create HTML embeds."""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        data = {
            'embed_type': 'url',
            'external_url': 'https://example.com/content'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_inline_html_embed(self):
        """Test creating inline HTML embed with sanitization."""
        self.client.force_authenticate(user=self.instructor)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        data = {
            'embed_type': 'inline',
            'inline_html': '<div>Safe content</div><script>alert("xss")</script>',
            'width': '100%',
            'height': '400px'
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        # Script tags should be sanitized
        assert '<script>' not in response.data.get('inline_html', '')
    
    def test_get_html_embed_as_enrolled_student(self):
        """Test getting HTML embed as enrolled student."""
        # First create the embed
        HTMLEmbed.objects.create(
            lesson=self.lesson,
            embed_type='url',
            external_url='https://example.com/content',
            width='100%',
            height='600px'
        )
        
        self.client.force_authenticate(user=self.student)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['embed_type'] == 'url'
        assert 'iframe_html' in response.data
    
    def test_get_html_embed_not_enrolled_forbidden(self):
        """Test that non-enrolled users cannot access HTML embed."""
        # Create another user who is not enrolled
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='testpass123'
        )
        
        HTMLEmbed.objects.create(
            lesson=self.lesson,
            embed_type='url',
            external_url='https://example.com/content'
        )
        
        self.client.force_authenticate(user=other_user)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_html_embed_not_found(self):
        """Test getting HTML embed when none exists."""
        self.client.force_authenticate(user=self.student)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_html_embed_as_instructor(self):
        """Test deleting HTML embed as instructor."""
        HTMLEmbed.objects.create(
            lesson=self.lesson,
            embed_type='url',
            external_url='https://example.com/content'
        )
        
        self.client.force_authenticate(user=self.instructor)
        
        url = reverse('lesson-html-embed', kwargs={'lesson_id': self.lesson.pk})
        response = self.client.delete(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert not HTMLEmbed.objects.filter(lesson=self.lesson).exists()
    
    def test_xapi_endpoint_requires_enrollment(self):
        """Test that xAPI endpoint requires enrollment."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='testpass123'
        )
        
        HTMLEmbed.objects.create(
            lesson=self.lesson,
            embed_type='url',
            external_url='https://example.com/content',
            enable_xapi_messaging=True
        )
        
        self.client.force_authenticate(user=other_user)
        
        url = reverse('lesson-html-embed-xapi', kwargs={'lesson_id': self.lesson.pk})
        data = {
            'statement': {
                'actor': {'mbox': 'mailto:test@example.com'},
                'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed'},
                'object': {'id': 'http://example.com/activity/1'}
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_xapi_endpoint_disabled_messaging(self):
        """Test that xAPI endpoint fails when messaging is disabled."""
        HTMLEmbed.objects.create(
            lesson=self.lesson,
            embed_type='url',
            external_url='https://example.com/content',
            enable_xapi_messaging=False
        )
        
        self.client.force_authenticate(user=self.student)
        
        url = reverse('lesson-html-embed-xapi', kwargs={'lesson_id': self.lesson.pk})
        data = {
            'statement': {
                'actor': {'mbox': 'mailto:test@example.com'},
                'verb': {'id': 'http://adlnet.gov/expapi/verbs/completed'},
                'object': {'id': 'http://example.com/activity/1'}
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'not enabled' in str(response.data)
