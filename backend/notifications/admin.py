from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'recipient',
        'notification_type',
        'title',
        'is_read',
        'created_at'
    ]
    list_filter = [
        'notification_type',
        'is_read',
        'created_at'
    ]
    search_fields = [
        'recipient__email',
        'recipient__first_name',
        'recipient__last_name',
        'title',
        'message'
    ]
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Recipient Information', {
            'fields': ('recipient', 'notification_type')
        }),
        ('Notification Content', {
            'fields': ('title', 'message', 'link')
        }),
        ('Related Objects', {
            'fields': ('related_course', 'related_user')
        }),
        ('Status', {
            'fields': ('is_read', 'created_at')
        }),
    )
