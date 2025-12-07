from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class MediaStorageConfig(models.Model):
    """
    Singleton model to store media storage configuration.
    Only one instance should exist.
    """
    
    STORAGE_TYPE_CHOICES = [
        ('local', 'Local Storage'),
        ('file_server', 'File Server'),
        ('s3', 'Amazon S3'),
    ]
    
    IMAGE_FORMAT_CHOICES = [
        ('original', 'Keep Original'),
        ('webp', 'WebP'),
        ('avif', 'AVIF'),
    ]
    
    # Video Storage Configuration
    video_storage_type = models.CharField(
        max_length=20,
        choices=STORAGE_TYPE_CHOICES,
        default='local',
        help_text='Where to store uploaded videos'
    )
    video_local_path = models.CharField(
        max_length=500,
        default='media/videos',
        help_text='Local path for video storage (relative to MEDIA_ROOT)'
    )
    video_file_server_url = models.URLField(
        blank=True,
        null=True,
        help_text='File server URL for video storage'
    )
    video_file_server_username = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Username for file server authentication'
    )
    video_file_server_password = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='Password for file server authentication (encrypted)'
    )
    video_s3_bucket = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='S3 bucket name for video storage'
    )
    video_s3_region = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default='us-east-1',
        help_text='AWS region for S3 bucket'
    )
    video_s3_access_key = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='AWS access key ID'
    )
    video_s3_secret_key = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='AWS secret access key (encrypted)'
    )
    
    # Thumbnail Storage Configuration
    thumbnail_storage_type = models.CharField(
        max_length=20,
        choices=STORAGE_TYPE_CHOICES,
        default='local',
        help_text='Where to store thumbnails'
    )
    thumbnail_local_path = models.CharField(
        max_length=500,
        default='media/thumbnails',
        help_text='Local path for thumbnail storage'
    )
    thumbnail_file_server_url = models.URLField(
        blank=True,
        null=True,
        help_text='File server URL for thumbnail storage'
    )
    thumbnail_s3_bucket = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='S3 bucket name for thumbnail storage'
    )
    thumbnail_s3_region = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default='us-east-1'
    )
    
    # Avatar Storage Configuration
    avatar_storage_type = models.CharField(
        max_length=20,
        choices=STORAGE_TYPE_CHOICES,
        default='local',
        help_text='Where to store user avatars'
    )
    avatar_local_path = models.CharField(
        max_length=500,
        default='media/avatars',
        help_text='Local path for avatar storage'
    )
    avatar_file_server_url = models.URLField(
        blank=True,
        null=True,
        help_text='File server URL for avatar storage'
    )
    avatar_s3_bucket = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='S3 bucket name for avatar storage'
    )
    avatar_s3_region = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        default='us-east-1'
    )
    
    # Image Processing Configuration
    enable_image_transcoding = models.BooleanField(
        default=True,
        help_text='Enable automatic image format conversion for security and optimization'
    )
    image_output_format = models.CharField(
        max_length=20,
        choices=IMAGE_FORMAT_CHOICES,
        default='webp',
        help_text='Output format for transcoded images'
    )
    image_quality = models.IntegerField(
        default=85,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text='Image quality for transcoded images (1-100)'
    )
    max_image_width = models.IntegerField(
        default=2048,
        validators=[MinValueValidator(100)],
        help_text='Maximum width for uploaded images (pixels)'
    )
    max_image_height = models.IntegerField(
        default=2048,
        validators=[MinValueValidator(100)],
        help_text='Maximum height for uploaded images (pixels)'
    )
    strip_image_metadata = models.BooleanField(
        default=True,
        help_text='Remove EXIF and other metadata from images for security'
    )
    
    # File Size Limits
    max_video_size_mb = models.IntegerField(
        default=500,
        validators=[MinValueValidator(1)],
        help_text='Maximum video file size in MB'
    )
    max_image_size_mb = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1)],
        help_text='Maximum image file size in MB'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Media Storage Configuration'
        verbose_name_plural = 'Media Storage Configuration'
    
    def __str__(self):
        return 'Media Storage Configuration'
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists (singleton pattern)"""
        if not self.pk and MediaStorageConfig.objects.exists():
            raise ValidationError('Only one Media Storage Configuration instance is allowed.')
        return super().save(*args, **kwargs)
    
    @classmethod
    def get_config(cls):
        """Get or create the singleton configuration instance"""
        config, created = cls.objects.get_or_create(pk=1)
        return config
