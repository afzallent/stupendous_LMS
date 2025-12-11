"""
Trainer-specific API views for profile and settings management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Q

from .serializers import TrainerProfileSerializer, ChangePasswordSerializer, StudentListSerializer
from .permissions import IsInstructor

User = get_user_model()


class TrainerProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for trainer profile management.
    
    Provides endpoints for trainers to manage their profile information,
    upload avatar images, and configure notification preferences.
    """
    permission_classes = [IsAuthenticated, IsInstructor]
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get trainer profile information.
        
        GET /api/trainer/profile/
        """
        serializer = TrainerProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """
        Update trainer profile information.
        
        PUT/PATCH /api/trainer/profile/update_profile/
        """
        serializer = TrainerProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(
        detail=False,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_avatar(self, request):
        """
        Upload trainer profile avatar image.
        
        POST /api/trainer/profile/upload_avatar/
        
        Validates:
        - File type: JPEG, PNG, GIF, WebP
        - File size: Max 5MB
        
        Returns updated profile data with avatar URL.
        """
        if 'avatar' not in request.FILES:
            return Response(
                {'avatar': ['No file was submitted.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        avatar_file = request.FILES['avatar']
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if avatar_file.size > max_size:
            return Response(
                {'avatar': ['File size must be less than 5MB.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'avatar': ['File must be an image (JPEG, PNG, GIF, or WebP).']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save avatar to user profile
        request.user.avatar = avatar_file
        request.user.save()
        
        # Return updated profile data
        serializer = TrainerProfileSerializer(request.user, context={'request': request})
        return Response({
            'detail': 'Avatar uploaded successfully.',
            'profile': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'])
    def delete_avatar(self, request):
        """
        Delete trainer profile avatar image.
        
        DELETE /api/trainer/profile/delete_avatar/
        """
        if request.user.avatar:
            # Delete the file from storage
            if request.user.avatar.storage.exists(request.user.avatar.name):
                request.user.avatar.storage.delete(request.user.avatar.name)
            
            # Clear the avatar field
            request.user.avatar = None
            request.user.save()
            
            return Response({
                'detail': 'Avatar deleted successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': 'No avatar to delete.'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Change trainer password.
        
        POST /api/trainer/profile/change_password/
        
        Request body:
        {
            "current_password": "current_password",
            "new_password": "new_password"
        }
        
        Validates:
        - Current password is correct
        - New password meets strength requirements:
          * Minimum 8 characters
          * At least one uppercase letter
          * At least one lowercase letter
          * At least one digit
        
        Returns success message on successful password change.
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if serializer.is_valid():
            # Update password using set_password to properly hash it
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            return Response({
                'detail': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class StudentManagementPagination(PageNumberPagination):
    """
    Pagination class for student management list.
    
    Returns 20 students per page.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class StudentManagementView(APIView):
    """
    API view for managing students enrolled in trainer's courses.
    
    GET /api/trainer/students/
    
    Returns all unique students enrolled in any of the trainer's courses
    with their enrollment count and overall progress.
    
    Requirements: 3.1, 3.2, 3.3
    """
    permission_classes = [IsAuthenticated, IsInstructor]
    pagination_class = StudentManagementPagination
    
    def get(self, request):
        """
        Get list of all unique students enrolled in trainer's courses.
        
        Returns:
        - Student name, email
        - Number of enrolled courses
        - Overall progress (average across all enrollments)
        
        Paginated at 20 students per page.
        """
        from courses.models import Enrollment, Progress, Lesson
        
        # Get all courses taught by this trainer
        trainer_courses = request.user.courses_created.all()
        
        if not trainer_courses.exists():
            return Response({
                'count': 0,
                'next': None,
                'previous': None,
                'results': []
            }, status=status.HTTP_200_OK)
        
        # Get all unique students enrolled in trainer's courses
        enrollments = Enrollment.objects.filter(
            course__in=trainer_courses
        ).select_related('student', 'course')
        
        # Group by student and calculate statistics
        student_data = {}
        
        for enrollment in enrollments:
            student = enrollment.student
            student_id = student.id
            
            if student_id not in student_data:
                student_data[student_id] = {
                    'id': student.id,
                    'username': student.username,
                    'email': student.email,
                    'first_name': student.first_name or '',
                    'last_name': student.last_name or '',
                    'enrolled_course_count': 0,
                    'course_progresses': []
                }
            
            # Increment enrolled course count
            student_data[student_id]['enrolled_course_count'] += 1
            
            # Calculate progress for this course
            course = enrollment.course
            total_lessons = Lesson.objects.filter(course=course).count()
            
            if total_lessons > 0:
                completed_lessons = Progress.objects.filter(
                    student=student,
                    lesson__course=course,
                    completed=True
                ).count()
                
                course_progress = (completed_lessons / total_lessons) * 100
            else:
                course_progress = 0.0
            
            student_data[student_id]['course_progresses'].append(course_progress)
        
        # Calculate overall progress for each student
        students_list = []
        for student_id, data in student_data.items():
            if data['course_progresses']:
                overall_progress = sum(data['course_progresses']) / len(data['course_progresses'])
            else:
                overall_progress = 0.0
            
            data['overall_progress'] = overall_progress
            del data['course_progresses']  # Remove temporary field
            students_list.append(data)
        
        # Sort by last name, then first name
        students_list.sort(key=lambda x: (x['last_name'], x['first_name']))
        
        # Apply pagination
        paginator = self.pagination_class()
        paginated_students = paginator.paginate_queryset(students_list, request)
        
        # Serialize the data
        serializer = StudentListSerializer(paginated_students, many=True)
        
        return paginator.get_paginated_response(serializer.data)
