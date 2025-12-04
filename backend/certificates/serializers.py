from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    """Serializer for certificates"""
    verification_url = serializers.ReadOnlyField()
    
    class Meta:
        model = Certificate
        fields = ['id', 'certificate_id', 'student', 'course', 'issued_at',
                  'completion_date', 'student_name', 'course_title', 
                  'instructor_name', 'is_valid', 'verification_url']
        read_only_fields = ['id', 'certificate_id', 'student', 'issued_at', 
                            'completion_date', 'is_valid']


class CertificateVerificationSerializer(serializers.Serializer):
    """Serializer for certificate verification"""
    certificate_id = serializers.UUIDField()
    is_valid = serializers.BooleanField(read_only=True)
    student_name = serializers.CharField(read_only=True)
    course_title = serializers.CharField(read_only=True)
    instructor_name = serializers.CharField(read_only=True)
    issued_at = serializers.DateTimeField(read_only=True)
    completion_date = serializers.DateField(read_only=True)
