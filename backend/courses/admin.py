from django.contrib import admin
from django.utils.html import format_html
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from .models import (
    Course, Lesson, Enrollment, Progress, Category, Coupon, Chapter,
    MarkdownLesson, H5PPackage, H5PContentState, HTMLEmbed, ContentInteraction
)


# Define resources for import/export
class CourseResource(resources.ModelResource):
    class Meta:
        model = Course
        fields = ('id', 'title', 'description', 'instructor__username', 'category__name', 
                  'status', 'price', 'original_price', 'is_free', 'created_at')
        export_order = fields


class LessonResource(resources.ModelResource):
    class Meta:
        model = Lesson
        fields = ('id', 'course__title', 'title', 'order', 'video_url', 'content')
        export_order = fields


class EnrollmentResource(resources.ModelResource):
    class Meta:
        model = Enrollment
        fields = ('id', 'student__username', 'student__email', 'course__title', 'enrolled_at')
        export_order = fields


class ProgressResource(resources.ModelResource):
    class Meta:
        model = Progress
        fields = ('id', 'student__username', 'lesson__title', 'lesson__course__title', 
                  'completed', 'completed_at')
        export_order = fields


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percentage', 'get_status_badge', 'times_used', 'max_uses', 'valid_from', 'valid_until']
    list_filter = ['is_active', 'created_at', 'valid_from', 'valid_until']
    search_fields = ['code', 'description']
    readonly_fields = ['times_used', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Coupon Information', {
            'fields': ('code', 'description', 'is_active')
        }),
        ('Discount', {
            'fields': ('discount_percentage',)
        }),
        ('Usage Limits', {
            'fields': ('max_uses', 'times_used')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_status_badge(self, obj):
        """Display coupon status as a colored badge."""
        if obj.is_valid():
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; border-radius: 3px;">Valid</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 8px; border-radius: 3px;">Invalid</span>'
            )
    get_status_badge.short_description = 'Status'


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'is_locked', 'lesson_count', 'created_at']
    list_filter = ['course', 'is_locked', 'created_at']
    search_fields = ['title', 'description', 'course__title']
    ordering = ['course', 'order']
    
    fieldsets = (
        ('Chapter Information', {
            'fields': ('course', 'title', 'description', 'order')
        }),
        ('Access Control', {
            'fields': ('is_locked', 'prerequisite_chapter'),
            'description': 'Control chapter access and prerequisites'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def lesson_count(self, obj):
        """Display number of lessons in chapter"""
        return obj.lessons.count()
    lesson_count.short_description = 'Lessons'


@admin.register(Course)
class CourseAdmin(ImportExportModelAdmin):
    resource_class = CourseResource
    list_display = ['title', 'instructor', 'category', 'status', 'get_price_display', 'created_at']
    list_filter = ['status', 'category', 'is_free', 'created_at']
    search_fields = ['title', 'description', 'instructor__username']
    readonly_fields = ['created_at', 'updated_at', 'published_at']
    
    fieldsets = (
        ('Course Information', {
            'fields': ('title', 'description', 'instructor', 'category', 'thumbnail')
        }),
        ('Pricing', {
            'fields': ('is_free', 'price', 'original_price'),
            'description': 'Set pricing for the course. Mark as free or set a price.'
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'published_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_price_display(self, obj):
        """Display price in list view"""
        if obj.is_free:
            return format_html('<span style="color: green; font-weight: bold;">FREE</span>')
        return f'${obj.price}'
    get_price_display.short_description = 'Price'


@admin.register(Lesson)
class LessonAdmin(ImportExportModelAdmin):
    resource_class = LessonResource
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    search_fields = ['title', 'content']
    ordering = ['course', 'order']


@admin.register(Enrollment)
class EnrollmentAdmin(ImportExportModelAdmin):
    resource_class = EnrollmentResource
    list_display = ['student', 'course', 'enrolled_at']
    list_filter = ['enrolled_at', 'course']
    search_fields = ['student__username', 'course__title']


@admin.register(Progress)
class ProgressAdmin(ImportExportModelAdmin):
    resource_class = ProgressResource
    list_display = ['student', 'lesson', 'completed', 'completed_at']
    list_filter = ['completed', 'completed_at']
    search_fields = ['student__username', 'lesson__title']



# Content Type Model Admin Classes

@admin.register(MarkdownLesson)
class MarkdownLessonAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'word_count', 'estimated_reading_time', 'highlight_theme', 'updated_at']
    list_filter = ['highlight_theme', 'allow_html', 'created_at']
    search_fields = ['lesson__title', 'markdown_text']
    readonly_fields = ['word_count', 'estimated_reading_time', 'rendered_html', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Lesson', {
            'fields': ('lesson',)
        }),
        ('Content', {
            'fields': ('markdown_text', 'rendered_html'),
            'description': 'Enter Markdown content. HTML preview is auto-generated.'
        }),
        ('Settings', {
            'fields': ('highlight_theme', 'allow_html')
        }),
        ('Metrics', {
            'fields': ('word_count', 'estimated_reading_time'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(H5PPackage)
class H5PPackageAdmin(admin.ModelAdmin):
    list_display = ['title', 'lesson', 'library_name', 'library_version', 'uploaded_by', 'uploaded_at']
    list_filter = ['library_name', 'track_xapi', 'uploaded_at']
    search_fields = ['title', 'description', 'library_name', 'lesson__title']
    readonly_fields = ['h5p_json', 'uploaded_at', 'updated_at']
    
    fieldsets = (
        ('Lesson', {
            'fields': ('lesson',)
        }),
        ('Package Info', {
            'fields': ('title', 'description', 'package_file', 'content_path')
        }),
        ('Library', {
            'fields': ('library_name', 'library_version', 'h5p_json'),
            'classes': ('collapse',)
        }),
        ('Embed Settings', {
            'fields': ('embed_width', 'embed_height', 'allow_fullscreen')
        }),
        ('Tracking', {
            'fields': ('track_xapi',)
        }),
        ('Upload Info', {
            'fields': ('uploaded_by', 'uploaded_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(H5PContentState)
class H5PContentStateAdmin(admin.ModelAdmin):
    list_display = ['student', 'h5p_package', 'completion_status', 'score', 'last_accessed']
    list_filter = ['completion_status', 'last_accessed']
    search_fields = ['student__username', 'h5p_package__title']
    readonly_fields = ['started_at', 'completed_at', 'last_accessed']
    
    fieldsets = (
        ('Student & Content', {
            'fields': ('student', 'h5p_package')
        }),
        ('State', {
            'fields': ('state_data',),
            'classes': ('collapse',)
        }),
        ('Score', {
            'fields': ('score', 'max_score')
        }),
        ('Completion', {
            'fields': ('completion_status', 'started_at', 'completed_at', 'last_accessed')
        }),
        ('Tracking', {
            'fields': ('total_time_spent', 'interaction_count'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HTMLEmbed)
class HTMLEmbedAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'embed_type', 'width', 'height', 'enable_xapi_messaging', 'updated_at']
    list_filter = ['embed_type', 'enable_xapi_messaging', 'allow_scripts']
    search_fields = ['lesson__title', 'external_url']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Lesson', {
            'fields': ('lesson',)
        }),
        ('Embed Type', {
            'fields': ('embed_type',)
        }),
        ('Content', {
            'fields': ('external_url', 'inline_html'),
            'description': 'Provide URL for external embeds or HTML for inline embeds.'
        }),
        ('Dimensions', {
            'fields': ('width', 'height')
        }),
        ('Sandbox Security', {
            'fields': ('allow_scripts', 'allow_forms', 'allow_popups', 
                      'allow_same_origin', 'allow_top_navigation', 'custom_sandbox_attrs'),
            'description': 'Configure iframe sandbox permissions for security.'
        }),
        ('xAPI Messaging', {
            'fields': ('enable_xapi_messaging', 'allowed_origins'),
            'description': 'Configure xAPI statement capture from embedded content.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ContentInteraction)
class ContentInteractionAdmin(admin.ModelAdmin):
    list_display = ['student', 'lesson', 'interaction_type', 'timestamp', 'has_xapi_statement']
    list_filter = ['interaction_type', 'timestamp', 'lesson__content_type']
    search_fields = ['student__username', 'lesson__title']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Interaction', {
            'fields': ('student', 'lesson', 'interaction_type')
        }),
        ('Data', {
            'fields': ('interaction_data',),
            'classes': ('collapse',)
        }),
        ('xAPI', {
            'fields': ('xapi_statement',)
        }),
        ('Timestamp', {
            'fields': ('timestamp',)
        }),
    )
    
    def has_xapi_statement(self, obj):
        """Display whether interaction has linked xAPI statement."""
        if obj.xapi_statement:
            return format_html(
                '<span style="color: green;">✓</span>'
            )
        return format_html(
            '<span style="color: gray;">-</span>'
        )
    has_xapi_statement.short_description = 'xAPI'
