from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    
    Adds role flags (student/instructor) and profile fields.
    """
    # Language choices for player interface
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('hi', 'Hindi'),
        ('es', 'Spanish'),
        ('fr', 'French'),
        ('de', 'German'),
        ('pt', 'Portuguese'),
        ('ja', 'Japanese'),
        ('ko', 'Korean'),
        ('zh', 'Chinese'),
        ('ar', 'Arabic'),
        ('ru', 'Russian'),
        ('it', 'Italian'),
        ('ta', 'Tamil'),
        ('te', 'Telugu'),
        ('bn', 'Bengali'),
        ('mr', 'Marathi'),
        ('gu', 'Gujarati'),
        ('kn', 'Kannada'),
        ('ml', 'Malayalam'),
        ('pa', 'Punjabi'),
    ]
    
    # Role flags
    is_student = models.BooleanField(default=False, help_text="Designates whether this user is a student.")
    is_instructor = models.BooleanField(default=False, help_text="Designates whether this user is an instructor.")
    
    # Profile fields
    avatar = models.ImageField(
        upload_to='avatars/', 
        null=True, 
        blank=True,
        help_text="User profile picture"
    )
    bio = models.TextField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="User biography"
    )
    phone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        help_text="Contact phone number"
    )
    location = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="User location"
    )
    website = models.URLField(
        blank=True, 
        null=True,
        help_text="Personal website URL"
    )
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="User notification preferences"
    )
    expertise = models.TextField(
        blank=True,
        null=True,
        help_text="Areas of expertise (comma-separated for trainers)"
    )
    preferred_language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en',
        help_text="Preferred language for video player interface and captions"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-date_joined']


class SiteSettings(models.Model):
    """
    Singleton model for site-wide settings.
    Only one instance should exist - configurable via Django admin.
    """
    # Email Configuration
    email_backend = models.CharField(
        max_length=255,
        default='django.core.mail.backends.console.EmailBackend',
        help_text="Email backend (console for dev, smtp for production)"
    )
    email_host = models.CharField(
        max_length=255,
        default='smtp.gmail.com',
        blank=True,
        help_text="SMTP server hostname (e.g., smtp.gmail.com)"
    )
    email_port = models.IntegerField(
        default=587,
        help_text="SMTP server port (587 for TLS, 465 for SSL)"
    )
    email_use_tls = models.BooleanField(
        default=True,
        help_text="Use TLS encryption (recommended for port 587)"
    )
    email_use_ssl = models.BooleanField(
        default=False,
        help_text="Use SSL encryption (for port 465, mutually exclusive with TLS)"
    )
    email_host_user = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP username/email address"
    )
    email_host_password = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP password or app-specific password"
    )
    default_from_email = models.EmailField(
        default='noreply@coursecompass.com',
        help_text="Default 'from' email address for system emails"
    )
    
    # Site Configuration
    site_name = models.CharField(
        max_length=100,
        default='CourseCompass',
        help_text="Name of the site (used in emails and UI)"
    )
    site_url = models.URLField(
        default='http://localhost:3000',
        help_text="Frontend URL (used in password reset links)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'
    
    def __str__(self):
        return f"Site Settings (Last updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists (singleton pattern)"""
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of the singleton instance"""
        pass
    
    @classmethod
    def load(cls):
        """Load the singleton instance, creating it if it doesn't exist"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
