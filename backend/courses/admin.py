from django.contrib import admin
from .models import Course, Lesson, Enrollment, Progress, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'category', 'status', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'instructor__username']
    readonly_fields = ['created_at', 'updated_at', 'published_at']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    search_fields = ['title', 'content']
    ordering = ['course', 'order']


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'enrolled_at']
    list_filter = ['enrolled_at', 'course']
    search_fields = ['student__username', 'course__title']


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ['student', 'lesson', 'completed', 'completed_at']
    list_filter = ['completed', 'completed_at']
    search_fields = ['student__username', 'lesson__title']
