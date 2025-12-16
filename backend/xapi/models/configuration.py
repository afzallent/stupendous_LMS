"""
xAPI Configuration model for system-wide settings
"""
from django.db import models


class XAPIConfiguration(models.Model):
    """
    xAPI/SCORM system configuration (singleton pattern)
    
    This model stores all system-wide configuration for xAPI and SCORM features.
    Only one instance should exist (pk=1) to maintain singleton pattern.
    
    Validates: Requirements 10.1
    """
    
    # LRS Settings
    lrs_endpoint = models.URLField(
        default='http://localhost:8000/xapi/',
        help_text="LRS endpoint URL"
    )
    lrs_auth_enabled = models.BooleanField(
        default=True,
        help_text="Whether authentication is required for LRS endpoints"
    )
    lrs_basic_auth_enabled = models.BooleanField(
        default=True,
        help_text="Whether HTTP Basic Auth is enabled for LRS"
    )
    lrs_oauth_enabled = models.BooleanField(
        default=False,
        help_text="Whether OAuth 2.0 is enabled for LRS"
    )
    
    # Statement Generation Settings
    auto_generate_statements = models.BooleanField(
        default=True,
        help_text="Whether to automatically generate xAPI statements for learning activities"
    )
    track_video_interactions = models.BooleanField(
        default=True,
        help_text="Whether to track video interactions (play, pause, seek, complete)"
    )
    track_quiz_attempts = models.BooleanField(
        default=True,
        help_text="Whether to track quiz attempts and results"
    )
    track_lesson_completions = models.BooleanField(
        default=True,
        help_text="Whether to track lesson completions"
    )
    track_course_enrollments = models.BooleanField(
        default=True,
        help_text="Whether to track course enrollments"
    )
    
    # Privacy Settings
    use_pseudonymous_actors = models.BooleanField(
        default=False,
        help_text="Whether to use pseudonymous identifiers instead of real names in xAPI statements"
    )
    include_pii_in_statements = models.BooleanField(
        default=True,
        help_text="Whether to include personally identifiable information in xAPI statements"
    )
    allow_student_data_export = models.BooleanField(
        default=True,
        help_text="Whether students can export their own xAPI data"
    )
    allow_student_data_deletion = models.BooleanField(
        default=True,
        help_text="Whether students can request deletion of their xAPI data"
    )
    
    # SCORM Settings
    scorm_12_enabled = models.BooleanField(
        default=True,
        help_text="Whether SCORM 1.2 packages are supported"
    )
    scorm_2004_enabled = models.BooleanField(
        default=True,
        help_text="Whether SCORM 2004 packages are supported"
    )
    max_package_size_mb = models.IntegerField(
        default=100,
        help_text="Maximum SCORM package size in megabytes"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'xAPI Configuration'
        verbose_name_plural = 'xAPI Configuration'
    
    def save(self, *args, **kwargs):
        """Enforce singleton pattern by always using pk=1"""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        """
        Load or create the singleton configuration instance
        
        Returns:
            XAPIConfiguration: The singleton configuration instance
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def __str__(self):
        return "xAPI Configuration"
