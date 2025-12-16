"""
Serializers for HTML Embed API endpoints.

Requirements: 13.1, 13.4, 13.5
"""
from rest_framework import serializers
from .content_models import HTMLEmbed


class HTMLEmbedCreateSerializer(serializers.Serializer):
    """
    Serializer for creating/updating HTML embed content.
    
    Requirements: 13.1, 13.5
    """
    embed_type = serializers.ChoiceField(
        choices=[
            (HTMLEmbed.EMBED_TYPE_URL, 'External URL'),
            (HTMLEmbed.EMBED_TYPE_INLINE, 'Inline HTML'),
        ],
        help_text="Type of embed content: 'url' or 'inline'"
    )
    external_url = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text="External URL to embed (required for URL type)"
    )
    inline_html = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Inline HTML content (required for inline type)"
    )
    
    # Dimensions
    width = serializers.CharField(
        required=False,
        default='100%',
        help_text="Iframe width (px or %)"
    )
    height = serializers.CharField(
        required=False,
        default='600px',
        help_text="Iframe height (px or %)"
    )
    
    # Sandbox permissions
    allow_scripts = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Allow JavaScript execution in iframe"
    )
    allow_forms = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Allow form submission in iframe"
    )
    allow_popups = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Allow popups from iframe"
    )
    allow_same_origin = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Allow same-origin access"
    )
    allow_top_navigation = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Allow top-level navigation"
    )
    custom_sandbox_attrs = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text="Additional sandbox attributes (space-separated)"
    )
    
    # xAPI messaging
    enable_xapi_messaging = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Enable xAPI statement capture via postMessage"
    )
    allowed_origins = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="List of allowed origins for postMessage xAPI statements"
    )
    
    def validate(self, data):
        """Validate that required fields are present based on embed_type."""
        embed_type = data.get('embed_type')
        
        if embed_type == HTMLEmbed.EMBED_TYPE_URL:
            if not data.get('external_url'):
                raise serializers.ValidationError({
                    'external_url': 'This field is required for URL embed type.'
                })
        elif embed_type == HTMLEmbed.EMBED_TYPE_INLINE:
            if not data.get('inline_html'):
                raise serializers.ValidationError({
                    'inline_html': 'This field is required for inline embed type.'
                })
        
        return data


class HTMLEmbedResponseSerializer(serializers.Serializer):
    """
    Serializer for HTML embed response data.
    
    Requirements: 13.2
    """
    id = serializers.IntegerField(read_only=True)
    lesson_id = serializers.IntegerField(read_only=True)
    embed_type = serializers.CharField(read_only=True)
    external_url = serializers.URLField(read_only=True, allow_blank=True)
    inline_html = serializers.CharField(read_only=True, allow_blank=True)
    
    # Dimensions
    width = serializers.CharField(read_only=True)
    height = serializers.CharField(read_only=True)
    
    # Sandbox settings
    sandbox_attributes = serializers.CharField(read_only=True)
    allow_scripts = serializers.BooleanField(read_only=True)
    allow_forms = serializers.BooleanField(read_only=True)
    allow_popups = serializers.BooleanField(read_only=True)
    allow_same_origin = serializers.BooleanField(read_only=True)
    allow_top_navigation = serializers.BooleanField(read_only=True)
    
    # xAPI messaging
    enable_xapi_messaging = serializers.BooleanField(read_only=True)
    allowed_origins = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )
    
    # Generated content
    iframe_html = serializers.CharField(read_only=True)
    xapi_listener_script = serializers.CharField(read_only=True, allow_blank=True)
    
    # Timestamps
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class HTMLEmbedXAPISerializer(serializers.Serializer):
    """
    Serializer for receiving xAPI statements from embedded content.
    
    Requirements: 13.4
    """
    statement = serializers.DictField(
        help_text="xAPI statement from embedded content"
    )
    origin = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Origin of the postMessage"
    )
    
    def validate_statement(self, value):
        """Validate basic xAPI statement structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Statement must be an object")
        
        required_fields = ['actor', 'verb', 'object']
        missing = [f for f in required_fields if f not in value]
        if missing:
            raise serializers.ValidationError(
                f"Statement missing required fields: {', '.join(missing)}"
            )
        
        return value


class HTMLEmbedXAPIResponseSerializer(serializers.Serializer):
    """
    Serializer for xAPI statement processing response.
    """
    success = serializers.BooleanField()
    statement_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(required=False)
    errors = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )


class HTMLEmbedInfoSerializer(serializers.Serializer):
    """
    Serializer for HTML embed information (GET response).
    """
    id = serializers.IntegerField(read_only=True)
    lesson_id = serializers.IntegerField(read_only=True)
    embed_type = serializers.CharField(read_only=True)
    external_url = serializers.URLField(read_only=True, allow_null=True)
    has_inline_html = serializers.BooleanField(read_only=True)
    width = serializers.CharField(read_only=True)
    height = serializers.CharField(read_only=True)
    sandbox_attributes = serializers.CharField(read_only=True)
    allow_scripts = serializers.BooleanField(read_only=True)
    allow_forms = serializers.BooleanField(read_only=True)
    allow_popups = serializers.BooleanField(read_only=True)
    allow_same_origin = serializers.BooleanField(read_only=True)
    allow_top_navigation = serializers.BooleanField(read_only=True)
    enable_xapi_messaging = serializers.BooleanField(read_only=True)
    allowed_origins = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )
    iframe_html = serializers.CharField(read_only=True)
    xapi_listener_script = serializers.CharField(read_only=True, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
