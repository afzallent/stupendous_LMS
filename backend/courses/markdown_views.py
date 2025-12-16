"""
API Views for Markdown content management.

Provides endpoints for:
- POST /api/lessons/{id}/markdown/ - Create/update markdown content
- GET /api/lessons/{id}/markdown/ - Retrieve markdown content and rendered HTML
- POST /api/lessons/{id}/markdown/complete/ - Mark lesson as completed
- POST /api/lessons/{id}/markdown/track/ - Track scroll progress

Requirements: 11.1, 11.2, 11.4, 11.5
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Lesson, Enrollment
from .content_models import MarkdownLesson
from .markdown_manager import MarkdownContentManager
from .markdown_serializers import (
    MarkdownContentCreateSerializer,
    MarkdownContentResponseSerializer,
    MarkdownCompleteSerializer,
    MarkdownCompleteResponseSerializer,
    MarkdownTrackScrollSerializer,
    MarkdownTrackScrollResponseSerializer,
)


class MarkdownContentView(APIView):
    """
    API view for creating/updating and retrieving markdown content.
    
    POST /api/lessons/{lesson_id}/markdown/
        Create or update markdown content for a lesson.
        Requires instructor permission.
        
    GET /api/lessons/{lesson_id}/markdown/
        Retrieve markdown content and rendered HTML.
        Requires enrollment or instructor permission.
    
    Requirements: 11.1, 11.2
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, lesson_id):
        """
        Retrieve markdown content for a lesson.
        
        Returns:
            - content: Raw markdown text
            - rendered_html: Rendered HTML
            - toc: Table of contents
            - word_count: Word count
            - estimated_reading_time: Estimated reading time in minutes
        
        Requirements: 11.2
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be enrolled or instructor
        if not self._has_read_permission(request.user, lesson):
            return Response(
                {'error': 'You must be enrolled in this course to view this content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson has markdown content
        try:
            markdown_lesson = lesson.markdown_lesson
        except MarkdownLesson.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have markdown content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MarkdownContentResponseSerializer(markdown_lesson)
        return Response(serializer.data)
    
    def post(self, request, lesson_id):
        """
        Create or update markdown content for a lesson.
        
        Request body:
            - content: Raw markdown text (required)
            - highlight_theme: Syntax highlighting theme (optional)
            - allow_html: Allow raw HTML (optional, default: false)
        
        Requirements: 11.1
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be instructor of the course
        if not self._has_write_permission(request.user, lesson):
            return Response(
                {'error': 'Only the course instructor can modify content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MarkdownContentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update markdown content
        manager = MarkdownContentManager(
            highlight_theme=serializer.validated_data.get('highlight_theme', 'default'),
            allow_html=serializer.validated_data.get('allow_html', False)
        )
        
        markdown_lesson = manager.update_markdown_lesson(
            lesson=lesson,
            content=serializer.validated_data['content'],
            highlight_theme=serializer.validated_data.get('highlight_theme', 'default'),
            allow_html=serializer.validated_data.get('allow_html', False)
        )
        
        # Update lesson content_type if needed
        if lesson.content_type != Lesson.CONTENT_TYPE_MARKDOWN:
            lesson.content_type = Lesson.CONTENT_TYPE_MARKDOWN
            lesson.save()
        
        response_serializer = MarkdownContentResponseSerializer(markdown_lesson)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def _has_read_permission(self, user, lesson):
        """Check if user can read the lesson content."""
        # Instructors can always read
        if lesson.course.instructor == user:
            return True
        
        # Check if user is enrolled
        return Enrollment.objects.filter(
            student=user,
            course=lesson.course
        ).exists()
    
    def _has_write_permission(self, user, lesson):
        """Check if user can write/modify the lesson content."""
        return lesson.course.instructor == user


class MarkdownCompleteView(APIView):
    """
    API view for marking a markdown lesson as completed.
    
    POST /api/lessons/{lesson_id}/markdown/complete/
        Mark the lesson as completed and generate xAPI statement.
        Requires enrollment.
    
    Requirements: 11.4, 11.5
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, lesson_id):
        """
        Mark markdown lesson as completed.
        
        Request body:
            - time_spent: Time spent reading in seconds (optional)
        
        Returns:
            - success: Boolean
            - xapi_statement_id: UUID of generated statement
            - progress_id: ID of progress record
        
        Requirements: 11.4, 11.5
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check if user is enrolled
        if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
            return Response(
                {'error': 'You must be enrolled in this course to complete lessons'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson has markdown content
        try:
            markdown_lesson = lesson.markdown_lesson
        except MarkdownLesson.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have markdown content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MarkdownCompleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        time_spent = serializer.validated_data.get('time_spent')
        
        # Mark lesson as completed
        manager = MarkdownContentManager()
        progress, statement = manager.mark_lesson_completed(
            student=request.user,
            lesson=lesson,
            time_spent=time_spent
        )
        
        response_data = {
            'success': True,
            'xapi_statement_id': str(statement.statement_id),
            'progress_id': progress.id,
            'message': 'Lesson marked as completed'
        }
        
        response_serializer = MarkdownCompleteResponseSerializer(data=response_data)
        response_serializer.is_valid()
        
        return Response(response_data, status=status.HTTP_200_OK)


class MarkdownTrackScrollView(APIView):
    """
    API view for tracking scroll progress in markdown lessons.
    
    POST /api/lessons/{lesson_id}/markdown/track/
        Track scroll progress for reading tracking.
        Requires enrollment.
    
    Requirements: 11.4
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, lesson_id):
        """
        Track scroll progress.
        
        Request body:
            - scroll_percentage: Percentage scrolled (0-100)
            - time_spent: Time spent reading in seconds (optional)
        
        Returns:
            - success: Boolean
            - interaction_id: ID of recorded interaction
        
        Requirements: 11.4
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check if user is enrolled
        if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
            return Response(
                {'error': 'You must be enrolled in this course to track progress'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson has markdown content
        try:
            markdown_lesson = lesson.markdown_lesson
        except MarkdownLesson.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have markdown content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MarkdownTrackScrollSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        scroll_percentage = serializer.validated_data['scroll_percentage']
        time_spent = serializer.validated_data.get('time_spent')
        
        # Track scroll progress
        manager = MarkdownContentManager()
        interaction = manager.track_scroll_progress(
            student=request.user,
            lesson=lesson,
            scroll_percentage=scroll_percentage,
            time_spent=time_spent
        )
        
        response_data = {
            'success': True,
            'interaction_id': interaction.id,
            'message': f'Scroll progress tracked: {scroll_percentage}%'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
