"""
SCORM data models for package management and CMI data storage.

These models support SCORM 1.2 and SCORM 2004 standards for tracking
learner interactions with SCORM content packages.
"""

from django.db import models
from django.conf import settings
from courses.models import Course, Lesson


class ScormPackage(models.Model):
    """
    SCORM package metadata and configuration.
    
    Stores information about uploaded SCORM packages including version,
    manifest data, and completion criteria.
    """
    
    VERSION_CHOICES = [
        ('1.2', 'SCORM 1.2'),
        ('2004', 'SCORM 2004'),
    ]
    
    COMPLETION_CRITERIA_CHOICES = [
        ('status', 'Status'),
        ('score', 'Score'),
        ('time', 'Time'),
    ]
    
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='scorm_packages',
        help_text="Course this SCORM package belongs to"
    )
    lesson = models.OneToOneField(
        Lesson,
        on_delete=models.CASCADE,
        related_name='scorm_package',
        null=True,
        blank=True,
        help_text="Lesson associated with this SCORM package"
    )
    version = models.CharField(
        max_length=10,
        choices=VERSION_CHOICES,
        help_text="SCORM version (1.2 or 2004)"
    )
    identifier = models.CharField(
        max_length=255,
        unique=True,
        help_text="Unique identifier from manifest"
    )
    title = models.CharField(
        max_length=255,
        help_text="Package title from manifest"
    )
    description = models.TextField(
        blank=True,
        help_text="Package description"
    )
    manifest_data = models.JSONField(
        help_text="Parsed imsmanifest.xml data"
    )
    content_path = models.CharField(
        max_length=500,
        help_text="Path to extracted content files"
    )
    launch_url = models.CharField(
        max_length=500,
        help_text="Entry point URL for launching content"
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when package was uploaded"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        help_text="User who uploaded the package"
    )
    
    # Settings
    completion_criteria = models.CharField(
        max_length=20,
        choices=COMPLETION_CRITERIA_CHOICES,
        default='status',
        help_text="Criteria for determining completion"
    )
    passing_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="Minimum score required to pass (if score-based)"
    )
    allow_retry = models.BooleanField(
        default=True,
        help_text="Allow students to retry the content"
    )
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'SCORM Package'
        verbose_name_plural = 'SCORM Packages'
    
    def __str__(self):
        return f"{self.title} ({self.version})"


class ScormSCO(models.Model):
    """
    Sharable Content Object (SCO) within a SCORM package.
    
    A SCORM package can contain multiple SCOs, each representing
    a launchable learning object.
    """
    
    package = models.ForeignKey(
        ScormPackage,
        on_delete=models.CASCADE,
        related_name='scos',
        help_text="SCORM package this SCO belongs to"
    )
    identifier = models.CharField(
        max_length=255,
        help_text="SCO identifier from manifest"
    )
    title = models.CharField(
        max_length=255,
        help_text="SCO title"
    )
    launch_url = models.CharField(
        max_length=500,
        help_text="URL to launch this SCO"
    )
    prerequisites = models.CharField(
        max_length=500,
        blank=True,
        help_text="Prerequisites for accessing this SCO"
    )
    max_time_allowed = models.CharField(
        max_length=50,
        blank=True,
        help_text="Maximum time allowed for this SCO"
    )
    time_limit_action = models.CharField(
        max_length=50,
        blank=True,
        help_text="Action to take when time limit is reached"
    )
    order = models.IntegerField(
        default=0,
        help_text="Display order within package"
    )
    
    class Meta:
        ordering = ['order']
        unique_together = ('package', 'identifier')
        verbose_name = 'SCORM SCO'
        verbose_name_plural = 'SCORM SCOs'
    
    def __str__(self):
        return f"{self.package.title} - {self.title}"


class ScormData(models.Model):
    """
    SCORM CMI (Computer Managed Instruction) data model storage.
    
    Stores learner interaction data for SCORM content, supporting
    both SCORM 1.2 and SCORM 2004 data models.
    """
    
    LESSON_STATUS_CHOICES = [
        ('not attempted', 'Not Attempted'),
        ('incomplete', 'Incomplete'),
        ('completed', 'Completed'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('browsed', 'Browsed'),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        help_text="Student whose data this is"
    )
    sco = models.ForeignKey(
        ScormSCO,
        on_delete=models.CASCADE,
        help_text="SCO this data belongs to"
    )
    
    # Core CMI elements
    lesson_status = models.CharField(
        max_length=20,
        choices=LESSON_STATUS_CHOICES,
        default='not attempted',
        help_text="Current lesson status"
    )
    lesson_location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Bookmark location within content"
    )
    suspend_data = models.TextField(
        blank=True,
        help_text="Suspend data for resuming session"
    )
    score_raw = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Raw score"
    )
    score_min = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum possible score"
    )
    score_max = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum possible score"
    )
    session_time = models.CharField(
        max_length=50,
        blank=True,
        help_text="Time spent in current session"
    )
    total_time = models.CharField(
        max_length=50,
        blank=True,
        help_text="Total time spent across all sessions"
    )
    
    # Additional data
    entry = models.CharField(
        max_length=20,
        blank=True,
        help_text="Entry mode: ab-initio, resume, or empty"
    )
    exit = models.CharField(
        max_length=20,
        blank=True,
        help_text="Exit mode: time-out, suspend, logout, or empty"
    )
    credit = models.CharField(
        max_length=20,
        default='credit',
        help_text="Credit mode"
    )
    mode = models.CharField(
        max_length=20,
        default='normal',
        help_text="Lesson mode"
    )
    
    # Full CMI data as JSON for flexibility
    cmi_data = models.JSONField(
        default=dict,
        help_text="Complete CMI data model as JSON"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When this record was last updated"
    )
    last_accessed = models.DateTimeField(
        auto_now=True,
        help_text="When this data was last accessed"
    )
    
    class Meta:
        unique_together = ('student', 'sco')
        ordering = ['-last_accessed']
        verbose_name = 'SCORM Data'
        verbose_name_plural = 'SCORM Data'
    
    def __str__(self):
        return f"{self.student.username} - {self.sco.title} ({self.lesson_status})"
