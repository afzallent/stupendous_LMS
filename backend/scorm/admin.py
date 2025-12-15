from django.contrib import admin
from .models import ScormPackage, ScormSCO, ScormData


@admin.register(ScormPackage)
class ScormPackageAdmin(admin.ModelAdmin):
    """Admin interface for SCORM packages"""
    list_display = ('title', 'version', 'course', 'uploaded_by', 'uploaded_at', 'completion_criteria')
    list_filter = ('version', 'completion_criteria', 'uploaded_at')
    search_fields = ('title', 'identifier', 'description')
    readonly_fields = ('uploaded_at', 'identifier')
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'course', 'lesson', 'version', 'identifier')
        }),
        ('Content', {
            'fields': ('content_path', 'launch_url', 'manifest_data')
        }),
        ('Settings', {
            'fields': ('completion_criteria', 'passing_score', 'allow_retry')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )


@admin.register(ScormSCO)
class ScormSCOAdmin(admin.ModelAdmin):
    """Admin interface for SCORM SCOs"""
    list_display = ('title', 'package', 'identifier', 'order')
    list_filter = ('package',)
    search_fields = ('title', 'identifier')
    ordering = ('package', 'order')


@admin.register(ScormData)
class ScormDataAdmin(admin.ModelAdmin):
    """Admin interface for SCORM CMI data"""
    list_display = ('student', 'sco', 'lesson_status', 'score_raw', 'last_accessed')
    list_filter = ('lesson_status', 'last_accessed')
    search_fields = ('student__username', 'sco__title')
    readonly_fields = ('created_at', 'updated_at', 'last_accessed')
    fieldsets = (
        ('Student & Content', {
            'fields': ('student', 'sco')
        }),
        ('Status & Score', {
            'fields': ('lesson_status', 'score_raw', 'score_min', 'score_max')
        }),
        ('Location & Data', {
            'fields': ('lesson_location', 'suspend_data')
        }),
        ('Time Tracking', {
            'fields': ('session_time', 'total_time')
        }),
        ('Additional Fields', {
            'fields': ('entry', 'exit', 'credit', 'mode', 'cmi_data')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_accessed')
        }),
    )
