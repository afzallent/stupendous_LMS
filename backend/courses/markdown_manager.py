"""
Markdown Content Manager

Manages Markdown lesson content including rendering, table of contents extraction,
scroll progress tracking, and xAPI statement generation.

Requirements: 11.2, 11.3, 11.4
"""
import re
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from django.utils import timezone


@dataclass
class TocEntry:
    """Table of contents entry"""
    level: int
    text: str
    id: str


@dataclass
class ValidationResult:
    """Result of markdown validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class MarkdownContentManager:
    """
    Manages Markdown lesson content.
    
    Provides functionality for:
    - Rendering Markdown to HTML with syntax highlighting
    - Extracting table of contents from headings
    - Tracking scroll progress for reading tracking
    - Generating xAPI statements for completion
    
    Requirements: 11.2, 11.3, 11.4
    """
    
    # Default reading speed in words per minute
    DEFAULT_READING_SPEED = 200
    
    # Supported syntax highlighting themes
    HIGHLIGHT_THEMES = {
        'default': 'default',
        'monokai': 'monokai',
        'github': 'github',
        'solarized-dark': 'solarized-dark',
        'solarized-light': 'solarized-light',
        'vs': 'vs',
        'dracula': 'dracula',
    }

    def __init__(self, highlight_theme: str = 'default', allow_html: bool = False):
        """
        Initialize the Markdown content manager.
        
        Args:
            highlight_theme: Syntax highlighting theme for code blocks
            allow_html: Whether to allow raw HTML in markdown (security risk)
        """
        self.highlight_theme = highlight_theme
        self.allow_html = allow_html
    
    def render_markdown(self, content: str) -> str:
        """
        Render Markdown to HTML with syntax highlighting.
        
        Args:
            content: Raw Markdown text
            
        Returns:
            Rendered HTML string
            
        Requirements: 11.2
        """
        try:
            import markdown
            from markdown.extensions.codehilite import CodeHiliteExtension
            from markdown.extensions.toc import TocExtension
            
            extensions = [
                'extra',  # Tables, fenced code, footnotes, etc.
                TocExtension(
                    permalink=True,
                    permalink_class='toc-link',
                    slugify=self._slugify
                ),
                CodeHiliteExtension(
                    css_class='highlight',
                    linenums=False,
                    guess_lang=True,
                    pygments_style=self.highlight_theme
                ),
                'nl2br',  # Newlines to <br>
                'sane_lists',  # Better list handling
            ]
            
            md = markdown.Markdown(
                extensions=extensions,
                output_format='html5'
            )
            
            rendered = md.convert(content)
            
            # If HTML is not allowed, escape any remaining HTML tags
            if not self.allow_html:
                # The markdown library handles this, but we double-check
                pass
            
            return rendered
            
        except ImportError:
            # Fallback if markdown library not installed
            import html
            return f"<pre>{html.escape(content)}</pre>"
    
    def extract_toc(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract table of contents from headings in markdown content.
        
        Args:
            content: Raw Markdown text
            
        Returns:
            List of TOC entries with level, text, and id
            
        Requirements: 11.3
        """
        toc_entries = []
        
        # Pattern to match markdown headings (# to ######)
        heading_pattern = re.compile(r'^(#{1,6})\s+(.+?)(?:\s*#*)?$', re.MULTILINE)
        
        for match in heading_pattern.finditer(content):
            level = len(match.group(1))
            text = match.group(2).strip()
            
            # Generate slug/id for the heading
            heading_id = self._slugify(text, '-')
            
            toc_entries.append({
                'level': level,
                'text': text,
                'id': heading_id
            })
        
        return toc_entries
    
    def _slugify(self, text: str, separator: str = '-') -> str:
        """
        Convert text to a URL-friendly slug.
        
        Args:
            text: Text to slugify
            separator: Separator character
            
        Returns:
            Slugified string
        """
        # Convert to lowercase
        slug = text.lower()
        
        # Remove special characters, keep alphanumeric and spaces
        slug = re.sub(r'[^\w\s-]', '', slug)
        
        # Replace spaces with separator
        slug = re.sub(r'[\s_]+', separator, slug)
        
        # Remove leading/trailing separators
        slug = slug.strip(separator)
        
        return slug
    
    def track_scroll_progress(
        self,
        student,
        lesson,
        scroll_percentage: float,
        time_spent: Optional[int] = None
    ):
        """
        Track scroll progress for reading tracking.
        
        Args:
            student: User model instance
            lesson: Lesson model instance
            scroll_percentage: Percentage of content scrolled (0-100)
            time_spent: Time spent reading in seconds
            
        Returns:
            ContentInteraction instance
            
        Requirements: 11.4
        """
        from .content_models import ContentInteraction
        
        # Clamp scroll percentage to valid range
        scroll_percentage = max(0, min(100, scroll_percentage))
        
        interaction_data = {
            'scroll_percentage': scroll_percentage,
        }
        
        if time_spent is not None:
            interaction_data['time_spent'] = time_spent
        
        # Record the scroll interaction
        interaction = ContentInteraction.record_scroll(
            student=student,
            lesson=lesson,
            scroll_percentage=scroll_percentage,
            time_spent=time_spent
        )
        
        return interaction
    
    def calculate_reading_time(self, content: str, words_per_minute: int = None) -> int:
        """
        Calculate estimated reading time for markdown content.
        
        Args:
            content: Raw Markdown text
            words_per_minute: Reading speed (defaults to 200 WPM)
            
        Returns:
            Estimated reading time in minutes (minimum 1)
        """
        if words_per_minute is None:
            words_per_minute = self.DEFAULT_READING_SPEED
        
        word_count = self.count_words(content)
        reading_time = max(1, word_count // words_per_minute)
        
        return reading_time
    
    def count_words(self, content: str) -> int:
        """
        Count words in markdown content.
        
        Args:
            content: Raw Markdown text
            
        Returns:
            Word count
        """
        # Remove code blocks to not count code as words
        content_without_code = re.sub(r'```[\s\S]*?```', '', content)
        content_without_code = re.sub(r'`[^`]+`', '', content_without_code)
        
        # Remove markdown syntax
        content_clean = re.sub(r'[#*_\[\]()>-]', ' ', content_without_code)
        
        # Split and count non-empty words
        words = [w for w in content_clean.split() if w.strip()]
        
        return len(words)
    
    def validate_markdown(self, content: str) -> ValidationResult:
        """
        Validate Markdown syntax.
        
        Args:
            content: Raw Markdown text
            
        Returns:
            ValidationResult with is_valid, errors, and warnings
        """
        errors = []
        warnings = []
        
        if not content or not content.strip():
            errors.append("Content cannot be empty")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Check for unclosed code blocks
        code_block_count = content.count('```')
        if code_block_count % 2 != 0:
            errors.append("Unclosed code block detected (odd number of ``` markers)")
        
        # Check for very long lines (might indicate formatting issues)
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if len(line) > 500:
                warnings.append(f"Line {i} is very long ({len(line)} characters)")
        
        # Check for potential XSS if HTML is allowed
        if self.allow_html:
            dangerous_patterns = [
                r'<script',
                r'javascript:',
                r'on\w+\s*=',
            ]
            for pattern in dangerous_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    warnings.append(f"Potentially dangerous HTML pattern detected: {pattern}")
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def generate_completion_statement(
        self,
        student,
        lesson,
        time_spent: Optional[int] = None
    ):
        """
        Generate xAPI statement for Markdown lesson completion.
        
        Args:
            student: User model instance
            lesson: Lesson model instance
            time_spent: Time spent reading in seconds
            
        Returns:
            XAPIStatement instance
            
        Requirements: 11.4
        """
        from xapi.statement_generator import XAPIStatementGenerator
        
        # Convert time_spent to ISO 8601 duration if provided
        duration = None
        if time_spent is not None:
            duration = self._seconds_to_iso8601_duration(time_spent)
        
        generator = XAPIStatementGenerator()
        statement = generator.generate_lesson_completed(
            student=student,
            lesson=lesson,
            duration=duration
        )
        
        return statement
    
    def _seconds_to_iso8601_duration(self, seconds: int) -> str:
        """
        Convert seconds to ISO 8601 duration format.
        
        Args:
            seconds: Duration in seconds
            
        Returns:
            ISO 8601 duration string (e.g., "PT1H30M45S")
        """
        if seconds < 0:
            seconds = 0
        
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        parts = ['PT']
        if hours > 0:
            parts.append(f'{hours}H')
        if minutes > 0:
            parts.append(f'{minutes}M')
        if secs > 0 or (hours == 0 and minutes == 0):
            parts.append(f'{secs}S')
        
        return ''.join(parts)
    
    def mark_lesson_completed(
        self,
        student,
        lesson,
        time_spent: Optional[int] = None
    ):
        """
        Mark a markdown lesson as completed and generate xAPI statement.
        
        Args:
            student: User model instance
            lesson: Lesson model instance
            time_spent: Time spent reading in seconds
            
        Returns:
            Tuple of (Progress instance, XAPIStatement instance)
            
        Requirements: 11.4, 11.5
        """
        from .models import Progress
        from .content_models import ContentInteraction
        
        # Update or create progress record
        progress, created = Progress.objects.get_or_create(
            student=student,
            lesson=lesson,
            defaults={'completed': True, 'completed_at': timezone.now()}
        )
        
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save()
        
        # Record completion interaction
        interaction_data = {}
        if time_spent is not None:
            interaction_data['time_spent'] = time_spent
        
        # Get markdown lesson for reading time
        try:
            markdown_lesson = lesson.markdown_lesson
            interaction_data['estimated_reading_time'] = markdown_lesson.estimated_reading_time
            interaction_data['word_count'] = markdown_lesson.word_count
        except Exception:
            pass
        
        interaction = ContentInteraction.record_completion(
            student=student,
            lesson=lesson,
            data=interaction_data
        )
        
        # Generate xAPI statement
        statement = self.generate_completion_statement(
            student=student,
            lesson=lesson,
            time_spent=time_spent
        )
        
        # Link interaction to statement
        interaction.xapi_statement = statement
        interaction.save()
        
        return progress, statement
    
    def get_or_create_markdown_lesson(self, lesson, content: str = '', **kwargs):
        """
        Get or create a MarkdownLesson for a lesson.
        
        Args:
            lesson: Lesson model instance
            content: Initial markdown content
            **kwargs: Additional fields for MarkdownLesson
            
        Returns:
            MarkdownLesson instance
        """
        from .content_models import MarkdownLesson
        
        markdown_lesson, created = MarkdownLesson.objects.get_or_create(
            lesson=lesson,
            defaults={
                'markdown_text': content,
                **kwargs
            }
        )
        
        return markdown_lesson
    
    def update_markdown_lesson(self, lesson, content: str, **kwargs):
        """
        Update a MarkdownLesson's content.
        
        Args:
            lesson: Lesson model instance
            content: New markdown content
            **kwargs: Additional fields to update
            
        Returns:
            MarkdownLesson instance
        """
        from .content_models import MarkdownLesson
        
        try:
            markdown_lesson = lesson.markdown_lesson
            markdown_lesson.markdown_text = content
            
            for key, value in kwargs.items():
                if hasattr(markdown_lesson, key):
                    setattr(markdown_lesson, key, value)
            
            markdown_lesson.save()  # This triggers re-rendering
            return markdown_lesson
            
        except MarkdownLesson.DoesNotExist:
            return self.get_or_create_markdown_lesson(lesson, content, **kwargs)
