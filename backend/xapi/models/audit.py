"""
xAPI Audit Log model for tracking access and operations
"""
import uuid
from django.db import models
from django.conf import settings


class XAPIAuditLog(models.Model):
    """
    Audit log for xAPI data access and operations
    
    Tracks all access to xAPI data for compliance and security purposes.
    
    Validates: Requirements 10.5
    """
    
    # Operation types
    OPERATION_CHOICES = [
        ('read', 'Read'),
        ('write', 'Write'),
        ('delete', 'Delete'),
        ('export', 'Export'),
        ('query', 'Query'),
    ]
    
    # Audit log ID
    audit_id = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        help_text="Unique UUID for this audit log entry"
    )
    
    # User who performed the operation
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xapi_audit_logs',
        help_text="User who performed the operation"
    )
    
    # Operation details
    operation_type = models.CharField(
        max_length=20,
        choices=OPERATION_CHOICES,
        help_text="Type of operation performed"
    )
    
    # Resource being accessed
    resource_type = models.CharField(
        max_length=50,
        help_text="Type of resource accessed (e.g., 'statement', 'export', 'deletion')"
    )
    resource_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="ID of the specific resource (e.g., statement UUID)"
    )
    
    # Request details
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the request"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string from the request"
    )
    
    # Additional context
    details = models.JSONField(
        default=dict,
        help_text="Additional details about the operation"
    )
    
    # Status
    success = models.BooleanField(
        default=True,
        help_text="Whether the operation was successful"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if operation failed"
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the operation occurred"
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'xAPI Audit Log'
        verbose_name_plural = 'xAPI Audit Logs'
        indexes = [
            # Index for querying by user and time
            models.Index(fields=['user', 'timestamp'], name='xapi_audit_user_time_idx'),
            # Index for querying by operation type and time
            models.Index(fields=['operation_type', 'timestamp'], name='xapi_audit_op_time_idx'),
            # Index for querying by resource type and time
            models.Index(fields=['resource_type', 'timestamp'], name='xapi_audit_resource_time_idx'),
            # Index for querying by success status
            models.Index(fields=['success', 'timestamp'], name='xapi_audit_success_time_idx'),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.operation_type} - {self.resource_type} - {self.timestamp}"
