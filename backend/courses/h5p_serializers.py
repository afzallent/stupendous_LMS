"""
Serializers for H5P content API endpoints.

Requirements: 12.1, 12.2, 12.4, 12.5
"""
from rest_framework import serializers
from .content_models import H5PPackage, H5PContentState


class H5PPackageSerializer(serializers.ModelSerializer):
    """
    Serializer for H5PPackage model.
    
    Provides H5P package metadata and embed configuration.
    """
    embed_url = serializers.SerializerMethodField()
    
    class Meta:
        model = H5PPackage
        fields = [
            'id',
            'lesson',
            'title',
            'description',
            'library_name',
            'library_version',
            'embed_width',
            'embed_height',
            'allow_fullscreen',
            'track_xapi',
            'embed_url',
            'uploaded_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'library_name',
            'library_version',
            'embed_url',
            'uploaded_at',
            'updated_at',
        ]
    
    def get_embed_url(self, obj):
        """Get the embed URL for this H5P package."""
        return obj.get_embed_url()


class H5PUploadSerializer(serializers.Serializer):
    """
    Serializer for H5P package upload.
    
    Requirements: 12.1
    """
    lesson_id = serializers.IntegerField(
        required=True,
        help_text="ID of the lesson to attach H5P content to"
    )
    h5p_package = serializers.FileField(
        required=True,
        help_text="H5P package file (.h5p)"
    )
    title = serializers.CharField(
        required=False,
        max_length=255,
        help_text="Title for the H5P content (extracted from package if not provided)"
    )
    description = serializers.CharField(
        required=False,
        default='',
        help_text="Description of the H5P content"
    )
    
    def validate_h5p_package(self, value):
        """Validate the uploaded H5P package."""
        # Check file extension
        if not value.name.lower().endswith('.h5p'):
            raise serializers.ValidationError(
                "File must have .h5p extension"
            )
        
        # Check file size (max 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed ({max_size // (1024*1024)}MB)"
            )
        
        return value


class H5PUploadResponseSerializer(serializers.Serializer):
    """
    Response serializer for H5P upload.
    """
    success = serializers.BooleanField()
    h5p_id = serializers.IntegerField(help_text="ID of the created H5P package")
    library = serializers.CharField(help_text="H5P library name")
    version = serializers.CharField(help_text="H5P library version")
    title = serializers.CharField()
    message = serializers.CharField(required=False)


class H5PEmbedResponseSerializer(serializers.Serializer):
    """
    Response serializer for H5P embed endpoint.
    
    Requirements: 12.2
    """
    embed_url = serializers.CharField(help_text="URL for embedding H5P content")
    iframe_html = serializers.CharField(help_text="Complete iframe HTML for embedding")
    width = serializers.CharField(help_text="Iframe width")
    height = serializers.CharField(help_text="Iframe height")
    state = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text="Previous content state for resuming"
    )
    xapi_listener_script = serializers.CharField(
        required=False,
        help_text="JavaScript for capturing xAPI statements"
    )
    track_xapi = serializers.BooleanField(
        help_text="Whether xAPI tracking is enabled"
    )


class H5PXAPIStatementSerializer(serializers.Serializer):
    """
    Serializer for receiving xAPI statements from H5P content.
    
    Requirements: 12.2, 12.3
    """
    statement = serializers.JSONField(
        required=True,
        help_text="xAPI statement from H5P content"
    )
    
    def validate_statement(self, value):
        """Basic validation of xAPI statement structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Statement must be a JSON object"
            )
        
        # Check for required xAPI fields (basic check)
        # Full validation happens in the manager
        if 'verb' not in value:
            raise serializers.ValidationError(
                "Statement must contain a 'verb' field"
            )
        
        return value


class H5PXAPIResponseSerializer(serializers.Serializer):
    """
    Response serializer for H5P xAPI statement processing.
    """
    success = serializers.BooleanField()
    statement_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="ID of the stored xAPI statement"
    )
    message = serializers.CharField(required=False)


class H5PStateSerializer(serializers.Serializer):
    """
    Serializer for saving H5P content state.
    
    Requirements: 12.4
    """
    state = serializers.JSONField(
        required=True,
        help_text="Content state data from H5P"
    )


class H5PStateResponseSerializer(serializers.Serializer):
    """
    Response serializer for H5P state operations.
    """
    success = serializers.BooleanField()
    state = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text="Content state data"
    )
    message = serializers.CharField(required=False)


class H5PContentStateSerializer(serializers.ModelSerializer):
    """
    Serializer for H5PContentState model.
    
    Provides student progress and state for H5P content.
    """
    score_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = H5PContentState
        fields = [
            'id',
            'student',
            'h5p_package',
            'state_data',
            'score',
            'max_score',
            'score_percentage',
            'completion_status',
            'started_at',
            'completed_at',
            'last_accessed',
            'total_time_spent',
            'interaction_count',
        ]
        read_only_fields = [
            'id',
            'student',
            'h5p_package',
            'score_percentage',
            'started_at',
            'completed_at',
            'last_accessed',
        ]
    
    def get_score_percentage(self, obj):
        """Calculate score as percentage."""
        if obj.score is not None and obj.max_score:
            return float(obj.score) / float(obj.max_score) * 100
        return None


class H5PProgressResponseSerializer(serializers.Serializer):
    """
    Response serializer for H5P progress endpoint.
    """
    completion_status = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    max_score = serializers.FloatField(allow_null=True)
    score_percentage = serializers.FloatField(allow_null=True)
    started_at = serializers.CharField(allow_null=True)
    completed_at = serializers.CharField(allow_null=True)
    last_accessed = serializers.CharField(allow_null=True)
    interaction_count = serializers.IntegerField()
    total_time_spent = serializers.IntegerField()
