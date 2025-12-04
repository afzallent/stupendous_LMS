from django.db import models
from django.conf import settings
import os


def upload_to_path(instance, filename):
    """Generate upload path based on file type"""
    file_type = instance.file_type
    user_id = instance.uploaded_by.id
    return f'uploads/{file_type}/{user_id}/{filename}'


class UploadedFile(models.Model):
    """Model to track uploaded files"""
    FILE_TYPES = [
        ('thumbnail', 'Thumbnail'),
        ('video', 'Video'),
        ('avatar', 'Avatar'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]
    
    file = models.FileField(upload_to=upload_to_path)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='other')
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Optional associations
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    lesson = models.ForeignKey('courses.Lesson', on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.original_filename} ({self.file_type})"
    
    def delete(self, *args, **kwargs):
        """Delete file from storage when model is deleted"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)
