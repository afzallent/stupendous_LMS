from django.db import models
from django.conf import settings
from courses.models import Course


class Notification(models.Model):
    """
    Notification model for trainer notifications about course events.
    """
    NOTIFICATION_TYPES = [
        ('discussion_post', 'Discussion Post'),
        ('assessment_submission', 'Assessment Submission'),
        ('course_completion', 'Course Completion'),
        ('new_enrollment', 'New Enrollment'),
        ('student_question', 'Student Question'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications_received'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    related_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications_about'
    )
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.notification_type} - {self.recipient.email} - {self.title}"
