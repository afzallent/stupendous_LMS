from django.contrib import admin
from .models import UploadedFile


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'file_type', 'uploaded_by', 'file_size', 'uploaded_at']
    list_filter = ['file_type', 'uploaded_at']
    search_fields = ['original_filename', 'uploaded_by__username']
    readonly_fields = ['uploaded_at', 'file_size']
