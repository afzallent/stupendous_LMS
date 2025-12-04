from django.contrib import admin
from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_id', 'student_name', 'course_title', 'issued_at', 'is_valid']
    list_filter = ['is_valid', 'issued_at']
    search_fields = ['student_name', 'course_title', 'certificate_id']
    readonly_fields = ['certificate_id', 'issued_at']
    
    fieldsets = (
        ('Certificate Information', {
            'fields': ('certificate_id', 'student', 'course', 'issued_at', 'completion_date')
        }),
        ('Details', {
            'fields': ('student_name', 'course_title', 'instructor_name')
        }),
        ('Verification', {
            'fields': ('is_valid', 'revoked_at', 'revoked_reason')
        }),
    )
