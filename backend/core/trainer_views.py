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
from django.db.models import Count, Avg, Q, Sum, F
from django.http import HttpResponse
from django.utils import timezone
import csv
from datetime import timedelta

from .serializers import (
    TrainerProfileSerializer,
    ChangePasswordSerializer,
    StudentListSerializer,
    StudentDetailSerializer,
    StudentProgressSerializer,
    BulkMessageSerializer
)
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


class StudentDetailView(APIView):
    """
    API view for detailed information about a specific student.

    GET /api/trainer/students/{id}/

    Returns detailed student information including:
    - Profile information
    - Course-by-course progress breakdown
    - Assessment history

    Requirements: 3.4, 3.5
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request, student_id):
        """
        Get detailed information about a specific student.

        Verifies that the student is enrolled in at least one of the
        trainer's courses before returning data.
        """
        from courses.models import Enrollment, Progress, Lesson
        from quizzes.models import QuizAttempt, Quiz

        # Get the student
        try:
            student = User.objects.get(id=student_id, is_student=True)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Student not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get trainer's courses
        trainer_courses = request.user.courses_created.all()

        if not trainer_courses.exists():
            return Response(
                {'detail': 'No courses found for this trainer.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify student is enrolled in at least one of trainer's courses
        student_enrollments = Enrollment.objects.filter(
            student=student,
            course__in=trainer_courses
        ).select_related('course')

        if not student_enrollments.exists():
            return Response(
                {'detail': 'Student is not enrolled in any of your courses.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Build course-by-course progress breakdown
        enrolled_courses = []
        course_progresses = []

        for enrollment in student_enrollments:
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

            course_progresses.append(course_progress)

            enrolled_courses.append({
                'course_id': course.id,
                'course_title': course.title,
                'enrolled_at': enrollment.enrolled_at.isoformat(),
                'progress_percentage': round(course_progress, 2),
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons if total_lessons > 0 else 0
            })

        # Calculate overall progress as average across all enrollments
        if course_progresses:
            overall_progress = sum(course_progresses) / len(course_progresses)
        else:
            overall_progress = 0.0

        # Get assessment history
        quiz_attempts = QuizAttempt.objects.filter(
            student=student,
            quiz__course__in=trainer_courses
        ).select_related('quiz').order_by('-started_at')

        total_assessments = quiz_attempts.count()

        if total_assessments > 0:
            last_attempt = quiz_attempts.first()
            last_assessment = {
                'quiz_title': last_attempt.quiz.title,
                'score': float(last_attempt.score) if last_attempt.score else 0,
                'percentage': float(last_attempt.percentage) if last_attempt.percentage else 0,
                'passed': last_attempt.passed,
                'attempted_at': last_attempt.started_at.isoformat()
            }
        else:
            last_assessment = None

        assessment_history = {
            'total_assessments_taken': total_assessments,
            'last_assessment': last_assessment
        }

        # Build response data
        student_data = {
            'id': student.id,
            'username': student.username,
            'email': student.email,
            'first_name': student.first_name or '',
            'last_name': student.last_name or '',
            'avatar': student.avatar.url if student.avatar else None,
            'bio': student.bio,
            'phone': student.phone,
            'location': student.location,
            'enrolled_course_count': student_enrollments.count(),
            'overall_progress': round(overall_progress, 2),
            'enrolled_courses': enrolled_courses,
            'assessment_history': assessment_history
        }

        serializer = StudentDetailSerializer(student_data, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentProgressView(APIView):
    """
    API view for detailed student progress across all courses.

    GET /api/trainer/students/{id}/progress/

    Returns progress for all courses the student is enrolled in with:
    - Lesson-by-lesson completion status
    - Quiz attempts and scores
    - Time spent using LessonTimeTracking

    Requirements: 3.4
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request, student_id):
        """
        Get detailed progress information for a specific student.

        Includes lesson-by-lesson breakdown, quiz attempts, and time tracking.
        """
        from courses.models import Enrollment, Progress, Lesson
        from quizzes.models import QuizAttempt, Quiz
        from activity.models import LessonTimeTracking

        # Get the student
        try:
            student = User.objects.get(id=student_id, is_student=True)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Student not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get trainer's courses
        trainer_courses = request.user.courses_created.all()

        if not trainer_courses.exists():
            return Response(
                {'detail': 'No courses found for this trainer.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify student is enrolled in at least one of trainer's courses
        student_enrollments = Enrollment.objects.filter(
            student=student,
            course__in=trainer_courses
        ).select_related('course')

        if not student_enrollments.exists():
            return Response(
                {'detail': 'Student is not enrolled in any of your courses.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Build detailed course progress data
        courses_data = []

        for enrollment in student_enrollments:
            course = enrollment.course

            # Get all lessons for this course
            lessons = Lesson.objects.filter(course=course).order_by('order')

            # Build lesson progress data
            lessons_data = []
            total_time_spent = 0

            for lesson in lessons:
                # Get progress record
                try:
                    progress = Progress.objects.get(student=student, lesson=lesson)
                    completed = progress.completed
                    completed_at = progress.completed_at.isoformat() if progress.completed_at else None
                except Progress.DoesNotExist:
                    completed = False
                    completed_at = None

                # Get time tracking
                try:
                    time_tracking = LessonTimeTracking.objects.get(
                        student=student,
                        lesson=lesson
                    )
                    time_spent = time_tracking.time_spent
                    total_time_spent += time_spent
                    time_spent_formatted = self._format_duration(time_spent)
                except LessonTimeTracking.DoesNotExist:
                    time_spent = None
                    time_spent_formatted = None

                lessons_data.append({
                    'lesson_id': lesson.id,
                    'lesson_title': lesson.title,
                    'lesson_order': lesson.order,
                    'completed': completed,
                    'completed_at': completed_at,
                    'time_spent_seconds': time_spent,
                    'time_spent_formatted': time_spent_formatted
                })

            # Get quiz attempts for this course
            quiz_attempts_data = []
            quizzes = Quiz.objects.filter(course=course)

            for quiz in quizzes:
                attempts = QuizAttempt.objects.filter(
                    student=student,
                    quiz=quiz
                ).order_by('-started_at')

                for attempt in attempts:
                    quiz_attempts_data.append({
                        'quiz_id': quiz.id,
                        'quiz_title': quiz.title,
                        'attempt_number': attempt.attempt_number,
                        'score': float(attempt.score) if attempt.score else 0,
                        'percentage': float(attempt.percentage) if attempt.percentage else 0,
                        'passed': attempt.passed,
                        'started_at': attempt.started_at.isoformat(),
                        'completed_at': attempt.completed_at.isoformat() if attempt.completed_at else None,
                        'time_taken_seconds': attempt.time_taken
                    })

            # Calculate course progress
            total_lessons = lessons.count()
            completed_lessons = sum(1 for l in lessons_data if l['completed'])
            progress_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0

            # Get course thumbnail URL
            course_thumbnail = None
            if course.thumbnail:
                course_thumbnail = request.build_absolute_uri(course.thumbnail.url)

            courses_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'course_thumbnail': course_thumbnail,
                'enrolled_at': enrollment.enrolled_at.isoformat(),
                'progress_percentage': round(progress_percentage, 2),
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'lessons': lessons_data,
                'quiz_attempts': quiz_attempts_data,
                'total_time_spent_seconds': total_time_spent,
                'total_time_spent_formatted': self._format_duration(total_time_spent)
            })

        # Build response data
        student_progress_data = {
            'student_id': student.id,
            'student_name': f"{student.first_name or ''} {student.last_name or ''}".strip() or student.username,
            'student_email': student.email,
            'courses': courses_data
        }

        serializer = StudentProgressSerializer(student_progress_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _format_duration(self, seconds):
        """
        Format seconds into human-readable duration string.

        Args:
            seconds: Time in seconds

        Returns:
            Formatted string like "2h 30m 45s"
        """
        if not seconds:
            return None

        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60

        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        if secs > 0 or not parts:
            parts.append(f"{secs}s")

        return " ".join(parts)


class BulkStudentOperationsView(APIView):
    """
    API view for bulk operations on students.

    Supports:
    - POST /api/trainer/students/export/ - Export student data as CSV
    - POST /api/trainer/students/bulk_message/ - Send notifications to selected students

    Requirements: 9.1, 9.2
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, operation=None):
        """
        Handle bulk operations.

        Args:
            operation: Either 'export' or 'bulk_message'
        """
        if operation == 'export':
            return self._export_students(request)
        elif operation == 'bulk_message':
            return self._send_bulk_message(request)
        else:
            return Response(
                {'detail': 'Invalid operation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _export_students(self, request):
        """
        Export student data as CSV.

        Returns:
            CSV file download with student names, emails, enrollment dates,
            and progress percentages.
        """
        from courses.models import Enrollment, Lesson
        from quizzes.models import QuizAttempt

        # Get trainer's courses
        trainer_courses = request.user.courses_created.all()

        if not trainer_courses.exists():
            return Response(
                {'detail': 'No courses found for this trainer.'},
                status=status.HTTP_404_NOT_FOUND
            )

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
                    'student': student,
                    'enrollments': []
                }

            student_data[student_id]['enrollments'].append(enrollment)

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="students_export.csv"'

        writer = csv.writer(response)

        # Write header
        writer.writerow([
            'Student ID',
            'Username',
            'Email',
            'First Name',
            'Last Name',
            'Enrolled Courses',
            'Overall Progress (%)',
            'Total Assessments Taken',
            'Last Activity'
        ])

        # Write data rows
        for student_id, data in student_data.items():
            student = data['student']
            enrollments = data['enrollments']

            # Calculate overall progress
            course_progresses = []
            for enrollment in enrollments:
                course = enrollment.course
                total_lessons = Lesson.objects.filter(course=course).count()

                if total_lessons > 0:
                    from courses.models import Progress
                    completed_lessons = Progress.objects.filter(
                        student=student,
                        lesson__course=course,
                        completed=True
                    ).count()
                    course_progress = (completed_lessons / total_lessons) * 100
                    course_progresses.append(course_progress)

            overall_progress = sum(course_progresses) / len(course_progresses) if course_progresses else 0

            # Get total assessments
            total_assessments = QuizAttempt.objects.filter(
                student=student,
                quiz__course__in=trainer_courses
            ).count()

            # Get last activity
            from activity.models import ActivityLog
            last_activity = ActivityLog.objects.filter(
                user=student
            ).order_by('-timestamp').first()

            last_activity_date = last_activity.timestamp.strftime('%Y-%m-%d %H:%M:%S') if last_activity else 'Never'

            # Get enrolled course titles
            course_titles = '; '.join([e.course.title for e in enrollments])

            # Write row
            writer.writerow([
                student.id,
                student.username,
                student.email,
                student.first_name or '',
                student.last_name or '',
                course_titles,
                f"{overall_progress:.2f}",
                total_assessments,
                last_activity_date
            ])

        return response

    def _send_bulk_message(self, request):
        """
        Send bulk notifications to selected students.

        Request body:
        {
            "student_ids": [1, 2, 3],
            "subject": "Message subject",
            "message": "Message content"
        }

        Validates that all students are enrolled in trainer's courses.
        """
        from courses.models import Enrollment

        # Validate request data
        serializer = BulkMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        student_ids = serializer.validated_data['student_ids']
        subject = serializer.validated_data['subject']
        message = serializer.validated_data['message']

        # Get trainer's courses
        trainer_courses = request.user.courses_created.all()

        if not trainer_courses.exists():
            return Response(
                {'detail': 'No courses found for this trainer.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify all students are enrolled in trainer's courses
        valid_students = Enrollment.objects.filter(
            student_id__in=student_ids,
            course__in=trainer_courses
        ).values_list('student_id', flat=True).distinct()

        valid_student_ids = set(valid_students)
        requested_student_ids = set(student_ids)

        # Find invalid student IDs
        invalid_student_ids = requested_student_ids - valid_student_ids

        if invalid_student_ids:
            return Response(
                {
                    'detail': 'Some students are not enrolled in your courses.',
                    'invalid_student_ids': list(invalid_student_ids)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create notifications for each student
        # Note: This assumes Notification model exists. If not, we'll create activity logs instead.
        notifications_created = 0

        try:
            from notifications.models import Notification

            for student_id in student_ids:
                Notification.objects.create(
                    recipient_id=student_id,
                    notification_type='bulk_message',
                    title=subject,
                    message=message,
                    related_user=request.user
                )
                notifications_created += 1

        except ImportError:
            # Fallback to creating activity logs if Notification model doesn't exist
            from activity.models import ActivityLog

            for student_id in student_ids:
                ActivityLog.objects.create(
                    user_id=student_id,
                    action_type='profile_view',  # Using existing action type as fallback
                    description=f"Message from trainer: {subject}",
                    metadata={
                        'subject': subject,
                        'message': message,
                        'from_trainer': request.user.username
                    }
                )
                notifications_created += 1

        return Response({
            'detail': f'Messages sent to {notifications_created} students.',
            'notifications_created': notifications_created
        }, status=status.HTTP_200_OK)
