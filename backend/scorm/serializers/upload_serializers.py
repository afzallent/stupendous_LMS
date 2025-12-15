"""
Serializers for SCORM package upload API.
"""

from rest_framework import serializers
from courses.models import Course, Lesson
from scorm.models.scorm_models import ScormPackage, ScormSCO


class ScormUploadRequestSerializer(serializers.Serializer):
    """
    Serializer for SCORM package upload request.
    
    Validates upload parameters including course ID, package file,
    and optional settings.
    """
    course_id = serializers.IntegerField(
        required=True,
        help_text="ID of the course to add this SCORM package to"
    )
    scorm_package = serializers.FileField(
        required=True,
        help_text="SCORM package ZIP file"
    )
    
    # Optional settings
    completion_criteria = serializers.ChoiceField(
        choices=['status', 'score', 'time'],
        default='status',
        required=False,
        help_text="Criteria for determining completion"
    )
    passing_score = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
        help_text="Minimum score required to pass (0-100)"
    )
    allow_retry = serializers.BooleanField(
        default=True,
        required=False,
        help_text="Allow students to retry the content"
    )
    
    def validate_course_id(self, value):
        """Validate that the course exists"""
        try:
            Course.objects.get(pk=value)
        except Course.DoesNotExist:
            raise serializers.ValidationError(f"Course with ID {value} does not exist")
        return value
    
    def validate_scorm_package(self, value):
        """Validate that the uploaded file is a ZIP file"""
        if not value.name.endswith('.zip'):
            raise serializers.ValidationError("SCORM package must be a ZIP file")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        # If completion criteria is 'score', passing_score is required
        if data.get('completion_criteria') == 'score' and not data.get('passing_score'):
            raise serializers.ValidationError({
                'passing_score': 'Passing score is required when completion criteria is "score"'
            })
        return data


class ScormSCOSerializer(serializers.ModelSerializer):
    """Serializer for SCORM SCO information"""
    
    class Meta:
        model = ScormSCO
        fields = ['id', 'identifier', 'title', 'launch_url', 'order']


class ScormUploadResponseSerializer(serializers.Serializer):
    """
    Serializer for SCORM package upload response.
    
    Returns information about the uploaded package including
    lesson ID, SCORM version, and SCO details.
    """
    success = serializers.BooleanField()
    message = serializers.CharField(required=False)
    lesson_id = serializers.IntegerField(required=False)
    package_id = serializers.IntegerField(required=False)
    scorm_version = serializers.CharField(required=False)
    title = serializers.CharField(required=False)
    scos = ScormSCOSerializer(many=True, required=False)
    
    # Error details
    errors = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    warnings = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )


class ScormPackageSerializer(serializers.ModelSerializer):
    """Serializer for SCORM package details"""
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    sco_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ScormPackage
        fields = [
            'id', 'course', 'course_title', 'lesson', 'lesson_title',
            'version', 'identifier', 'title', 'description',
            'content_path', 'launch_url', 'uploaded_at', 'uploaded_by',
            'uploaded_by_username', 'completion_criteria', 'passing_score',
            'allow_retry', 'sco_count'
        ]
        read_only_fields = [
            'id', 'identifier', 'content_path', 'launch_url',
            'uploaded_at', 'uploaded_by'
        ]
    
    def get_sco_count(self, obj):
        """Get the number of SCOs in this package"""
        return obj.scos.count()
