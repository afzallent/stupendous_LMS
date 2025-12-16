from django.contrib import admin
from .models import (
    XAPIStatement, XAPIAttachment, XAPIVerb, XAPIActivityType,
    XAPIConfiguration, XAPIAuditLog
)


@admin.register(XAPIStatement)
class XAPIStatementAdmin(admin.ModelAdmin):
    list_display = ('statement_id', 'actor_name', 'get_verb_display', 'object_id', 'timestamp', 'voided')
    list_filter = ('voided', 'timestamp', 'verb_id')
    search_fields = ('actor_name', 'actor_mbox', 'object_id', 'statement_id')
    readonly_fields = ('statement_id', 'stored')
    date_hierarchy = 'timestamp'
    
    def get_verb_display(self, obj):
        return obj.verb_display.get('en-US', 'unknown')
    get_verb_display.short_description = 'Verb'


@admin.register(XAPIAttachment)
class XAPIAttachmentAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'statement', 'content_type', 'length')
    list_filter = ('content_type',)
    search_fields = ('statement__statement_id', 'usage_type')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', 'Attachment')
    get_display_name.short_description = 'Display Name'


@admin.register(XAPIVerb)
class XAPIVerbAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'iri', 'description')
    search_fields = ('iri', 'description')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', obj.iri)
    get_display_name.short_description = 'Display Name'


@admin.register(XAPIActivityType)
class XAPIActivityTypeAdmin(admin.ModelAdmin):
    list_display = ('get_display_name', 'iri', 'description')
    search_fields = ('iri', 'description')
    
    def get_display_name(self, obj):
        return obj.display.get('en-US', obj.iri)
    get_display_name.short_description = 'Display Name'


@admin.register(XAPIConfiguration)
class XAPIConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for xAPI Configuration (singleton)"""
    list_display = ('__str__', 'lrs_auth_enabled', 'auto_generate_statements', 'use_pseudonymous_actors')
    
    fieldsets = (
        ('LRS Settings', {
            'fields': ('lrs_endpoint', 'lrs_auth_enabled', 'lrs_basic_auth_enabled', 'lrs_oauth_enabled')
        }),
        ('Statement Generation', {
            'fields': (
                'auto_generate_statements',
                'track_video_interactions',
                'track_quiz_attempts',
                'track_lesson_completions',
                'track_course_enrollments'
            )
        }),
        ('Privacy Settings', {
            'fields': (
                'use_pseudonymous_actors',
                'include_pii_in_statements',
                'allow_student_data_export',
                'allow_student_data_deletion'
            )
        }),
        ('SCORM Settings', {
            'fields': ('scorm_12_enabled', 'scorm_2004_enabled', 'max_package_size_mb')
        }),
    )
    
    def has_add_permission(self, request):
        """Prevent adding new configuration instances (singleton)"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting the configuration (singleton)"""
        return False


@admin.register(XAPIAuditLog)
class XAPIAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for xAPI Audit Log (read-only)"""
    list_display = ('audit_id', 'user', 'operation_type', 'resource_type', 'success', 'timestamp')
    list_filter = ('operation_type', 'resource_type', 'success', 'timestamp')
    search_fields = ('user__username', 'resource_id', 'ip_address')
    readonly_fields = (
        'audit_id', 'user', 'operation_type', 'resource_type', 'resource_id',
        'ip_address', 'user_agent', 'details', 'success', 'error_message', 'timestamp'
    )
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        """Prevent manually adding audit log entries"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting audit log entries"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing audit log entries"""
        return False
