"""
SCORM Runtime API Serializers

Serializers for SCORM runtime API endpoints that handle communication
between SCORM content and the LMS backend.
"""

from rest_framework import serializers


class ScormInitializeSerializer(serializers.Serializer):
    """
    Serializer for SCORM initialize request.
    
    **Validates: Requirements 2.1**
    """
    student_id = serializers.IntegerField(required=True, help_text="ID of the student")
    sco_id = serializers.IntegerField(required=True, help_text="ID of the SCO")
    parameter = serializers.CharField(required=False, default="", allow_blank=True, help_text="Reserved parameter")


class ScormInitializeResponseSerializer(serializers.Serializer):
    """Response serializer for initialize endpoint."""
    success = serializers.BooleanField(help_text="Whether initialization succeeded")
    result = serializers.CharField(help_text="'true' or 'false' per SCORM spec")
    error_code = serializers.CharField(help_text="SCORM error code")
    error_message = serializers.CharField(help_text="Human-readable error message")


class ScormGetValueSerializer(serializers.Serializer):
    """
    Serializer for SCORM get value request.
    
    **Validates: Requirements 2.2**
    """
    student_id = serializers.IntegerField(required=True, help_text="ID of the student")
    sco_id = serializers.IntegerField(required=True, help_text="ID of the SCO")
    element = serializers.CharField(required=True, help_text="CMI element path")


class ScormGetValueResponseSerializer(serializers.Serializer):
    """Response serializer for get value endpoint."""
    success = serializers.BooleanField(help_text="Whether operation succeeded")
    value = serializers.CharField(allow_blank=True, help_text="Value of the CMI element")
    error_code = serializers.CharField(help_text="SCORM error code")
    error_message = serializers.CharField(help_text="Human-readable error message")


class ScormSetValueSerializer(serializers.Serializer):
    """
    Serializer for SCORM set value request.
    
    **Validates: Requirements 2.2**
    """
    student_id = serializers.IntegerField(required=True, help_text="ID of the student")
    sco_id = serializers.IntegerField(required=True, help_text="ID of the SCO")
    element = serializers.CharField(required=True, help_text="CMI element path")
    value = serializers.CharField(required=True, allow_blank=True, help_text="Value to set")


class ScormSetValueResponseSerializer(serializers.Serializer):
    """Response serializer for set value endpoint."""
    success = serializers.BooleanField(help_text="Whether operation succeeded")
    result = serializers.CharField(help_text="'true' or 'false' per SCORM spec")
    error_code = serializers.CharField(help_text="SCORM error code")
    error_message = serializers.CharField(help_text="Human-readable error message")


class ScormCommitSerializer(serializers.Serializer):
    """
    Serializer for SCORM commit request.
    
    **Validates: Requirements 2.5**
    """
    student_id = serializers.IntegerField(required=True, help_text="ID of the student")
    sco_id = serializers.IntegerField(required=True, help_text="ID of the SCO")
    parameter = serializers.CharField(required=False, default="", allow_blank=True, help_text="Reserved parameter")


class ScormCommitResponseSerializer(serializers.Serializer):
    """Response serializer for commit endpoint."""
    success = serializers.BooleanField(help_text="Whether commit succeeded")
    result = serializers.CharField(help_text="'true' or 'false' per SCORM spec")
    error_code = serializers.CharField(help_text="SCORM error code")
    error_message = serializers.CharField(help_text="Human-readable error message")


class ScormTerminateSerializer(serializers.Serializer):
    """
    Serializer for SCORM terminate request.
    
    **Validates: Requirements 2.5**
    """
    student_id = serializers.IntegerField(required=True, help_text="ID of the student")
    sco_id = serializers.IntegerField(required=True, help_text="ID of the SCO")
    parameter = serializers.CharField(required=False, default="", allow_blank=True, help_text="Reserved parameter")


class ScormTerminateResponseSerializer(serializers.Serializer):
    """Response serializer for terminate endpoint."""
    success = serializers.BooleanField(help_text="Whether termination succeeded")
    result = serializers.CharField(help_text="'true' or 'false' per SCORM spec")
    error_code = serializers.CharField(help_text="SCORM error code")
    error_message = serializers.CharField(help_text="Human-readable error message")
