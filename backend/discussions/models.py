from django.db import models
from django.conf import settings
from courses.models import Course


class DiscussionThread(models.Model):
    """Discussion thread model for course discussions"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='discussion_threads')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='discussion_threads')
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False, help_text="Pinned threads appear at the top")
    is_locked = models.BooleanField(default=False, help_text="Locked threads cannot receive new replies")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity_at = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        ordering = ['-is_pinned', '-last_activity_at']
        indexes = [
            models.Index(fields=['course', '-last_activity_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['last_activity_at']),
        ]
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


class DiscussionReply(models.Model):
    """Reply model for discussion threads"""
    thread = models.ForeignKey(DiscussionThread, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='discussion_replies')
    content = models.TextField()
    is_solution = models.BooleanField(default=False, help_text="Marked as solution by instructor")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete flag")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name_plural = "Discussion Replies"
        indexes = [
            models.Index(fields=['thread', 'created_at']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Reply by {self.author.username} on {self.thread.title}"
    
    def save(self, *args, **kwargs):
        """Update thread's last_activity_at when reply is created"""
        super().save(*args, **kwargs)
        # Update the thread's last activity timestamp
        self.thread.last_activity_at = self.created_at
        self.thread.save(update_fields=['last_activity_at'])
