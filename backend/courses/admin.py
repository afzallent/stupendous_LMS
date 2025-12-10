from django.contrib import admin
from django.utils.html import format_html
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from .models import Course, Lesson, Enrollment, Progress, Category, Coupon


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
