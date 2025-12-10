from rest_framework import serializers
from .models import ActivityLog
from django.contrib.auth import get_user_model

User = get_user_model()


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog model"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'action_type',
            'action_display',
            'timestamp',
            'description',
            'metadata',
            'content_type',
            'object_id',
        ]
        read_only_fields = ['id', 'timestamp']


class ActivityLogDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for ActivityLog with all fields"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']
