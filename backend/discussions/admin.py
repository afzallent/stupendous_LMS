from django.contrib import admin
from .models import DiscussionThread, DiscussionReply


class DiscussionReplyInline(admin.TabularInline):
    """Inline admin for replies within thread admin"""
    model = DiscussionReply
    extra = 0
    readonly_fields = ['author', 'created_at', 'updated_at']
    fields = ['author', 'content', 'is_solution', 'is_deleted', 'created_at']


@admin.register(DiscussionThread)
class DiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'author', 'is_pinned', 'is_locked', 'is_deleted', 'reply_count', 'created_at', 'last_activity_at']
    list_filter = ['is_pinned', 'is_locked', 'is_deleted', 'created_at', 'course']
    search_fields = ['title', 'content', 'author__username', 'course__title']
    readonly_fields = ['created_at', 'updated_at', 'last_activity_at']
    inlines = [DiscussionReplyInline]
    
    fieldsets = (
        ('Thread Information', {
            'fields': ('course', 'author', 'title', 'content')
        }),
        ('Status', {
            'fields': ('is_pinned', 'is_locked', 'is_deleted')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_activity_at'),
            'classes': ('collapse',)
        }),
    )
    
    def reply_count(self, obj):
        """Display the number of replies"""
        return obj.replies.filter(is_deleted=False).count()
    reply_count.short_description = 'Replies'


@admin.register(DiscussionReply)
class DiscussionReplyAdmin(admin.ModelAdmin):
    list_display = ['thread_title', 'author', 'content_preview', 'is_solution', 'is_deleted', 'created_at']
    list_filter = ['is_solution', 'is_deleted', 'created_at']
    search_fields = ['content', 'author__username', 'thread__title']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Reply Information', {
            'fields': ('thread', 'author', 'content')
        }),
        ('Status', {
            'fields': ('is_solution', 'is_deleted')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def thread_title(self, obj):
        """Display the thread title"""
        return obj.thread.title
    thread_title.short_description = 'Thread'
    
    def content_preview(self, obj):
        """Display a preview of the reply content"""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
