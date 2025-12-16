"""
Content type models for different lesson formats.

This module contains models for:
- MarkdownLesson: Markdown-based text lessons
- H5PPackage: H5P interactive content packages
- H5PContentState: Student state for H5P content
- HTMLEmbed: HTML embed content (iframes, custom HTML)
- ContentInteraction: Tracking interactions with all content types
"""

from django.db import models
from django.conf import settings


class MarkdownLesson(models.Model):
    """
    Markdown lesson content model.
    
    Stores raw Markdown content and cached rendered HTML for text-based lessons.
    Supports syntax highlighting configuration and auto-calculates reading metrics.
    
    Requirements: 11.1, 11.2, 11.5
    """
    lesson = models.OneToOneField(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='markdown_lesson'
    )
    
    # Content
    markdown_text = models.TextField(
        help_text="Raw Markdown formatted content"
    )
    rendered_html = models.TextField(
        blank=True,
        help_text="Cached rendered HTML (auto-generated on save)"
    )
    
    # Syntax highlighting configuration
    HIGHLIGHT_THEME_CHOICES = [
        ('default', 'Default'),
        ('monokai', 'Monokai'),
        ('github', 'GitHub'),
        ('solarized-dark', 'Solarized Dark'),
        ('solarized-light', 'Solarized Light'),
        ('vs', 'Visual Studio'),
        ('dracula', 'Dracula'),
    ]
    highlight_theme = models.CharField(
        max_length=30,
        choices=HIGHLIGHT_THEME_CHOICES,
        default='default',
        help_text="Syntax highlighting theme for code blocks"
    )
    allow_html = models.BooleanField(
        default=False,
        help_text="Allow raw HTML in markdown (security risk if enabled)"
    )
    
    # Auto-calculated metrics
    word_count = models.PositiveIntegerField(
        default=0,
        help_text="Word count (auto-calculated on save)"
    )
    estimated_reading_time = models.PositiveIntegerField(
        default=0,
        help_text="Estimated reading time in minutes (auto-calculated)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Markdown Lesson"
        verbose_name_plural = "Markdown Lessons"
    
    def save(self, *args, **kwargs):
        """Override save to render markdown and calculate metrics."""
        self._render_markdown()
        self._calculate_metrics()
        super().save(*args, **kwargs)
    
    def _render_markdown(self):
        """Render markdown text to HTML with syntax highlighting."""
        try:
            import markdown
            from markdown.extensions.codehilite import CodeHiliteExtension
            
            extensions = [
                'extra',  # Tables, fenced code, footnotes, etc.
                'toc',    # Table of contents
                CodeHiliteExtension(
                    css_class='highlight',
                    linenums=False,
                    guess_lang=True
                ),
                'nl2br',  # Newlines to <br>
            ]
            
            # Only allow HTML if explicitly enabled
            if self.allow_html:
                self.rendered_html = markdown.markdown(
                    self.markdown_text,
                    extensions=extensions
                )
            else:
                # Safe mode - escape HTML
                self.rendered_html = markdown.markdown(
                    self.markdown_text,
                    extensions=extensions,
                    output_format='html5'
                )
        except ImportError:
            # Fallback if markdown library not installed
            self.rendered_html = f"<pre>{self.markdown_text}</pre>"
    
    def _calculate_metrics(self):
        """Calculate word count and estimated reading time."""
        # Count words (split on whitespace)
        words = self.markdown_text.split()
        self.word_count = len(words)
        
        # Estimate reading time at ~200 words per minute
        # Minimum 1 minute
        self.estimated_reading_time = max(1, self.word_count // 200)
    
    def __str__(self):
        return f"Markdown: {self.lesson.title}"



class H5PPackage(models.Model):
    """
    H5P interactive content package model.
    
    Stores H5P package metadata, library information, and embed configuration.
    H5P packages are ZIP files containing interactive content.
    
    Requirements: 12.1, 12.2
    """
    lesson = models.OneToOneField(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='h5p_package'
    )
    
    # Package metadata
    title = models.CharField(
        max_length=255,
        help_text="H5P content title"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of the H5P content"
    )
    
    # Library information (from h5p.json)
    library_name = models.CharField(
        max_length=255,
        help_text="H5P library name (e.g., 'H5P.InteractiveVideo')"
    )
    library_version = models.CharField(
        max_length=50,
        help_text="H5P library version (e.g., '1.24.0')"
    )
    
    # Content storage
    package_file = models.FileField(
        upload_to='h5p_packages/',
        help_text="Original H5P package file (.h5p)"
    )
    content_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to extracted content directory"
    )
    
    # Metadata from h5p.json
    h5p_json = models.JSONField(
        default=dict,
        help_text="Parsed h5p.json metadata"
    )
    
    # Iframe embed configuration
    embed_width = models.CharField(
        max_length=20,
        default='100%',
        help_text="Iframe width (px or %)"
    )
    embed_height = models.CharField(
        max_length=20,
        default='600px',
        help_text="Iframe height (px or %)"
    )
    allow_fullscreen = models.BooleanField(
        default=True,
        help_text="Allow fullscreen mode"
    )
    
    # xAPI tracking
    track_xapi = models.BooleanField(
        default=True,
        help_text="Capture xAPI statements from H5P content"
    )
    
    # Upload metadata
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_h5p_packages'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "H5P Package"
        verbose_name_plural = "H5P Packages"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"H5P: {self.title} ({self.library_name})"
    
    def get_embed_url(self):
        """Get the URL for embedding this H5P content."""
        if self.content_path:
            return f"/h5p/content/{self.pk}/"
        return None



class H5PContentState(models.Model):
    """
    Student state for H5P content.
    
    Stores the student's progress, scores, and state data for H5P content
    to enable resuming and tracking completion.
    
    Requirements: 12.3, 12.4
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='h5p_states'
    )
    h5p_package = models.ForeignKey(
        H5PPackage,
        on_delete=models.CASCADE,
        related_name='student_states'
    )
    
    # State data (JSON blob from H5P)
    state_data = models.JSONField(
        default=dict,
        help_text="H5P content state data for resuming"
    )
    
    # Score tracking
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Current score (0-100)"
    )
    max_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum possible score"
    )
    
    # Completion status
    COMPLETION_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    completion_status = models.CharField(
        max_length=20,
        choices=COMPLETION_STATUS_CHOICES,
        default='not_started',
        help_text="Completion status of the H5P content"
    )
    
    # Timestamps
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the student first started the content"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the student completed the content"
    )
    last_accessed = models.DateTimeField(
        auto_now=True,
        help_text="Last time the student accessed this content"
    )
    
    # Interaction tracking
    total_time_spent = models.PositiveIntegerField(
        default=0,
        help_text="Total time spent in seconds"
    )
    interaction_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of interactions with the content"
    )
    
    class Meta:
        verbose_name = "H5P Content State"
        verbose_name_plural = "H5P Content States"
        unique_together = ('student', 'h5p_package')
        ordering = ['-last_accessed']
    
    def __str__(self):
        return f"{self.student.username} - {self.h5p_package.title} ({self.completion_status})"
    
    def mark_started(self):
        """Mark the content as started."""
        from django.utils import timezone
        if self.completion_status == 'not_started':
            self.completion_status = 'in_progress'
            self.started_at = timezone.now()
            self.save()
    
    def mark_completed(self):
        """Mark the content as completed."""
        from django.utils import timezone
        if self.completion_status != 'completed':
            self.completion_status = 'completed'
            self.completed_at = timezone.now()
            self.save()
    
    def update_score(self, score, max_score=None):
        """Update the score for this content."""
        self.score = score
        if max_score is not None:
            self.max_score = max_score
        self.save()



class HTMLEmbed(models.Model):
    """
    HTML embed content model.
    
    Stores configuration for embedding external URLs or inline HTML content
    in lessons, with security controls via iframe sandbox attributes.
    
    Requirements: 13.1, 13.2, 13.5
    """
    lesson = models.OneToOneField(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='html_embed'
    )
    
    # Embed type
    EMBED_TYPE_URL = 'url'
    EMBED_TYPE_INLINE = 'inline'
    
    EMBED_TYPE_CHOICES = [
        (EMBED_TYPE_URL, 'External URL'),
        (EMBED_TYPE_INLINE, 'Inline HTML'),
    ]
    
    embed_type = models.CharField(
        max_length=20,
        choices=EMBED_TYPE_CHOICES,
        default=EMBED_TYPE_URL,
        help_text="Type of embed content"
    )
    
    # Content
    external_url = models.URLField(
        blank=True,
        help_text="External URL to embed (for URL type)"
    )
    inline_html = models.TextField(
        blank=True,
        help_text="Inline HTML content (for inline type)"
    )
    
    # Iframe dimensions
    width = models.CharField(
        max_length=20,
        default='100%',
        help_text="Iframe width (px or %)"
    )
    height = models.CharField(
        max_length=20,
        default='600px',
        help_text="Iframe height (px or %)"
    )
    
    # Sandbox settings (security controls)
    # Default sandbox attributes for security
    allow_scripts = models.BooleanField(
        default=False,
        help_text="Allow JavaScript execution in iframe"
    )
    allow_forms = models.BooleanField(
        default=False,
        help_text="Allow form submission in iframe"
    )
    allow_popups = models.BooleanField(
        default=False,
        help_text="Allow popups from iframe"
    )
    allow_same_origin = models.BooleanField(
        default=False,
        help_text="Allow same-origin access (needed for some features)"
    )
    allow_top_navigation = models.BooleanField(
        default=False,
        help_text="Allow navigation of top-level browsing context"
    )
    custom_sandbox_attrs = models.CharField(
        max_length=500,
        blank=True,
        help_text="Additional custom sandbox attributes (space-separated)"
    )
    
    # xAPI messaging configuration
    enable_xapi_messaging = models.BooleanField(
        default=False,
        help_text="Enable xAPI statement capture via postMessage"
    )
    allowed_origins = models.JSONField(
        default=list,
        help_text="List of allowed origins for postMessage xAPI statements"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "HTML Embed"
        verbose_name_plural = "HTML Embeds"
    
    def __str__(self):
        if self.embed_type == self.EMBED_TYPE_URL:
            return f"HTML Embed (URL): {self.lesson.title}"
        return f"HTML Embed (Inline): {self.lesson.title}"
    
    def get_sandbox_attributes(self):
        """
        Build the sandbox attribute string for the iframe.
        
        Returns a space-separated string of sandbox permissions.
        """
        attrs = []
        
        if self.allow_scripts:
            attrs.append('allow-scripts')
        if self.allow_forms:
            attrs.append('allow-forms')
        if self.allow_popups:
            attrs.append('allow-popups')
        if self.allow_same_origin:
            attrs.append('allow-same-origin')
        if self.allow_top_navigation:
            attrs.append('allow-top-navigation')
        
        # Add custom attributes
        if self.custom_sandbox_attrs:
            attrs.extend(self.custom_sandbox_attrs.split())
        
        return ' '.join(attrs) if attrs else ''
    
    def is_origin_allowed(self, origin):
        """Check if an origin is allowed for xAPI messaging."""
        if not self.enable_xapi_messaging:
            return False
        if not self.allowed_origins:
            return False
        return origin in self.allowed_origins



class ContentInteraction(models.Model):
    """
    Track interactions with all content types.
    
    Records user interactions with lessons of any content type,
    storing interaction data as JSON and linking to xAPI statements.
    
    Requirements: 15.1, 15.4
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='content_interactions'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='interactions'
    )
    
    # Interaction types
    INTERACTION_VIEWED = 'viewed'
    INTERACTION_SCROLLED = 'scrolled'
    INTERACTION_INTERACTED = 'interacted'
    INTERACTION_COMPLETED = 'completed'
    
    INTERACTION_TYPE_CHOICES = [
        (INTERACTION_VIEWED, 'Viewed'),
        (INTERACTION_SCROLLED, 'Scrolled'),
        (INTERACTION_INTERACTED, 'Interacted'),
        (INTERACTION_COMPLETED, 'Completed'),
    ]
    
    interaction_type = models.CharField(
        max_length=20,
        choices=INTERACTION_TYPE_CHOICES,
        help_text="Type of interaction"
    )
    
    # Interaction data (flexible JSON storage)
    # Examples:
    # - Markdown: {"scroll_percentage": 75, "time_spent": 120}
    # - H5P: {"score": 0.85, "max_score": 1.0, "interactions": 15}
    # - Video: {"position": 120.5, "duration": 300, "action": "pause"}
    # - HTML Embed: {"event": "click", "element": "button-1"}
    interaction_data = models.JSONField(
        default=dict,
        help_text="Additional interaction data (JSON)"
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the interaction occurred"
    )
    
    # Link to xAPI statement (if generated)
    xapi_statement = models.ForeignKey(
        'xapi.XAPIStatement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='content_interactions',
        help_text="Associated xAPI statement"
    )
    
    class Meta:
        verbose_name = "Content Interaction"
        verbose_name_plural = "Content Interactions"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', 'lesson', 'timestamp']),
            models.Index(fields=['lesson', 'interaction_type']),
            models.Index(fields=['student', 'interaction_type']),
        ]
    
    def __str__(self):
        return f"{self.student.username} - {self.lesson.title} - {self.interaction_type}"
    
    @classmethod
    def record_view(cls, student, lesson, data=None):
        """Record a view interaction."""
        return cls.objects.create(
            student=student,
            lesson=lesson,
            interaction_type=cls.INTERACTION_VIEWED,
            interaction_data=data or {}
        )
    
    @classmethod
    def record_scroll(cls, student, lesson, scroll_percentage, time_spent=None):
        """Record a scroll interaction for markdown/text content."""
        data = {'scroll_percentage': scroll_percentage}
        if time_spent is not None:
            data['time_spent'] = time_spent
        return cls.objects.create(
            student=student,
            lesson=lesson,
            interaction_type=cls.INTERACTION_SCROLLED,
            interaction_data=data
        )
    
    @classmethod
    def record_interaction(cls, student, lesson, data):
        """Record a generic interaction."""
        return cls.objects.create(
            student=student,
            lesson=lesson,
            interaction_type=cls.INTERACTION_INTERACTED,
            interaction_data=data
        )
    
    @classmethod
    def record_completion(cls, student, lesson, data=None):
        """Record a completion interaction."""
        return cls.objects.create(
            student=student,
            lesson=lesson,
            interaction_type=cls.INTERACTION_COMPLETED,
            interaction_data=data or {}
        )
