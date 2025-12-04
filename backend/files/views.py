from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import UploadedFile
from .serializers import UploadedFileSerializer


class FileUploadViewSet(viewsets.ModelViewSet):
    """ViewSet for file upload operations"""
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
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
        """Generic file upload endpoint"""
        file_obj = request.FILES.get('file')
        file_type = request.data.get('file_type', 'other')
        course_id = request.data.get('course_id')
        lesson_id = request.data.get('lesson_id')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create file record
        uploaded_file = UploadedFile.objects.create(
            file=file_obj,
            file_type=file_type,
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            course_id=course_id if course_id else None,
            lesson_id=lesson_id if lesson_id else None
        )
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='thumbnail')
    def upload_thumbnail(self, request):
        """Upload course thumbnail"""
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
        
        # Verify course ownership
        from courses.models import Course
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        
        # Create thumbnail record
        uploaded_file = UploadedFile.objects.create(
            file=file_obj,
            file_type='thumbnail',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            course=course
        )
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='video')
    def upload_video(self, request):
        """Upload lesson video"""
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
        
        # Verify lesson ownership
        from courses.models import Lesson
        lesson = get_object_or_404(Lesson, id=lesson_id, course__instructor=request.user)
        
        # Create video record
        uploaded_file = UploadedFile.objects.create(
            file=file_obj,
            file_type='video',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user,
            lesson=lesson,
            course=lesson.course
        )
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='avatar')
    def upload_avatar(self, request):
        """Upload user avatar"""
        file_obj = request.FILES.get('file')
        
        if not file_obj:
            return Response(
                {'detail': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old avatar if exists
        old_avatars = UploadedFile.objects.filter(
            uploaded_by=request.user,
            file_type='avatar'
        )
        for avatar in old_avatars:
            avatar.delete()
        
        # Create new avatar record
        uploaded_file = UploadedFile.objects.create(
            file=file_obj,
            file_type='avatar',
            original_filename=file_obj.name,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            uploaded_by=request.user
        )
        
        serializer = self.get_serializer(uploaded_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['delete'], url_path='avatar')
    def delete_avatar(self, request):
        """Delete user avatar"""
        user_id = request.query_params.get('userId')
        
        # Only allow deleting own avatar unless admin
        if user_id and int(user_id) != request.user.id and not request.user.is_staff:
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
