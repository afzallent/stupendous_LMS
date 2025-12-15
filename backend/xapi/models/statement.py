"""
xAPI Statement model for Learning Record Store (LRS)
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class XAPIStatement(models.Model):
    """
    xAPI statement storage (LRS)
    Stores learning activity statements in xAPI format
    """
    # Statement ID - unique identifier for each statement
    statement_id = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        help_text="Unique UUID for this statement"
    )
    
    # Actor (who) - the learner or entity performing the action
    actor_type = models.CharField(
        max_length=20,
        default='Agent',
        help_text="Type of actor (Agent or Group)"
    )
    actor_name = models.CharField(
        max_length=255,
        help_text="Display name of the actor"
    )
    actor_mbox = models.EmailField(
        null=True,
        blank=True,
        help_text="Email address of the actor (mailto: IRI)"
    )
    actor_account_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Account name for the actor"
    )
    actor_account_homepage = models.URLField(
        null=True,
        blank=True,
        help_text="Account homepage IRI"
    )
    actor_json = models.JSONField(
        help_text="Full actor object as JSON"
    )
    
    # Verb (did) - the action being performed
    verb_id = models.URLField(
        help_text="IRI identifying the verb"
    )
    verb_display = models.JSONField(
        help_text="Language map for verb display (e.g., {'en-US': 'completed'})"
    )
    
    # Object (what) - the activity or object being acted upon
    object_type = models.CharField(
        max_length=20,
        default='Activity',
        help_text="Type of object (Activity, Agent, Group, etc.)"
    )
    object_id = models.URLField(
        help_text="IRI identifying the activity or object"
    )
    object_json = models.JSONField(
        help_text="Full object as JSON"
    )
    
    # Result (optional) - outcome of the activity
    result_score_scaled = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Scaled score between -1 and 1"
    )
    result_score_raw = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Raw score achieved"
    )
    result_score_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Minimum possible score"
    )
    result_score_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum possible score"
    )
    result_success = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the activity was successful"
    )
    result_completion = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the activity was completed"
    )
    result_duration = models.CharField(
        max_length=50,
        blank=True,
        help_text="Duration in ISO 8601 format (e.g., PT1H30M)"
    )
    result_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Full result object as JSON"
    )
    
    # Context (optional) - contextual information
    context_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Context object as JSON"
    )
    
    # Timestamp - when the activity occurred
    timestamp = models.DateTimeField(
        help_text="When the activity occurred (ISO 8601)"
    )
    
    # Stored - when the statement was stored in the LRS
    stored = models.DateTimeField(
        auto_now_add=True,
        help_text="When the statement was stored in the LRS"
    )
    
    # Authority (optional) - who recorded the statement
    authority_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Authority object as JSON"
    )
    
    # Full statement as JSON for complete storage
    statement_json = models.JSONField(
        help_text="Complete statement as JSON"
    )
    
    # Voided flag - whether this statement has been voided
    voided = models.BooleanField(
        default=False,
        help_text="Whether this statement has been voided"
    )
    
    # Relations to existing models (for synchronization)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xapi_statements',
        help_text="Related user (for sync with existing models)"
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xapi_statements',
        help_text="Related course (for sync with existing models)"
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xapi_statements',
        help_text="Related lesson (for sync with existing models)"
    )
    quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xapi_statements',
        help_text="Related quiz (for sync with existing models)"
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'xAPI Statement'
        verbose_name_plural = 'xAPI Statements'
        indexes = [
            # Index for querying by actor and time
            models.Index(fields=['actor_mbox', 'timestamp'], name='xapi_actor_time_idx'),
            # Index for querying by verb and time
            models.Index(fields=['verb_id', 'timestamp'], name='xapi_verb_time_idx'),
            # Index for querying by object and time
            models.Index(fields=['object_id', 'timestamp'], name='xapi_object_time_idx'),
            # Index for querying by user and time (for sync)
            models.Index(fields=['user', 'timestamp'], name='xapi_user_time_idx'),
            # Index for voided statements
            models.Index(fields=['voided', 'timestamp'], name='xapi_voided_time_idx'),
        ]
    
    def __str__(self):
        verb_text = self.verb_display.get('en-US', 'interacted with')
        return f"{self.actor_name} {verb_text} {self.object_id}"
    
    def save(self, *args, **kwargs):
        """Ensure timestamp is set if not provided"""
        if not self.timestamp:
            self.timestamp = timezone.now()
        super().save(*args, **kwargs)
