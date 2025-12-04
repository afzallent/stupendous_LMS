from django.db import models
from django.conf import settings
import uuid
from courses.models import Course


class Certificate(models.Model):
    """Certificate model for course completion"""
    certificate_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    issued_at = models.DateTimeField(auto_now_add=True)
    completion_date = models.DateField(auto_now_add=True)
    
    # Certificate details
    student_name = models.CharField(max_length=200)
    course_title = models.CharField(max_length=200)
    instructor_name = models.CharField(max_length=200)
    
    # Verification
    is_valid = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-issued_at']
        unique_together = ('student', 'course')
    
    def __str__(self):
        return f"Certificate for {self.student_name} - {self.course_title}"
    
    @property
    def verification_url(self):
        """Generate verification URL"""
        return f"/api/certificates/verify/?certificateId={self.certificate_id}"
