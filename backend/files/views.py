from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404

from core.upload_validation import (
    validate_document_upload, validate_image_upload, validate_video_upload,
)
from lms_project.throttles import UploadRateThrottle
from .models import UploadedFile
from .serializers import UploadedFileSerializer


def verify_upload_content(file_obj, file_type):
    """
    Validate an upload by inspecting its actual bytes.

    Returns (is_valid, error_message, safe_filename).

    Every endpoint below previously accepted `file_obj.content_type` — a value
    supplied by the client — as proof of the file's type. Since uploads are
    served back from the application's own origin, that allowed an HTML or SVG
    payload to be stored under an image/video content type and then executed as
    first-party script. See PRODUCTION_READINESS.md (P2-3).
    """
    if file_type in ('thumbnail', 'avatar'):
        return validate_image_upload(file_obj)
    if file_type == 'video':
        return validate_video_upload(file_obj)
    if file_type == 'document':
        return validate_document_upload(file_obj, file_obj.name)
    return False, f'Uploads of type "{file_type}" are not supported.', None


class FileUploadViewSet(viewsets.ModelViewSet):
    """ViewSet for file upload operations"""
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UploadRateThrottle]

    def get_queryset(self):
        """Filter files by current user"""
        if self.request.user.is_instructor:
            # Instructors can see all their uploaded files
            return UploadedFile.objects.filter(uploaded_by=self.request.user)
        # Students can see their own files
        return UploadedFile.objects.filter(uploaded_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set uploaded_by to current user and extract file metadata"""
        file_obj = self.request.FILES.get('file')
        if file_obj:
            serializer.save(
                uploaded_by=self.request.user,
                original_filename=file_obj.name,
                file_size=file_obj.size,
                mime_type=file_obj.content_type
            )
        else:
            serializer.save(uploaded_by=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='upload')
    def upload_file(self, request):
        """
        Generic file upload endpoint with security controls.
        
        SECURITY NOTES:
        - Validates file type against allowed types
        - Enforces file size limits
        - Requires ownership verification for course/lesson attachments
        - Only instructors can upload course/lesson files
        """
        file_obj = request.FILES.get('file')
        file_type = request.data.get('file_type', 'other')
        course_id = request.data.get('course_id')
        lesson_id = request.data.get('lesson_id')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        ALLOWED_FILE_TYPES = {
            'thumbnail': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            'video': ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
            'document': ['application/pdf', 'application/msword', 
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain'],
            'avatar': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            'other': []  # Other type not allowed via generic upload
        }
        
        if file_type not in ALLOWED_FILE_TYPES:
            return Response(
                {'detail': f'Invalid file_type. Allowed: {", ".join(ALLOWED_FILE_TYPES.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reject 'other' type - must use specific endpoints
        if file_type == 'other':
            return Response(
                {'detail': 'Generic file_type "other" not allowed. Use specific upload endpoints.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify the real content, not the client-declared MIME type.
        is_valid, error, safe_name = verify_upload_content(file_obj, file_type)
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (in bytes)
        MAX_FILE_SIZES = {
            'thumbnail': 5 * 1024 * 1024,      # 5 MB
            'video': 500 * 1024 * 1024,        # 500 MB
            'document': 10 * 1024 * 1024,      # 10 MB
            'avatar': 2 * 1024 * 1024,         # 2 MB
        }
        
        max_size = MAX_FILE_SIZES.get(file_type, 5 * 1024 * 1024)
        if file_obj.size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            return Response(
                {'detail': f'File too large. Maximum size for {file_type}: {max_size_mb}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ownership verification for course/lesson attachments
        course = None
        lesson = None
        
        if course_id:
            from courses.models import Course
            try:
                course = Course.objects.get(id=course_id)
                # Only the course instructor can upload files to their course
                if course.instructor != request.user:
                    return Response(
                        {'detail': 'You do not have permission to upload files to this course.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Course.DoesNotExist:
                return Response(
                    {'detail': 'Course not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if lesson_id:
            from courses.models import Lesson
            try:
                lesson = Lesson.objects.get(id=lesson_id)
                # Only the lesson's course instructor can upload files
                if lesson.course.instructor != request.user:
                    return Response(
                        {'detail': 'You do not have permission to upload files to this lesson.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                # Set course from lesson if not already set
                if not course:
                    course = lesson.course
            except Lesson.DoesNotExist:
                return Response(
                    {'detail': 'Lesson not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # For course/lesson files, user must be an instructor
        if (course_id or lesson_id) and not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can upload course/lesson files.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Redirect to specific endpoints for better security
        if file_type == 'thumbnail' and course_id:
            return Response(
                {'detail': 'Please use /api/files/thumbnail/ endpoint for thumbnail uploads.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file_type == 'video' and lesson_id:
            return Response(
                {'detail': 'Please use /api/files/video/ endpoint for video uploads.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file_type == 'avatar':
            return Response(
                {'detail': 'Please use /api/files/avatar/ endpoint for avatar uploads.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create file record (only for document type at this point).
        # The stored name is server-generated; original_filename keeps the
        # user-facing label for display only.
        uploaded_file = UploadedFile(
            file_type=file_type,
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            course=course,
            lesson=lesson
        )
        uploaded_file.file.save(safe_name, file_obj, save=False)
        uploaded_file.save()
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='thumbnail')
    def upload_thumbnail(self, request):
        """
        Upload course thumbnail (instructor only).
        
        SECURITY:
        - Only course instructor can upload
        - Image files only (JPEG, PNG, GIF, WebP)
        - Max size: 5MB
        """
        file_obj = request.FILES.get('file')
        course_id = request.data.get('course_id')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (5MB max)
        MAX_SIZE = 5 * 1024 * 1024
        if file_obj.size > MAX_SIZE:
            return Response(
                {'detail': f'File too large. Maximum size: 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the real content, not the client-declared MIME type.
        is_valid, error, safe_name = verify_upload_content(file_obj, 'thumbnail')
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        # Verify course ownership (only instructor can upload)
        from courses.models import Course
        course = get_object_or_404(Course, id=course_id, instructor=request.user)

        # Delete old thumbnail if exists
        old_thumbnails = UploadedFile.objects.filter(
            course=course,
            file_type='thumbnail'
        )
        for thumb in old_thumbnails:
            thumb.delete()

        # Create thumbnail record
        uploaded_file = UploadedFile(
            file_type='thumbnail',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            course=course
        )
        uploaded_file.file.save(safe_name, file_obj, save=False)
        uploaded_file.save()
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='video')
    def upload_video(self, request):
        """
        Upload lesson video (instructor only).
        
        SECURITY:
        - Only lesson's course instructor can upload
        - Video files only (MP4, WebM, OGG, QuickTime)
        - Max size: 500MB
        """
        file_obj = request.FILES.get('file')
        lesson_id = request.data.get('lesson_id')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not lesson_id:
            return Response(
                {'detail': 'lesson_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (500MB max)
        MAX_SIZE = 500 * 1024 * 1024
        if file_obj.size > MAX_SIZE:
            return Response(
                {'detail': f'File too large. Maximum size: 500MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the real container header, not the client-declared MIME type.
        is_valid, error, safe_name = verify_upload_content(file_obj, 'video')
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        # Verify lesson ownership (only course instructor can upload)
        from courses.models import Lesson
        lesson = get_object_or_404(Lesson, id=lesson_id, course__instructor=request.user)

        # Delete old video if exists
        old_videos = UploadedFile.objects.filter(
            lesson=lesson,
            file_type='video'
        )
        for video in old_videos:
            video.delete()

        # Create video record
        uploaded_file = UploadedFile(
            file_type='video',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            lesson=lesson,
            course=lesson.course
        )
        uploaded_file.file.save(safe_name, file_obj, save=False)
        uploaded_file.save()
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='avatar')
    def upload_avatar(self, request):
        """
        Upload user avatar.
        
        SECURITY:
        - Users can only upload their own avatar
        - Image files only (JPEG, PNG, GIF, WebP)
        - Max size: 2MB
        """
        file_obj = request.FILES.get('file')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (2MB max)
        MAX_SIZE = 2 * 1024 * 1024
        if file_obj.size > MAX_SIZE:
            return Response(
                {'detail': f'File too large. Maximum size: 2MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the real content, not the client-declared MIME type.
        is_valid, error, safe_name = verify_upload_content(file_obj, 'avatar')
        if not is_valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        # Delete old avatar if exists
        old_avatars = UploadedFile.objects.filter(
            uploaded_by=request.user,
            file_type='avatar'
        )
        for avatar in old_avatars:
            avatar.delete()

        # Create new avatar record
        uploaded_file = UploadedFile(
            file_type='avatar',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user
        )
        uploaded_file.file.save(safe_name, file_obj, save=False)
        uploaded_file.save()
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['delete'], url_path='avatar')
    def delete_avatar(self, request):
        """Delete user avatar"""
        user_id = request.query_params.get('userId')

        # Guard the cast: `?userId=abc` previously raised ValueError -> HTTP 500.
        try:
            user_id = int(user_id) if user_id else None
        except (TypeError, ValueError):
            return Response(
                {'detail': 'userId must be an integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only allow deleting own avatar unless admin
        if user_id and user_id != request.user.id and not request.user.is_staff:
            return Response(
                {'detail': 'You can only delete your own avatar.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        target_user_id = user_id if user_id else request.user.id
        
        avatars = UploadedFile.objects.filter(
            uploaded_by_id=target_user_id,
            file_type='avatar'
        )
        
        count = avatars.count()
        avatars.delete()
        
        return Response({
            'detail': f'Deleted {count} avatar(s).',
            'deleted_count': count
        })
