"""
API Views for HTML Embed content management.

Provides endpoints for:
- POST /api/lessons/{id}/html-embed/ - Create/update embed configuration
- GET /api/lessons/{id}/html-embed/ - Get embed HTML and xAPI listener script
- POST /api/lessons/{id}/html-embed/xapi/ - Receive xAPI statements via postMessage

Requirements: 13.1, 13.4, 13.5
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Lesson, Enrollment
from .content_models import HTMLEmbed
from .html_embed_manager import HTMLEmbedManager
from .html_embed_serializers import (
    HTMLEmbedCreateSerializer,
    HTMLEmbedResponseSerializer,
    HTMLEmbedXAPISerializer,
    HTMLEmbedXAPIResponseSerializer,
    HTMLEmbedInfoSerializer,
)


class HTMLEmbedContentView(APIView):
    """
    API view for creating/updating and retrieving HTML embed content.
    
    POST /api/lessons/{lesson_id}/html-embed/
        Create or update HTML embed configuration for a lesson.
        Requires instructor permission.
        
    GET /api/lessons/{lesson_id}/html-embed/
        Retrieve HTML embed content and xAPI listener script.
        Requires enrollment or instructor permission.
    
    Requirements: 13.1, 13.2, 13.5
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, lesson_id):
        """
        Retrieve HTML embed content for a lesson.
        
        Returns:
            - embed_type: Type of embed (url or inline)
            - iframe_html: Generated iframe HTML
            - xapi_listener_script: JavaScript for xAPI capture
            - sandbox_attributes: Applied sandbox permissions
            - width, height: Iframe dimensions
        
        Requirements: 13.2
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be enrolled or instructor
        if not self._has_read_permission(request.user, lesson):
            return Response(
                {'error': 'You must be enrolled in this course to view this content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson has HTML embed content
        try:
            html_embed = lesson.html_embed
        except HTMLEmbed.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have HTML embed content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate iframe HTML and xAPI listener
        manager = HTMLEmbedManager()
        embed_data = manager.generate_iframe_html(
            embed=html_embed,
            student=request.user,
            include_xapi_listener=html_embed.enable_xapi_messaging
        )
        
        # Build response
        response_data = {
            'id': html_embed.pk,
            'lesson_id': lesson.pk,
            'embed_type': html_embed.embed_type,
            'external_url': html_embed.external_url if html_embed.embed_type == HTMLEmbed.EMBED_TYPE_URL else '',
            'inline_html': html_embed.inline_html if html_embed.embed_type == HTMLEmbed.EMBED_TYPE_INLINE else '',
            'width': html_embed.width,
            'height': html_embed.height,
            'sandbox_attributes': embed_data['sandbox_attributes'],
            'allow_scripts': html_embed.allow_scripts,
            'allow_forms': html_embed.allow_forms,
            'allow_popups': html_embed.allow_popups,
            'allow_same_origin': html_embed.allow_same_origin,
            'allow_top_navigation': html_embed.allow_top_navigation,
            'enable_xapi_messaging': html_embed.enable_xapi_messaging,
            'allowed_origins': html_embed.allowed_origins,
            'iframe_html': embed_data['iframe_html'],
            'xapi_listener_script': embed_data['xapi_listener_script'],
            'created_at': html_embed.created_at,
            'updated_at': html_embed.updated_at,
        }
        
        return Response(response_data)
    
    def post(self, request, lesson_id):
        """
        Create or update HTML embed configuration for a lesson.
        
        Request body:
            - embed_type: 'url' or 'inline' (required)
            - external_url: URL to embed (required for URL type)
            - inline_html: HTML content (required for inline type)
            - width, height: Iframe dimensions (optional)
            - allow_scripts, allow_forms, etc.: Sandbox permissions (optional)
            - enable_xapi_messaging: Enable xAPI capture (optional)
            - allowed_origins: List of allowed origins (optional)
        
        Requirements: 13.1, 13.5
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be instructor of the course
        if not self._has_write_permission(request.user, lesson):
            return Response(
                {'error': 'Only the course instructor can modify content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = HTMLEmbedCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Create or update HTML embed
        manager = HTMLEmbedManager()
        
        try:
            html_embed = manager.create_embed(
                lesson=lesson,
                embed_type=data['embed_type'],
                external_url=data.get('external_url', ''),
                inline_html=data.get('inline_html', ''),
                width=data.get('width', '100%'),
                height=data.get('height', '600px'),
                allow_scripts=data.get('allow_scripts', False),
                allow_forms=data.get('allow_forms', False),
                allow_popups=data.get('allow_popups', False),
                allow_same_origin=data.get('allow_same_origin', False),
                allow_top_navigation=data.get('allow_top_navigation', False),
                custom_sandbox_attrs=data.get('custom_sandbox_attrs', ''),
                enable_xapi_messaging=data.get('enable_xapi_messaging', False),
                allowed_origins=data.get('allowed_origins', [])
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate iframe HTML for response
        embed_data = manager.generate_iframe_html(
            embed=html_embed,
            student=request.user,
            include_xapi_listener=html_embed.enable_xapi_messaging
        )
        
        # Build response
        response_data = {
            'id': html_embed.pk,
            'lesson_id': lesson.pk,
            'embed_type': html_embed.embed_type,
            'external_url': html_embed.external_url if html_embed.embed_type == HTMLEmbed.EMBED_TYPE_URL else '',
            'inline_html': html_embed.inline_html if html_embed.embed_type == HTMLEmbed.EMBED_TYPE_INLINE else '',
            'width': html_embed.width,
            'height': html_embed.height,
            'sandbox_attributes': embed_data['sandbox_attributes'],
            'allow_scripts': html_embed.allow_scripts,
            'allow_forms': html_embed.allow_forms,
            'allow_popups': html_embed.allow_popups,
            'allow_same_origin': html_embed.allow_same_origin,
            'allow_top_navigation': html_embed.allow_top_navigation,
            'enable_xapi_messaging': html_embed.enable_xapi_messaging,
            'allowed_origins': html_embed.allowed_origins,
            'iframe_html': embed_data['iframe_html'],
            'xapi_listener_script': embed_data['xapi_listener_script'],
            'created_at': html_embed.created_at,
            'updated_at': html_embed.updated_at,
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def delete(self, request, lesson_id):
        """
        Delete HTML embed configuration for a lesson.
        
        Requirements: 13.1
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be instructor of the course
        if not self._has_write_permission(request.user, lesson):
            return Response(
                {'error': 'Only the course instructor can modify content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson has HTML embed content
        try:
            html_embed = lesson.html_embed
        except HTMLEmbed.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have HTML embed content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        manager = HTMLEmbedManager()
        manager.delete_embed(html_embed)
        
        return Response(
            {'success': True, 'message': 'HTML embed deleted successfully'},
            status=status.HTTP_200_OK
        )
    
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


class HTMLEmbedXAPIView(APIView):
    """
    API view for receiving xAPI statements from embedded content via postMessage.
    
    POST /api/lessons/{lesson_id}/html-embed/xapi/
        Receive and process xAPI statements from embedded content.
        Requires enrollment.
    
    Requirements: 13.4
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, lesson_id):
        """
        Receive xAPI statement from embedded content.
        
        Request body:
            - statement: xAPI statement object (required)
            - origin: Origin of the postMessage (optional)
        
        Returns:
            - success: Boolean
            - statement_id: UUID of stored statement (if successful)
            - message: Status message
            - errors: List of errors (if any)
        
        Requirements: 13.4
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check if user is enrolled
        if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
            # Also allow instructors
            if lesson.course.instructor != request.user:
                return Response(
                    {'error': 'You must be enrolled in this course to submit xAPI statements'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Check if lesson has HTML embed content
        try:
            html_embed = lesson.html_embed
        except HTMLEmbed.DoesNotExist:
            return Response(
                {'error': 'This lesson does not have HTML embed content'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if xAPI messaging is enabled
        if not html_embed.enable_xapi_messaging:
            return Response(
                {'error': 'xAPI messaging is not enabled for this embed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = HTMLEmbedXAPISerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'errors': [str(e) for errors in serializer.errors.values() for e in errors]
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        
        # Process the xAPI statement
        manager = HTMLEmbedManager()
        
        # Validate the message
        message = {
            'statement': data['statement'],
            'origin': data.get('origin', '')
        }
        
        validation = manager.validate_xapi_message(message, html_embed)
        if not validation.is_valid:
            return Response(
                {
                    'success': False,
                    'errors': validation.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process and store the statement
        xapi_statement = manager.process_postmessage(
            message=message,
            student=request.user,
            embed=html_embed
        )
        
        if xapi_statement:
            return Response(
                {
                    'success': True,
                    'statement_id': str(xapi_statement.statement_id),
                    'message': 'xAPI statement stored successfully'
                },
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(
                {
                    'success': False,
                    'message': 'Failed to store xAPI statement',
                    'errors': ['Statement validation or storage failed']
                },
                status=status.HTTP_400_BAD_REQUEST
            )
