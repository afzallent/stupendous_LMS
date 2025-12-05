from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    
    Adds role flags (student/instructor) and profile fields.
    """
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
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ['-date_joined']
