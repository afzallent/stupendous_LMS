"""
API Views for H5P content management.

Provides endpoints for:
- POST /api/h5p/upload/ - Upload H5P package
- GET /api/h5p/{id}/embed/ - Get embed code and restore state
- POST /api/h5p/{id}/xapi/ - Receive xAPI statements from H5P content
- POST /api/h5p/{id}/state/ - Save content state
- GET /api/h5p/{id}/state/ - Retrieve content state

Requirements: 12.1, 12.2, 12.4, 12.5
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404

from .models import Lesson, Enrollment
from .content_models import H5PPackage, H5PContentState
from .h5p_manager import H5PContentManager
from .h5p_serializers import (
    H5PUploadSerializer,
    H5PUploadResponseSerializer,
    H5PEmbedResponseSerializer,
    H5PXAPIStatementSerializer,
    H5PXAPIResponseSerializer,
    H5PStateSerializer,
    H5PStateResponseSerializer,
    H5PProgressResponseSerializer,
    H5PPackageSerializer,
)


class H5PUploadView(APIView):
    """
    API view for uploading H5P packages.
    
    POST /api/h5p/upload/
        Upload and process an H5P package.
        Requires instructor permission.
    
    Requirements: 12.1
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Upload H5P package.
        
        Request body (multipart/form-data):
            - lesson_id: ID of the lesson to attach H5P content to
            - h5p_package: H5P package file (.h5p)
            - title: Optional title (extracted from package if not provided)
            - description: Optional description
        
        Returns:
            - success: Boolean
            - h5p_id: ID of created H5P package
            - library: H5P library name
            - version: H5P library version
            - title: Package title
        
        Requirements: 12.1
        """
        serializer = H5PUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the lesson
        lesson_id = serializer.validated_data['lesson_id']
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check permission: must be instructor of the course
        if lesson.course.instructor != request.user:
            return Response(
                {'error': 'Only the course instructor can upload H5P content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if lesson already has H5P content
        if hasattr(lesson, 'h5p_package'):
            return Response(
                {'error': 'This lesson already has H5P content. Delete it first to upload new content.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the upload
        manager = H5PContentManager()
        h5p_file = serializer.validated_data['h5p_package']
        
        # Validate package
        validation = manager.validate_package(h5p_file)
        if not validation.is_valid:
            return Response(
                {'error': 'Invalid H5P package', 'details': validation.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create H5P package
            h5p_package = manager.create_h5p_package(
                lesson=lesson,
                h5p_file=h5p_file,
                uploaded_by=request.user,
                title=serializer.validated_data.get('title'),
                description=serializer.validated_data.get('description', '')
            )
            
            response_data = {
                'success': True,
                'h5p_id': h5p_package.pk,
                'library': h5p_package.library_name,
                'version': h5p_package.library_version,
                'title': h5p_package.title,
                'message': 'H5P package uploaded successfully'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to process H5P package: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class H5PEmbedView(APIView):
    """
    API view for getting H5P embed code.
    
    GET /api/h5p/{h5p_id}/embed/
        Get embed code and restore previous state.
        Requires enrollment or instructor permission.
    
    Requirements: 12.2, 12.4
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, h5p_id):
        """
        Get H5P embed code.
        
        Returns:
            - embed_url: URL for embedding
            - iframe_html: Complete iframe HTML
            - width: Iframe width
            - height: Iframe height
            - state: Previous content state (if any)
            - xapi_listener_script: JavaScript for xAPI capture
            - track_xapi: Whether xAPI tracking is enabled
        
        Requirements: 12.2, 12.4
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check permission
        if not self._has_permission(request.user, h5p_package):
            return Response(
                {'error': 'You must be enrolled in this course to view this content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get embed code
        manager = H5PContentManager()
        embed_data = manager.get_embed_code(
            h5p_package=h5p_package,
            student=request.user,
            include_state=True
        )
        
        return Response(embed_data, status=status.HTTP_200_OK)
    
    def _has_permission(self, user, h5p_package):
        """Check if user can access the H5P content."""
        if not h5p_package.lesson:
            return False
        
        # Instructors can always access
        if h5p_package.lesson.course.instructor == user:
            return True
        
        # Check if user is enrolled
        return Enrollment.objects.filter(
            student=user,
            course=h5p_package.lesson.course
        ).exists()


class H5PXAPIView(APIView):
    """
    API view for receiving xAPI statements from H5P content.
    
    POST /api/h5p/{h5p_id}/xapi/
        Receive and process xAPI statements from H5P.
        Requires enrollment.
    
    Requirements: 12.2, 12.3
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def post(self, request, h5p_id):
        """
        Receive xAPI statement from H5P content.
        
        Request body:
            - statement: xAPI statement object
        
        Returns:
            - success: Boolean
            - statement_id: ID of stored statement (if successful)
        
        Requirements: 12.2, 12.3
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check if xAPI tracking is enabled
        if not h5p_package.track_xapi:
            return Response(
                {'success': False, 'message': 'xAPI tracking is disabled for this content'},
                status=status.HTTP_200_OK
            )
        
        # Check permission
        if not self._has_permission(request.user, h5p_package):
            return Response(
                {'error': 'You must be enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = H5PXAPIStatementSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Process the xAPI statement
        manager = H5PContentManager()
        statement = serializer.validated_data['statement']
        
        xapi_statement = manager.process_xapi_statement(
            statement=statement,
            student=request.user,
            h5p_package=h5p_package
        )
        
        if xapi_statement:
            response_data = {
                'success': True,
                'statement_id': str(xapi_statement.statement_id),
                'message': 'xAPI statement processed successfully'
            }
        else:
            response_data = {
                'success': False,
                'statement_id': None,
                'message': 'Statement was not stored (validation failed or duplicate)'
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _has_permission(self, user, h5p_package):
        """Check if user can submit xAPI statements."""
        if not h5p_package.lesson:
            return False
        
        # Instructors can submit
        if h5p_package.lesson.course.instructor == user:
            return True
        
        # Check if user is enrolled
        return Enrollment.objects.filter(
            student=user,
            course=h5p_package.lesson.course
        ).exists()


class H5PStateView(APIView):
    """
    API view for saving and retrieving H5P content state.
    
    POST /api/h5p/{h5p_id}/state/
        Save content state.
        
    GET /api/h5p/{h5p_id}/state/
        Retrieve content state.
    
    Requirements: 12.4
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get(self, request, h5p_id):
        """
        Retrieve content state.
        
        Returns:
            - success: Boolean
            - state: Content state data (or null if none)
        
        Requirements: 12.4
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check permission
        if not self._has_permission(request.user, h5p_package):
            return Response(
                {'error': 'You must be enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get state
        manager = H5PContentManager()
        state = manager.restore_content_state(
            student=request.user,
            h5p_package=h5p_package
        )
        
        response_data = {
            'success': True,
            'state': state,
            'message': 'State retrieved successfully' if state else 'No previous state found'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def post(self, request, h5p_id):
        """
        Save content state.
        
        Request body:
            - state: Content state data
        
        Returns:
            - success: Boolean
            - message: Status message
        
        Requirements: 12.4
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check permission
        if not self._has_permission(request.user, h5p_package):
            return Response(
                {'error': 'You must be enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = H5PStateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Save state
        manager = H5PContentManager()
        manager.save_content_state(
            student=request.user,
            h5p_package=h5p_package,
            state_data=serializer.validated_data['state']
        )
        
        response_data = {
            'success': True,
            'state': serializer.validated_data['state'],
            'message': 'State saved successfully'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _has_permission(self, user, h5p_package):
        """Check if user can access state."""
        if not h5p_package.lesson:
            return False
        
        # Instructors can access
        if h5p_package.lesson.course.instructor == user:
            return True
        
        # Check if user is enrolled
        return Enrollment.objects.filter(
            student=user,
            course=h5p_package.lesson.course
        ).exists()


class H5PProgressView(APIView):
    """
    API view for getting student progress on H5P content.
    
    GET /api/h5p/{h5p_id}/progress/
        Get student's progress for H5P content.
    
    Requirements: 12.3, 12.5
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, h5p_id):
        """
        Get student progress.
        
        Returns:
            - completion_status: not_started, in_progress, or completed
            - score: Current score
            - max_score: Maximum possible score
            - score_percentage: Score as percentage
            - started_at: When student started
            - completed_at: When student completed
            - last_accessed: Last access time
            - interaction_count: Number of interactions
            - total_time_spent: Total time in seconds
        
        Requirements: 12.3, 12.5
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check permission
        if not self._has_permission(request.user, h5p_package):
            return Response(
                {'error': 'You must be enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get progress
        manager = H5PContentManager()
        progress = manager.get_student_progress(
            student=request.user,
            h5p_package=h5p_package
        )
        
        return Response(progress, status=status.HTTP_200_OK)
    
    def _has_permission(self, user, h5p_package):
        """Check if user can view progress."""
        if not h5p_package.lesson:
            return False
        
        # Instructors can view
        if h5p_package.lesson.course.instructor == user:
            return True
        
        # Check if user is enrolled
        return Enrollment.objects.filter(
            student=user,
            course=h5p_package.lesson.course
        ).exists()


class H5PDeleteView(APIView):
    """
    API view for deleting H5P packages.
    
    DELETE /api/h5p/{h5p_id}/
        Delete an H5P package.
        Requires instructor permission.
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, h5p_id):
        """
        Delete H5P package.
        
        Returns:
            - success: Boolean
            - message: Status message
        """
        h5p_package = get_object_or_404(H5PPackage, pk=h5p_id)
        
        # Check permission: must be instructor
        if not h5p_package.lesson or h5p_package.lesson.course.instructor != request.user:
            return Response(
                {'error': 'Only the course instructor can delete H5P content'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete package
        manager = H5PContentManager()
        manager.delete_package(h5p_package)
        
        return Response(
            {'success': True, 'message': 'H5P package deleted successfully'},
            status=status.HTTP_200_OK
        )
