from django.contrib import admin
from django.utils.html import format_html
from .models import ActivityLog, SessionActivity, LessonTimeTracking, DailyActivitySummary


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action_type', 'content_object_display', 'timestamp', 'ip_address']
    list_filter = ['action_type', 'timestamp', 'content_type']
    search_fields = ['user__username', 'description', 'ip_address']
    readonly_fields = ['timestamp', 'session_key', 'ip_address', 'user_agent']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('User & Action', {
            'fields': ('user', 'action_type', 'description')
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Request Info', {
            'fields': ('session_key', 'ip_address', 'user_agent', 'timestamp'),
            'classes': ('collapse',)
        }),
    )
    
    def content_object_display(self, obj):
        if obj.content_object:
            return str(obj.content_object)
        return '-'
    content_object_display.short_description = 'Related Object'
    
    def has_add_permission(self, request):
        return False


@admin.register(SessionActivity)
class SessionActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'started_at', 'duration_display', 'page_views', 'actions_count', 'device_type']
    list_filter = ['device_type', 'started_at']
    search_fields = ['user__username', 'session_key', 'ip_address']
    readonly_fields = ['session_key', 'started_at', 'last_activity', 'ended_at', 'duration_display']
    date_hierarchy = 'started_at'
    
    def duration_display(self, obj):
        duration = obj.duration
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        seconds = int(duration % 60)
        return f"{hours}h {minutes}m {seconds}s"
    duration_display.short_description = 'Duration'
    
    def has_add_permission(self, request):
        return False


@admin.register(LessonTimeTracking)
class LessonTimeTrackingAdmin(admin.ModelAdmin):
    list_display = ['student', 'lesson', 'time_spent_display', 'completed', 'completed_at']
    list_filter = ['completed', 'started_at', 'completed_at']
    search_fields = ['student__username', 'lesson__title']
    readonly_fields = ['started_at', 'completed_at']
    date_hierarchy = 'started_at'
    
    fieldsets = (
        ('Student & Lesson', {
            'fields': ('student', 'lesson')
        }),
        ('Time Tracking', {
            'fields': ('started_at', 'last_position', 'time_spent')
        }),
        ('Completion', {
            'fields': ('completed', 'completed_at')
        }),
        ('Engagement', {
            'fields': ('pause_count', 'replay_count')
        }),
    )
    
    def time_spent_display(self, obj):
        minutes = obj.time_spent // 60
        seconds = obj.time_spent % 60
        return f"{minutes}m {seconds}s"
    time_spent_display.short_description = 'Time Spent'


@admin.register(DailyActivitySummary)
class DailyActivitySummaryAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'login_count', 'lessons_completed', 'time_spent_display', 'engagement_score']
    list_filter = ['date', 'engagement_score']
    search_fields = ['user__username']
    readonly_fields = ['date']
    date_hierarchy = 'date'
    
    def time_spent_display(self, obj):
        hours = obj.total_time_spent // 3600
        minutes = (obj.total_time_spent % 3600) // 60
        return f"{hours}h {minutes}m"
    time_spent_display.short_description = 'Time Spent'
    
    def has_add_permission(self, request):
        return False
