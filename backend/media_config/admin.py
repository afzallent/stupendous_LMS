from django.contrib import admin
from django.utils.html import format_html
from .models import MediaStorageConfig


@admin.register(MediaStorageConfig)
class MediaStorageConfigAdmin(admin.ModelAdmin):
    """
    Admin interface for Media Storage Configuration.
    Organized into logical fieldsets for easy configuration.
    """
    
    fieldsets = (
        ('Video Storage Settings', {
            'fields': (
                'video_storage_type',
                'video_local_path',
                'video_file_server_url',
                'video_file_server_username',
                'video_file_server_password',
                'video_s3_bucket',
                'video_s3_region',
                'video_s3_access_key',
                'video_s3_secret_key',
            ),
            'description': 'Configure where and how to store uploaded video files.'
        }),
        ('Thumbnail Storage Settings', {
            'fields': (
                'thumbnail_storage_type',
                'thumbnail_local_path',
                'thumbnail_file_server_url',
                'thumbnail_s3_bucket',
                'thumbnail_s3_region',
            ),
            'description': 'Configure where to store course and video thumbnails.'
        }),
        ('Avatar Storage Settings', {
            'fields': (
                'avatar_storage_type',
                'avatar_local_path',
                'avatar_file_server_url',
                'avatar_s3_bucket',
                'avatar_s3_region',
            ),
            'description': 'Configure where to store user profile avatars.'
        }),
        ('Image Processing & Security', {
            'fields': (
                'enable_image_transcoding',
                'image_output_format',
                'image_quality',
                'max_image_width',
                'max_image_height',
                'strip_image_metadata',
            ),
            'description': 'Image transcoding settings for security and optimization. '
                          'Transcoding prevents code injection through embedded malicious data.'
        }),
        ('File Size Limits', {
            'fields': (
                'max_video_size_mb',
                'max_image_size_mb',
            ),
            'description': 'Set maximum file sizes for uploads.'
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        """Prevent adding more than one configuration instance"""
        return not MediaStorageConfig.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the configuration"""
        return False
    
    def changelist_view(self, request, extra_context=None):
        """Redirect to the edit page if config exists, otherwise show add page"""
        if MediaStorageConfig.objects.exists():
            obj = MediaStorageConfig.objects.first()
            from django.shortcuts import redirect
            from django.urls import reverse
            return redirect(reverse('admin:media_config_mediastorageconfig_change', args=[obj.pk]))
        return super().changelist_view(request, extra_context)
    
    class Media:
        css = {
            'all': ('admin/css/media_config.css',)
        }
        js = ('admin/js/media_config.js',)
