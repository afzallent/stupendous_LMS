"""
Serializers for Markdown content API endpoints.

Requirements: 11.1, 11.2, 11.5
"""
from rest_framework import serializers
from .content_models import MarkdownLesson, ContentInteraction


class MarkdownLessonSerializer(serializers.ModelSerializer):
    """
    Serializer for MarkdownLesson model.
    
    Provides full markdown content with rendered HTML and table of contents.
    """
    toc = serializers.SerializerMethodField()
    
    class Meta:
        model = MarkdownLesson
        fields = [
            'id',
            'lesson',
            'markdown_text',
            'rendered_html',
            'highlight_theme',
            'allow_html',
            'word_count',
            'estimated_reading_time',
            'toc',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'rendered_html',
            'word_count',
            'estimated_reading_time',
            'toc',
            'created_at',
            'updated_at',
        ]
    
    def get_toc(self, obj):
        """Extract table of contents from markdown content."""
        from .markdown_manager import MarkdownContentManager
        
        manager = MarkdownContentManager()
        return manager.extract_toc(obj.markdown_text)


class MarkdownContentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating/updating markdown content.
    
    Requirements: 11.1
    """
    content = serializers.CharField(
        required=True,
        help_text="Raw Markdown content"
    )
    highlight_theme = serializers.ChoiceField(
        choices=[
            ('default', 'Default'),
            ('monokai', 'Monokai'),
            ('github', 'GitHub'),
            ('solarized-dark', 'Solarized Dark'),
            ('solarized-light', 'Solarized Light'),
            ('vs', 'Visual Studio'),
            ('dracula', 'Dracula'),
        ],
        default='default',
        required=False,
        help_text="Syntax highlighting theme"
    )
    allow_html = serializers.BooleanField(
        default=False,
        required=False,
        help_text="Allow raw HTML in markdown (security risk)"
    )
    
    def validate_content(self, value):
        """Validate markdown content."""
        from .markdown_manager import MarkdownContentManager
        
        manager = MarkdownContentManager()
        result = manager.validate_markdown(value)
        
        if not result.is_valid:
            raise serializers.ValidationError(result.errors)
        
        return value


class MarkdownContentResponseSerializer(serializers.Serializer):
    """
    Serializer for markdown content response.
    
    Requirements: 11.2
    """
    id = serializers.IntegerField(read_only=True)
    lesson_id = serializers.IntegerField(read_only=True)
    content = serializers.CharField(
        source='markdown_text',
        read_only=True,
        help_text="Raw Markdown content"
    )
    rendered_html = serializers.CharField(
        read_only=True,
        help_text="Rendered HTML content"
    )
    toc = serializers.SerializerMethodField(
        help_text="Table of contents"
    )
    highlight_theme = serializers.CharField(read_only=True)
    word_count = serializers.IntegerField(read_only=True)
    estimated_reading_time = serializers.IntegerField(
        read_only=True,
        help_text="Estimated reading time in minutes"
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    def get_toc(self, obj):
        """Extract table of contents from markdown content."""
        from .markdown_manager import MarkdownContentManager
        
        manager = MarkdownContentManager()
        return manager.extract_toc(obj.markdown_text)


class MarkdownCompleteSerializer(serializers.Serializer):
    """
    Serializer for marking markdown lesson as complete.
    
    Requirements: 11.5
    """
    time_spent = serializers.IntegerField(
        required=False,
        min_value=0,
        help_text="Time spent reading in seconds"
    )


class MarkdownCompleteResponseSerializer(serializers.Serializer):
    """
    Response serializer for markdown completion.
    """
    success = serializers.BooleanField()
    xapi_statement_id = serializers.UUIDField(
        required=False,
        help_text="ID of the generated xAPI statement"
    )
    progress_id = serializers.IntegerField(
        required=False,
        help_text="ID of the progress record"
    )
    message = serializers.CharField(required=False)


class MarkdownTrackScrollSerializer(serializers.Serializer):
    """
    Serializer for tracking scroll progress.
    
    Requirements: 11.4
    """
    scroll_percentage = serializers.FloatField(
        min_value=0,
        max_value=100,
        help_text="Percentage of content scrolled (0-100)"
    )
    time_spent = serializers.IntegerField(
        required=False,
        min_value=0,
        help_text="Time spent reading in seconds"
    )


class MarkdownTrackScrollResponseSerializer(serializers.Serializer):
    """
    Response serializer for scroll tracking.
    """
    success = serializers.BooleanField()
    interaction_id = serializers.IntegerField(
        required=False,
        help_text="ID of the recorded interaction"
    )
    message = serializers.CharField(required=False)


class ContentInteractionSerializer(serializers.ModelSerializer):
    """
    Serializer for ContentInteraction model.
    """
    class Meta:
        model = ContentInteraction
        fields = [
            'id',
            'student',
            'lesson',
            'interaction_type',
            'interaction_data',
            'timestamp',
            'xapi_statement',
        ]
        read_only_fields = ['id', 'timestamp']
