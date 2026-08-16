from django.db import models
from django.conf import settings
import uuid
from courses.models import Course


class Certificate(models.Model):
    """
    Certificate model for course completion.

    A certificate is a published attestation: third parties verify it by
    `certificate_id` at a public endpoint, potentially years later. It must
    therefore outlive both the student's account and the course.

    Both foreign keys were CASCADE, so deleting a user or a course silently
    destroyed every certificate attached to it — and with it the ability to
    verify a credential that had already been handed out. They are now
    SET_NULL: the row survives, and the denormalised snapshot fields below
    (student_name, course_title, instructor_name) keep it fully verifiable
    without the relations.

    SET_NULL rather than PROTECT deliberately: PROTECT would make it
    impossible to delete any user who has ever earned a certificate, which
    conflicts with data-subject erasure requests. This preserves the record
    while still allowing the account to go.
    """
    certificate_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificates',
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='certificates',
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    completion_date = models.DateField(auto_now_add=True)

    # Snapshot of the facts at issue time. These are the authoritative record:
    # they are what the verification endpoint returns, and they stay correct
    # even if the course is later renamed or the account is deleted.
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
