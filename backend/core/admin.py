from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Q
from .models import User, SiteSettings


class UserAdmin(BaseUserAdmin):
    """
    Custom User Admin with enhanced features for user management and password reset.
    """
    
    # Display fields in list view
    list_display = (
        'username',
        'email',
        'get_full_name',
        'get_roles',
        'is_active',
        'get_status_badge',
        'date_joined',
        'get_actions_links'
    )
    
    # Filters for sidebar
    list_filter = (
        'is_active',
        'is_staff',
        'is_student',
        'is_instructor',
        'date_joined',
    )
    
    # Search fields
    search_fields = (
        'username',
        'email',
        'first_name',
        'last_name',
    )
    
    # Fieldsets for edit view
    fieldsets = (
        ('Authentication', {
            'fields': ('username', 'password', 'password_reset_link')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'location', 'website')
        }),
        ('Profile', {
            'fields': ('avatar', 'bio', 'notification_preferences'),
            'classes': ('collapse',)
        }),
        ('Roles & Permissions', {
            'fields': ('is_student', 'is_instructor', 'is_staff', 'is_superuser')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Read-only fields
    readonly_fields = (
        'date_joined',
        'last_login',
        'created_at',
        'updated_at',
        'password',
        'password_reset_link'
    )
    
    # Add fieldsets for creation
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        ('Roles', {
            'classes': ('wide',),
            'fields': ('is_student', 'is_instructor', 'is_staff'),
        }),
    )
    
    # Ordering
    ordering = ('-date_joined',)
    
    # Actions
    actions = [
        'make_student',
        'make_instructor',
        'make_admin',
        'remove_student_role',
        'remove_instructor_role',
        'remove_admin_role',
        'activate_users',
        'deactivate_users',
        'reset_password_action',
    ]
    
    def get_full_name(self, obj):
        """Display full name or username if not available."""
        full_name = obj.get_full_name()
        return full_name if full_name else obj.username
    get_full_name.short_description = 'Full Name'
    
    def get_roles(self, obj):
        """Display user roles as badges."""
        roles = []
        if obj.is_superuser:
            roles.append('Superuser')
        if obj.is_staff:
            roles.append('Admin')
        if obj.is_instructor:
            roles.append('Instructor')
        if obj.is_student:
            roles.append('Student')
        
        if not roles:
            roles.append('User')
        
        return ', '.join(roles)
    get_roles.short_description = 'Roles'
    
    def get_status_badge(self, obj):
        """Display user status as a colored badge."""
        if obj.is_active:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 8px; border-radius: 3px;">Active</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 8px; border-radius: 3px;">Inactive</span>'
            )
    get_status_badge.short_description = 'Status'
    
    def get_actions_links(self, obj):
        """Display quick action links."""
        change_url = reverse('admin:core_user_change', args=[obj.pk])
        return format_html(
            '<a class="button" href="{}">Edit</a>',
            change_url,
        )
    get_actions_links.short_description = 'Actions'
    
    def password_reset_link(self, obj):
        """Display a link to change the user's password."""
        if obj.pk:
            change_password_url = reverse('admin:auth_user_password_change', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background-color: #417690; color: white; padding: 8px 15px; '
                'text-decoration: none; border-radius: 4px; display: inline-block;">Change Password</a>',
                change_password_url,
            )
        return "Save user first to change password"
    password_reset_link.short_description = 'Password Management'
    
    # Bulk actions
    def make_student(self, request, queryset):
        """Make selected users students."""
        updated = queryset.update(is_student=True)
        self.message_user(request, f'{updated} user(s) marked as student.')
    make_student.short_description = 'Mark selected users as Students'
    
    def make_instructor(self, request, queryset):
        """Make selected users instructors."""
        updated = queryset.update(is_instructor=True)
        self.message_user(request, f'{updated} user(s) marked as instructor.')
    make_instructor.short_description = 'Mark selected users as Instructors'
    
    def make_admin(self, request, queryset):
        """Make selected users admins."""
        updated = queryset.update(is_staff=True)
        self.message_user(request, f'{updated} user(s) marked as admin.')
    make_admin.short_description = 'Mark selected users as Admins'
    
    def remove_student_role(self, request, queryset):
        """Remove student role from selected users."""
        updated = queryset.update(is_student=False)
        self.message_user(request, f'Student role removed from {updated} user(s).')
    remove_student_role.short_description = 'Remove Student role'
    
    def remove_instructor_role(self, request, queryset):
        """Remove instructor role from selected users."""
        updated = queryset.update(is_instructor=False)
        self.message_user(request, f'Instructor role removed from {updated} user(s).')
    remove_instructor_role.short_description = 'Remove Instructor role'
    
    def remove_admin_role(self, request, queryset):
        """Remove admin role from selected users."""
        updated = queryset.update(is_staff=False)
        self.message_user(request, f'Admin role removed from {updated} user(s).')
    remove_admin_role.short_description = 'Remove Admin role'
    
    def activate_users(self, request, queryset):
        """Activate selected users."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated.')
    activate_users.short_description = 'Activate selected users'
    
    def deactivate_users(self, request, queryset):
        """Deactivate selected users."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) deactivated.')
    deactivate_users.short_description = 'Deactivate selected users'
    
    def reset_password_action(self, request, queryset):
        """Reset password for selected users (set to temporary password)."""
        from django.contrib.auth.models import make_password
        import secrets
        
        updated_users = []
        for user in queryset:
            # Generate a temporary password
            temp_password = secrets.token_urlsafe(12)
            user.set_password(temp_password)
            user.save()
            updated_users.append(f"{user.username}: {temp_password}")
        
        message = f'Password reset for {len(updated_users)} user(s):\n' + '\n'.join(updated_users)
        self.message_user(request, message)
    reset_password_action.short_description = 'Reset password for selected users'


# Register the User model with the custom admin
admin.site.register(User, UserAdmin)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """Admin interface for site settings (singleton)"""
    
    fieldsets = (
        ('Email Configuration', {
            'fields': (
                'email_backend',
                'email_host',
                'email_port',
                'email_use_tls',
                'email_use_ssl',
                'email_host_user',
                'email_host_password',
                'default_from_email',
            ),
            'description': 'Configure email settings for password resets and notifications. '
                          'For Gmail, use an App Password instead of your regular password.'
        }),
        ('Site Configuration', {
            'fields': ('site_name', 'site_url'),
            'description': 'General site settings used throughout the application.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        """Prevent adding more than one instance"""
        return not SiteSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of the singleton instance"""
        return False
    
    def changelist_view(self, request, extra_context=None):
        """Redirect to the edit page if instance exists"""
        from django.shortcuts import redirect
        from django.urls import reverse
        
        obj = SiteSettings.load()
        return redirect(reverse('admin:core_sitesettings_change', args=[obj.pk]))
