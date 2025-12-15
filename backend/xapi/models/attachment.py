"""
xAPI Attachment model for statement attachments
"""
from django.db import models


class XAPIAttachment(models.Model):
    """
    xAPI statement attachments
    Stores files or data attached to xAPI statements
    """
    statement = models.ForeignKey(
        'xapi.XAPIStatement',
        on_delete=models.CASCADE,
        related_name='attachments',
        help_text="Statement this attachment belongs to"
    )
    
    # Attachment metadata
    usage_type = models.URLField(
        help_text="IRI identifying the usage of this attachment"
    )
    display = models.JSONField(
        help_text="Language map for attachment display name"
    )
    content_type = models.CharField(
        max_length=255,
        help_text="MIME type of the attachment"
    )
    length = models.IntegerField(
        help_text="Length of attachment data in bytes"
    )
    sha2 = models.CharField(
        max_length=64,
        help_text="SHA-2 hash of the attachment data"
    )
    
    # Attachment storage
    file_url = models.URLField(
        null=True,
        blank=True,
        help_text="URL to the attachment file"
    )
    file_data = models.BinaryField(
        null=True,
        blank=True,
        help_text="Binary data of the attachment"
    )
    
    class Meta:
        verbose_name = 'xAPI Attachment'
        verbose_name_plural = 'xAPI Attachments'
    
    def __str__(self):
        display_name = self.display.get('en-US', 'Attachment')
        return f"{display_name} for {self.statement.statement_id}"
