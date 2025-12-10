from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone


class ActivityLog(models.Model):
    """
    Comprehensive activity tracking for all user actions in the LMS.
    Uses generic foreign keys to track activities on any model.
    """
    
    ACTION_TYPES = [
        # Authentication
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('register', 'User Registration'),
        
        # Course Actions
        ('course_view', 'Viewed Course'),
        ('course_enroll', 'Enrolled in Course'),
        ('course_unenroll', 'Unenrolled from Course'),
        ('course_create', 'Created Course'),
        ('course_update', 'Updated Course'),
        ('course_delete', 'Deleted Course'),
        ('course_publish', 'Published Course'),
        
        # Lesson Actions
        ('lesson_view', 'Viewed Lesson'),
        ('lesson_start', 'Started Lesson'),
        ('lesson_complete', 'Completed Lesson'),
        ('lesson_create', 'Created Lesson'),
        ('lesson_update', 'Updated Lesson'),
        ('lesson_delete', 'Deleted Lesson'),
        
        # Quiz Actions
        ('quiz_start', 'Started Quiz'),
        ('quiz_submit', 'Submitted Quiz'),
        ('quiz_complete', 'Completed Quiz'),
        ('quiz_create', 'Created Quiz'),
        ('quiz_update', 'Updated Quiz'),
        ('quiz_delete', 'Deleted Quiz'),
        
        # Discussion Actions
        ('discussion_post', 'Posted Discussion Thread'),
        ('discussion_reply', 'Replied to Discussion'),
        ('discussion_edit', 'Edited Discussion Post'),
        ('discussion_delete', 'Deleted Discussion Post'),
        ('discussion_pin', 'Pinned Discussion Thread'),
        ('discussion_lock', 'Locked Discussion Thread'),
        ('discussion_solution', 'Marked Reply as Solution'),
        
        # Certificate Actions (for future)
        ('certificate_view', 'Viewed Certificate'),
        ('certificate_download', 'Downloaded Certificate'),
        
        # General
        ('search', 'Performed Search'),
        ('profile_view', 'Viewed Profile'),
        ('profile_update', 'Updated Profile'),
    ]
    
    # User who performed the action
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activities',
        null=True,
        blank=True,
        help_text="User who performed the action (null for anonymous)"
    )
    
    # Action details
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Generic relation to any model
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Additional context
    description = models.TextField(blank=True, help_text="Human-readable description")
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data (e.g., search query, time spent, etc.)"
    )
    
    # Session and request info
    session_key = models.CharField(max_length=40, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action_type', '-timestamp']),
            models.Index(fields=['content_type', 'object_id']),
        ]
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.get_action_type_display()} at {self.timestamp}"


class SessionActivity(models.Model):
    """
    Track user sessions and time spent on the platform.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    session_key = models.CharField(max_length=40, unique=True, db_index=True)
    
    # Session timing
    started_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Session metrics
    page_views = models.PositiveIntegerField(default=0)
    actions_count = models.PositiveIntegerField(default=0)
    
    # Device info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('desktop', 'Desktop'),
            ('mobile', 'Mobile'),
            ('tablet', 'Tablet'),
            ('unknown', 'Unknown'),
        ],
        default='unknown'
    )
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Session Activity'
        verbose_name_plural = 'Session Activities'
    
    def __str__(self):
        return f"{self.user.username} - Session {self.session_key[:8]}"
    
    @property
    def duration(self):
        """Calculate session duration in seconds"""
        end = self.ended_at or self.last_activity
        return (end - self.started_at).total_seconds()
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])


class LessonTimeTracking(models.Model):
    """
    Detailed time tracking for lesson viewing.
    Tracks how long students spend on each lesson.
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_time_logs'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='time_logs'
    )
    
    # Time tracking
    started_at = models.DateTimeField(default=timezone.now)
    last_position = models.PositiveIntegerField(
        default=0,
        help_text="Last video position in seconds"
    )
    time_spent = models.PositiveIntegerField(
        default=0,
        help_text="Total time spent in seconds"
    )
    
    # Completion tracking
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Engagement metrics
    pause_count = models.PositiveIntegerField(default=0)
    replay_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ('student', 'lesson')
        verbose_name = 'Lesson Time Tracking'
        verbose_name_plural = 'Lesson Time Tracking'
    
    def __str__(self):
        return f"{self.student.username} - {self.lesson.title}"
    
    def mark_complete(self):
        """Mark lesson as completed"""
        if not self.completed:
            self.completed = True
            self.completed_at = timezone.now()
            self.save()


class DailyActivitySummary(models.Model):
    """
    Aggregated daily activity statistics per user.
    Generated via management command or celery task.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_summaries'
    )
    date = models.DateField(db_index=True)
    
    # Activity counts
    login_count = models.PositiveIntegerField(default=0)
    courses_viewed = models.PositiveIntegerField(default=0)
    lessons_viewed = models.PositiveIntegerField(default=0)
    lessons_completed = models.PositiveIntegerField(default=0)
    
    # Time metrics (in seconds)
    total_time_spent = models.PositiveIntegerField(default=0)
    
    # Engagement score (0-100)
    engagement_score = models.PositiveSmallIntegerField(default=0)
    
    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')
        verbose_name = 'Daily Activity Summary'
        verbose_name_plural = 'Daily Activity Summaries'
    
    def __str__(self):
        return f"{self.user.username} - {self.date}"
