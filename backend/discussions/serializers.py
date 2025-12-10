from rest_framework import serializers
from .models import DiscussionThread, DiscussionReply
from core.serializers import UserSerializer


class AuthorSerializer(serializers.ModelSerializer):
    """
    Serializer for author details in discussions.
    
    Provides basic user information for discussion authors.
    """
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSerializer.Meta.model
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'is_instructor']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'avatar_url', 'is_instructor']
    
    def get_avatar_url(self, obj):
        """Get avatar URL if exists"""
        if hasattr(obj, 'avatar') and obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class DiscussionReplySerializer(serializers.ModelSerializer):
    """
    Serializer for discussion replies.
    
    Includes author details and reply content.
    """
    author = AuthorSerializer(read_only=True)
    
    class Meta:
        model = DiscussionReply
        fields = ['id', 'thread', 'author', 'content', 'is_solution', 
                  'is_deleted', 'created_at', 'updated_at']
        read_only_fields = ['id', 'thread', 'author', 'is_deleted', 'created_at', 'updated_at']


class DiscussionThreadSerializer(serializers.ModelSerializer):
    """
    Serializer for discussion threads (list view).
    
    Includes author details and reply count.
    """
    author = AuthorSerializer(read_only=True)
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DiscussionThread
        fields = ['id', 'course', 'author', 'title', 'content', 'is_pinned', 
                  'is_locked', 'is_deleted', 'reply_count', 'created_at', 
                  'updated_at', 'last_activity_at']
        read_only_fields = ['id', 'author', 'is_deleted', 'created_at', 
                            'updated_at', 'last_activity_at']
    
    def get_reply_count(self, obj):
        """Get count of non-deleted replies"""
        return obj.replies.filter(is_deleted=False).count()


class ThreadDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for discussion threads with nested replies.
    
    Includes all replies in chronological order.
    """
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DiscussionThread
        fields = ['id', 'course', 'author', 'title', 'content', 'is_pinned', 
                  'is_locked', 'is_deleted', 'replies', 'reply_count', 
                  'created_at', 'updated_at', 'last_activity_at']
        read_only_fields = ['id', 'author', 'is_deleted', 'created_at', 
                            'updated_at', 'last_activity_at']
    
    def get_replies(self, obj):
        """Get all non-deleted replies in chronological order"""
        replies = obj.replies.filter(is_deleted=False).order_by('created_at')
        return DiscussionReplySerializer(replies, many=True, context=self.context).data
    
    def get_reply_count(self, obj):
        """Get count of non-deleted replies"""
        return obj.replies.filter(is_deleted=False).count()
