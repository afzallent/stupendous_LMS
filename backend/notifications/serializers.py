from rest_framework import serializers
from .models import Notification
from core.serializers import UserSerializer
from courses.serializers import CourseSerializer
from django.utils import timezone
from datetime import timedelta


class RelatedUserSerializer(serializers.ModelSerializer):
    """
    Serializer for related user in notifications.
    
    Provides basic user information for the user related to the notification.
    """
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSerializer.Meta.model
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'avatar_url']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email', 'avatar_url']
    
    def get_avatar_url(self, obj):
        """Get avatar URL if exists"""
        if hasattr(obj, 'avatar') and obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class RelatedCourseSerializer(serializers.ModelSerializer):
    """
    Serializer for related course in notifications.
    
    Provides basic course information for the course related to the notification.
    """
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    
    class Meta:
        model = CourseSerializer.Meta.model
        fields = ['id', 'title', 'instructor_name', 'thumbnail']
        read_only_fields = ['id', 'title', 'instructor_name', 'thumbnail']


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for notifications with all fields.
    
    Includes related course and user details, plus a computed time_ago field
    for displaying relative time (e.g., "2 hours ago", "3 days ago").
    """
    related_course = RelatedCourseSerializer(read_only=True)
    related_user = RelatedUserSerializer(read_only=True)
    time_ago = serializers.SerializerMethodField()
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'related_course',
            'related_user',
            'link',
            'is_read',
            'created_at',
            'time_ago'
        ]
        read_only_fields = ['id', 'recipient', 'created_at', 'time_ago']
    
    def get_time_ago(self, obj):
        """
        Calculate and return human-readable time difference.
        
        Returns strings like:
        - "just now" (< 1 minute)
        - "5 minutes ago"
        - "2 hours ago"
        - "3 days ago"
        - "2 weeks ago"
        - "1 month ago"
        - "6 months ago"
        - "1 year ago"
        """
        now = timezone.now()
        diff = now - obj.created_at
        
        # Less than 1 minute
        if diff < timedelta(minutes=1):
            return "just now"
        
        # Minutes
        if diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        
        # Hours
        if diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        
        # Days
        if diff < timedelta(weeks=1):
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
        
        # Weeks
        if diff < timedelta(days=30):
            weeks = int(diff.days / 7)
            return f"{weeks} week{'s' if weeks != 1 else ''} ago"
        
        # Months
        if diff < timedelta(days=365):
            months = int(diff.days / 30)
            return f"{months} month{'s' if months != 1 else ''} ago"
        
        # Years
        years = int(diff.days / 365)
        return f"{years} year{'s' if years != 1 else ''} ago"
