from decimal import Decimal

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db import transaction, IntegrityError
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from core.models import User
from lms_project.throttles import SensitiveActionThrottle, UploadRateThrottle
from .models import Course, Lesson, Enrollment, Progress, Category, Coupon, Chapter
from .forms import CourseForm, LessonForm
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer,
    EnrollmentSerializer, ProgressSerializer, CategorySerializer, CouponSerializer, ChapterSerializer
)
from .permissions import IsInstructorOrReadOnly, IsOwnerOrReadOnly, IsEnrolledStudent


def course_is_free(course):
    """
    Single definition of "free" used by every enrolment path.

    A course counts as free only if it is explicitly flagged free or costs
    nothing. Anything else must go through the payment flow.
    """
    return bool(course.is_free) or Decimal(course.price or 0) <= Decimal('0.00')


@login_required
def instructor_dashboard(request):
    if not request.user.is_instructor:
        return redirect('home')
    
    courses = Course.objects.filter(instructor=request.user)
    return render(request, 'courses/instructor_dashboard.html', {'courses': courses})

@login_required
def create_course(request):
    if not request.user.is_instructor:
        return redirect('home')
    
    if request.method == 'POST':
        form = CourseForm(request.POST)
        if form.is_valid():
            course = form.save(commit=False)
            course.instructor = request.user
            course.save()
            messages.success(request, 'Course created successfully!')
            return redirect('instructor_dashboard')
    else:
        form = CourseForm()
    return render(request, 'courses/course_form.html', {'form': form, 'title': 'Create Course'})

@login_required
def edit_course(request, course_id):
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    if request.method == 'POST':
        form = CourseForm(request.POST, instance=course)
        if form.is_valid():
            form.save()
            messages.success(request, 'Course updated successfully!')
            return redirect('instructor_dashboard')
    else:
        form = CourseForm(instance=course)
    return render(request, 'courses/course_form.html', {'form': form, 'title': 'Edit Course'})

@login_required
def course_lessons(request, course_id):
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    lessons = course.lessons.all()
    return render(request, 'courses/course_lessons.html', {'course': course, 'lessons': lessons})

@login_required
def add_lesson(request, course_id):
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    if request.method == 'POST':
        form = LessonForm(request.POST)
        if form.is_valid():
            lesson = form.save(commit=False)
            lesson.course = course
            lesson.save()
            messages.success(request, 'Lesson added successfully!')
            return redirect('course_lessons', course_id=course.id)
    else:
        form = LessonForm()
    return render(request, 'courses/lesson_form.html', {'form': form, 'course': course})

@login_required
def monitor_progress(request, course_id):
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    students = Enrollment.objects.filter(course=course).select_related('student')
    
    student_progress = []
    total_lessons = course.lessons.count()
    
    for enrollment in students:
        completed_count = Progress.objects.filter(
            student=enrollment.student, 
            lesson__course=course, 
            completed=True
        ).count()
        
        percent = (completed_count / total_lessons * 100) if total_lessons > 0 else 0
        
        student_progress.append({
            'student': enrollment.student,
            'percent': round(percent, 1)
        })
        
    return render(request, 'courses/monitor_progress.html', {
        'course': course, 
        'student_progress': student_progress
    })

def course_list(request):
    courses = Course.objects.all().order_by('-created_at')
    return render(request, 'courses/course_list.html', {'courses': courses})

def course_detail(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    is_enrolled = False
    if request.user.is_authenticated:
        is_enrolled = Enrollment.objects.filter(student=request.user, course=course).exists()
        
    if request.method == 'POST' and request.user.is_authenticated:
        if not is_enrolled:
            Enrollment.objects.create(student=request.user, course=course)
            messages.success(request, f'You have enrolled in {course.title}')
            return redirect('student_dashboard')
        else:
            return redirect('student_dashboard') # Already enrolled

    return render(request, 'courses/course_detail.html', {'course': course, 'is_enrolled': is_enrolled})

@login_required
def student_dashboard(request):
    enrollments = Enrollment.objects.filter(student=request.user).select_related('course')
    
    # Calculate progress for each course
    course_progress = []
    for enrollment in enrollments:
        course = enrollment.course
        total = course.lessons.count()
        completed = Progress.objects.filter(student=request.user, lesson__course=course, completed=True).count()
        percent = int((completed / total * 100)) if total > 0 else 0
        
        course_progress.append({
            'course': course,
            'percent': percent,
            'total_lessons': total,
            'completed_lessons': completed
        })

    return render(request, 'courses/student_dashboard.html', {'course_progress': course_progress})

@login_required
def lesson_detail(request, course_id, lesson_id):
    course = get_object_or_404(Course, id=course_id)
    lesson = get_object_or_404(Lesson, id=lesson_id, course=course)
    
    # Ensure enrollment
    if not Enrollment.objects.filter(student=request.user, course=course).exists():
        messages.error(request, "You must be enrolled to view lessons.")
        return redirect('course_detail', course_id=course.id)

    # Get or create progress
    progress, created = Progress.objects.get_or_create(student=request.user, lesson=lesson)

    if request.method == 'POST':
        if 'toggle_complete' in request.POST:
            progress.completed = not progress.completed
            progress.save()
            return redirect('lesson_detail', course_id=course.id, lesson_id=lesson.id)

    # Navigation logic
    lessons = list(course.lessons.all())
    current_index = lessons.index(lesson)
    prev_lesson = lessons[current_index - 1] if current_index > 0 else None
    next_lesson = lessons[current_index + 1] if current_index < len(lessons) - 1 else None

    return render(request, 'courses/lesson_detail.html', {
        'course': course,
        'lesson': lesson,
        'progress': progress,
        'prev_lesson': prev_lesson,
        'next_lesson': next_lesson
    })



# API ViewSets

class CourseViewSet(viewsets.ModelViewSet):
    """ViewSet for course CRUD operations"""
    queryset = Course.objects.all().order_by('-created_at')
    serializer_class = CourseSerializer
    permission_classes = [IsInstructorOrReadOnly]
    pagination_class = PageNumberPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'instructor__username']
    ordering_fields = ['created_at', 'title']

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Get course detail with status check"""
        instance = self.get_object()
        
        # Check if user has permission to view this course
        if instance.status != 'published':
            # Only the instructor can view unpublished courses
            if not request.user.is_authenticated or instance.instructor != request.user:
                return Response(
                    {'detail': 'This course is not available.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        """Filter courses by query parameters and user permissions"""
        # select_related/prefetch_related and the count annotations avoid the
        # N+1 the serializer used to cause: one query per course for lessons,
        # plus two more for the lesson and enrollment counts.
        queryset = (
            Course.objects
            .select_related('instructor', 'category')
            .prefetch_related('lessons')
            .annotate(
                annotated_lesson_count=Count('lessons', distinct=True),
                annotated_enrolled_count=Count('enrollments', distinct=True),
            )
            .order_by('-created_at')
        )

        user = self.request.user

        # Anonymous users and students only ever see published courses.
        # Note the explicit `is_instructor` check for the final branch: a user
        # who is neither student nor instructor (e.g. a staff-only account)
        # previously fell through every branch and saw unpublished drafts.
        if not user.is_authenticated or not user.is_instructor:
            queryset = queryset.filter(status='published')
        else:
            # Instructors see published courses + their own courses (any status)
            instructor_id = self.request.query_params.get('instructorId')
            # Guard the cast: `?instructorId=abc` used to raise ValueError -> 500.
            try:
                instructor_id = int(instructor_id) if instructor_id else None
            except (TypeError, ValueError):
                instructor_id = None

            if instructor_id and instructor_id == user.id:
                # Viewing own courses - show all statuses
                queryset = queryset.filter(instructor_id=instructor_id)
            else:
                # Viewing other courses - only published
                queryset = queryset.filter(status='published')
                if instructor_id:
                    queryset = queryset.filter(instructor_id=instructor_id)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset

    def perform_create(self, serializer):
        """Set instructor to current user on create"""
        serializer.save(instructor=self.request.user)

    def perform_update(self, serializer):
        """Ensure only owner can update"""
        if serializer.instance.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own courses.")
        serializer.save()

    def perform_destroy(self, instance):
        """Ensure only owner can delete"""
        if instance.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own courses.")
        instance.delete()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_courses(self, request):
        """Get courses created by current instructor (all statuses)"""
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can view their courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Instructors see all their courses regardless of status
        courses = Course.objects.filter(instructor=request.user).order_by('-created_at')
        page = self.paginate_queryset(courses)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured courses (most enrolled)"""
        courses = Course.objects.filter(status='published').annotate(
            enrollment_count=Count('enrollments')
        ).order_by('-enrollment_count')[:6]
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        """Publish a course"""
        course = self.get_object()
        
        if course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can publish.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if course.status == 'published':
            return Response(
                {'detail': 'Course is already published.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course.publish()
        serializer = self.get_serializer(course)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unpublish(self, request, pk=None):
        """Unpublish a course (back to draft)"""
        course = self.get_object()
        
        if course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can unpublish.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if course.status != 'published':
            return Response(
                {'detail': 'Course is not published.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course.unpublish()
        serializer = self.get_serializer(course)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], 
            parser_classes=[MultiPartParser, FormParser])
    def upload_thumbnail(self, request, pk=None):
        """Upload course thumbnail image"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            course = self.get_object()
            
            # Check if user is the course instructor
            if course.instructor != request.user:
                return Response(
                    {'detail': 'Only the course instructor can upload thumbnails.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if 'thumbnail' not in request.FILES:
                return Response(
                    {'detail': 'No file was submitted.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            thumbnail_file = request.FILES['thumbnail']
            
            # Validate file size (max 5MB)
            if thumbnail_file.size > 5 * 1024 * 1024:
                return Response(
                    {'detail': 'File size must be less than 5MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
            if thumbnail_file.content_type not in allowed_types:
                return Response(
                    {'detail': f'File must be an image (JPEG, PNG, GIF, or WebP). Got: {thumbnail_file.content_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save thumbnail
            course.thumbnail = thumbnail_file
            course.save()
            
            serializer = self.get_serializer(course)
            return Response({
                'detail': 'Thumbnail uploaded successfully.',
                'course': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Thumbnail upload error: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def export_csv(self, request):
        """Export instructor's courses with lessons to CSV"""
        import csv
        from django.http import HttpResponse
        
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can export courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get instructor's courses
        courses = Course.objects.filter(instructor=request.user).prefetch_related('lessons')
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="courses_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Course ID', 'Course Title', 'Course Description', 'Price', 'Is Free',
            'Status', 'Lesson Order', 'Lesson Title', 'Video URL', 'Lesson Content'
        ])
        
        for course in courses:
            lessons = course.lessons.all().order_by('order')
            if lessons.exists():
                for lesson in lessons:
                    writer.writerow([
                        course.id,
                        course.title,
                        course.description,
                        str(course.price),
                        'Yes' if course.is_free else 'No',
                        course.status,
                        lesson.order,
                        lesson.title,
                        lesson.video_url or '',
                        lesson.content or ''
                    ])
            else:
                # Course without lessons
                writer.writerow([
                    course.id,
                    course.title,
                    course.description,
                    str(course.price),
                    'Yes' if course.is_free else 'No',
                    course.status,
                    '',
                    '',
                    '',
                    ''
                ])
        
        return response
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        """Import courses with lessons from CSV"""
        import csv
        import io
        
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can import courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'No file was uploaded.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        csv_file = request.FILES['file']
        
        # Validate file type
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'detail': 'File must be a CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Read CSV file
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            courses_created = 0
            lessons_created = 0
            courses_updated = 0
            current_course = None
            current_course_id = None
            
            for row in reader:
                course_id = row.get('Course ID', '').strip()
                course_title = row.get('Course Title', '').strip()
                course_description = row.get('Course Description', '').strip()
                price = row.get('Price', '0').strip()
                is_free = row.get('Is Free', 'No').strip().lower() in ['yes', 'true', '1']
                status_val = row.get('Status', 'draft').strip()
                
                lesson_order = row.get('Lesson Order', '').strip()
                lesson_title = row.get('Lesson Title', '').strip()
                video_url = row.get('Video URL', '').strip()
                lesson_content = row.get('Lesson Content', '').strip()
                
                # Skip empty rows
                if not course_title:
                    continue
                
                # Check if this is a new course or continuation of previous
                if course_id != current_course_id:
                    # New course
                    if course_id and course_id.isdigit():
                        # Update existing course
                        try:
                            current_course = Course.objects.get(id=int(course_id), instructor=request.user)
                            current_course.title = course_title
                            current_course.description = course_description
                            current_course.price = float(price) if price else 0
                            current_course.is_free = is_free
                            current_course.status = status_val if status_val in ['draft', 'published', 'archived'] else 'draft'
                            current_course.save()
                            courses_updated += 1
                        except Course.DoesNotExist:
                            # Create new course if ID doesn't exist
                            current_course = Course.objects.create(
                                instructor=request.user,
                                title=course_title,
                                description=course_description,
                                price=float(price) if price else 0,
                                is_free=is_free,
                                status=status_val if status_val in ['draft', 'published', 'archived'] else 'draft'
                            )
                            courses_created += 1
                    else:
                        # Create new course
                        current_course = Course.objects.create(
                            instructor=request.user,
                            title=course_title,
                            description=course_description,
                            price=float(price) if price else 0,
                            is_free=is_free,
                            status=status_val if status_val in ['draft', 'published', 'archived'] else 'draft'
                        )
                        courses_created += 1
                    
                    current_course_id = course_id
                
                # Add lesson if provided
                if lesson_title and current_course:
                    order = int(lesson_order) if lesson_order and lesson_order.isdigit() else lessons_created + 1
                    Lesson.objects.create(
                        course=current_course,
                        title=lesson_title,
                        video_url=video_url if video_url else None,
                        content=lesson_content if lesson_content else '',
                        order=order
                    )
                    lessons_created += 1
            
            return Response({
                'detail': 'Import successful',
                'courses_created': courses_created,
                'courses_updated': courses_updated,
                'lessons_created': lessons_created
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'detail': f'Error processing CSV: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LessonViewSet(viewsets.ModelViewSet):
    """ViewSet for lesson CRUD operations"""
    queryset = Lesson.objects.all().order_by('order')
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Restrict lessons to courses the user may actually access.

        Lesson payloads carry video URLs and body content, i.e. the paid
        material. Previously this returned every lesson on the platform to any
        authenticated user (and `GET /api/lessons/` with no filter dumped the
        entire library). Access is now limited to:
          - courses the user is enrolled in, and
          - courses the user owns as the instructor.
        See PRODUCTION_READINESS.md (P0-2).
        """
        user = self.request.user
        if not user.is_authenticated:
            return Lesson.objects.none()

        queryset = Lesson.objects.filter(
            Q(course__enrollments__student=user) | Q(course__instructor=user)
        ).distinct()

        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset.select_related('course', 'chapter').order_by('order')

    def perform_create(self, serializer):
        """Ensure only course owner can create lessons"""
        course = serializer.validated_data.get('course')
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only add lessons to your own courses.")
        serializer.save()

    def perform_update(self, serializer):
        """Ensure only course owner can update lessons"""
        if serializer.instance.course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only edit lessons in your own courses.")
        serializer.save()

    def perform_destroy(self, instance):
        """Ensure only course owner can delete lessons"""
        if instance.course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only delete lessons from your own courses.")
        instance.delete()
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='mark-complete')
    def mark_complete(self, request, pk=None):
        """Mark a lesson as complete for the current user"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            lesson = self.get_object()
            
            # Check if user is enrolled in the course
            if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
                return Response(
                    {'detail': 'You must be enrolled in this course to mark lessons as complete.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get or create progress
            progress, created = Progress.objects.get_or_create(
                student=request.user,
                lesson=lesson,
                defaults={'completed': True, 'completed_at': timezone.now()}
            )
            
            if not created and not progress.completed:
                progress.completed = True
                progress.completed_at = timezone.now()
                progress.save()
            
            # Check if course is completed
            course = lesson.course
            total_lessons = course.lessons.count()
            completed_lessons = Progress.objects.filter(
                student=request.user,
                lesson__course=course,
                completed=True
            ).count()
            
            course_completed = (completed_lessons == total_lessons)
            
            return Response({
                'detail': 'Lesson marked as complete.',
                'progress': {
                    'completed': progress.completed,
                    'completed_at': progress.completed_at.isoformat() if progress.completed_at else None
                },
                'course_progress': {
                    'completed_lessons': completed_lessons,
                    'total_lessons': total_lessons,
                    'percentage': int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0,
                    'course_completed': course_completed
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error marking lesson complete: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Failed to mark lesson complete: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='bulk-delete-without-video')
    def bulk_delete_without_video(self, request):
        """Delete all lessons without valid video URLs for a specific course"""
        course_id = request.data.get('course_id')
        
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'detail': 'Course not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the course instructor
        if course.instructor != request.user:
            return Response(
                {'detail': 'You can only delete lessons from your own courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Find lessons without video URLs
        lessons_without_video = Lesson.objects.filter(
            course=course
        ).filter(
            Q(video_url__isnull=True) | Q(video_url='') | Q(video_url__exact='')
        )
        
        deleted_count = lessons_without_video.count()
        deleted_titles = list(lessons_without_video.values_list('title', flat=True))
        
        # Delete the lessons
        lessons_without_video.delete()
        
        return Response({
            'detail': f'Successfully deleted {deleted_count} lesson(s) without video.',
            'deleted_count': deleted_count,
            'deleted_lessons': deleted_titles
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def reorder(self, request):
        """Reorder lessons within a course"""
        lessons_data = request.data.get('lessons', [])
        course_id = request.data.get('course_id')
        
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id)
        
        # Verify ownership
        if course.instructor != request.user:
            raise permissions.PermissionDenied("You can only reorder lessons in your own courses.")
        
        # Update lesson orders
        for item in lessons_data:
            lesson_id = item.get('id')
            new_order = item.get('order')
            try:
                lesson = Lesson.objects.get(id=lesson_id, course=course)
                lesson.order = new_order
                lesson.save()
            except Lesson.DoesNotExist:
                return Response(
                    {'detail': f'Lesson {lesson_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response({'detail': 'Lessons reordered successfully.'})
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated],
            parser_classes=[MultiPartParser, FormParser])
    def upload_video(self, request, pk=None):
        """Upload lesson video file"""
        from rest_framework.parsers import MultiPartParser, FormParser
        
        lesson = self.get_object()
        
        # Check if user is the course instructor
        if lesson.course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can upload videos.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'video' not in request.FILES:
            return Response(
                {'video': ['No file was submitted.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video_file = request.FILES['video']
        
        # Validate file size (max 500MB)
        max_size = 500 * 1024 * 1024  # 500MB
        if video_file.size > max_size:
            return Response(
                {'video': ['File size must be less than 500MB.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
        if video_file.content_type not in allowed_types:
            return Response(
                {'video': ['File must be a video (MP4, WebM, OGG, or MOV).']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save video
        lesson.video_file = video_file
        lesson.save()
        
        serializer = self.get_serializer(lesson)
        return Response({
            'detail': 'Video uploaded successfully.',
            'lesson': serializer.data
        }, status=status.HTTP_200_OK)


class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for enrollment operations"""
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter enrollments by current user or by course for instructors"""
        user = self.request.user
        # EnrollmentSerializer nests the full course (with its instructor,
        # category and lessons) and computes a progress percentage, so without
        # these joins each row costs several extra queries.
        queryset = Enrollment.objects.select_related(
            'student', 'course', 'course__instructor', 'course__category'
        ).prefetch_related('course__lessons')

        # Check if filtering by course (for instructors)
        course_id = self.request.query_params.get('course')
        if course_id:
            # Verify user is instructor of the course
            try:
                course = Course.objects.get(id=course_id)
                if user.is_instructor and course.instructor == user:
                    return queryset.filter(course_id=course_id)
            except (Course.DoesNotExist, ValueError):
                pass

        # Default: return user's own enrollments (for students)
        return queryset.filter(student=user)

    def create(self, request, *args, **kwargs):
        """
        Self-enrol the current user in a FREE, published course.

        Paid courses cannot be enrolled into through this endpoint. Previously
        it ignored Course.price entirely, so any authenticated user could
        obtain any paid course for nothing. Paid access must instead be created
        by the payment flow once a payment is confirmed.
        See PRODUCTION_READINESS.md (P0-3).
        """
        from django.db import IntegrityError

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data.get('course_id')
        course = get_object_or_404(Course, id=course_id)

        # Only published courses are enrollable; drafts and archived courses
        # were previously reachable through this endpoint.
        if course.status != 'published':
            return Response(
                {'detail': 'This course is not available for enrollment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not course_is_free(course):
            return Response(
                {
                    'detail': 'This is a paid course. Please complete checkout to enrol.',
                    'code': 'payment_required',
                    'price': str(course.price),
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # Check for duplicate enrollment before attempting to save
        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Save with current user as student
            serializer.save(student=request.user)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except IntegrityError:
            # Safety net in case of race condition
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_destroy(self, instance):
        """Ensure user can only unenroll from their own enrollments"""
        if instance.student != self.request.user:
            raise permissions.PermissionDenied("You can only unenroll from your own enrollments.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def my_enrollments(self, request):
        """Get current user's enrollments"""
        # Reuse get_queryset so this path gets the same joins (it previously
        # queried Enrollment directly and re-introduced the N+1).
        enrollments = self.get_queryset().filter(student=request.user)
        serializer = self.get_serializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check(self, request):
        """
        Check enrollment in a course.

        An instructor may check another user only for a course they own.
        Previously any user with is_instructor set could probe any student's
        enrollment in any course. See PRODUCTION_READINESS.md (P1-6).
        """
        course_id = request.query_params.get('courseId')
        user_id = request.query_params.get('userId')

        if not course_id:
            return Response(
                {'detail': 'courseId is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_user_id = request.user.id

        if user_id:
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'userId must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if user_id != request.user.id:
                owns_course = Course.objects.filter(
                    id=course_id, instructor=request.user
                ).exists()
                if not (request.user.is_instructor and owns_course):
                    return Response(
                        {'detail': 'You can only check enrollments for your own courses.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                target_user_id = user_id

        is_enrolled = Enrollment.objects.filter(
            student_id=target_user_id,
            course_id=course_id
        ).exists()

        return Response({'is_enrolled': is_enrolled})
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated],
            throttle_classes=[SensitiveActionThrottle])
    def enroll_with_coupon(self, request):
        """
        Enrol using a coupon that reduces the price to zero.

        A coupon only grants immediate access when it makes the course free —
        i.e. a 100% discount, or any coupon on an already-free course. Partial
        discounts must go through checkout for the remaining balance.

        Previously this granted a full enrolment for ANY valid coupon
        regardless of discount_percentage, so a 10%-off code yielded free
        access. See PRODUCTION_READINESS.md (P0-5).
        """
        from .models import Coupon

        course_id = request.data.get('course_id')
        coupon_code = request.data.get('coupon_code')

        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not coupon_code:
            return Response(
                {'detail': 'coupon_code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        course = get_object_or_404(Course, id=course_id)

        if course.status != 'published':
            return Response(
                {'detail': 'This course is not available for enrollment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already enrolled
        if Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get and validate coupon. Deliberately returns the same message for
        # unknown and invalid codes so the endpoint cannot be used to
        # enumerate which codes exist.
        try:
            coupon = Coupon.objects.get(code=coupon_code.upper())
        except Coupon.DoesNotExist:
            return Response(
                {'detail': 'This coupon code is not valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not coupon.is_valid():
            return Response(
                {'detail': 'This coupon code is not valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if coupon.has_been_used_by(request.user):
            return Response(
                {'detail': 'You have already used this coupon.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        final_price = coupon.apply_to(course.price)

        if not course_is_free(course) and final_price > 0:
            return Response(
                {
                    'detail': (
                        'This coupon reduces the price but does not make the course '
                        'free. Please complete checkout for the remaining balance.'
                    ),
                    'code': 'payment_required',
                    'original_price': str(course.price),
                    'discount_percentage': coupon.discount_percentage,
                    'final_price': str(final_price),
                },
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        # Price is zero: record the redemption and grant access atomically so a
        # concurrent request cannot exceed max_uses.
        try:
            with transaction.atomic():
                if not coupon.redeem(request.user):
                    return Response(
                        {'detail': 'This coupon code is not valid.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                enrollment = Enrollment.objects.create(student=request.user, course=course)
        except IntegrityError:
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(enrollment)
        return Response({
            'detail': f'Successfully enrolled with coupon {coupon.code}.',
            'enrollment': serializer.data,
            'discount_percentage': coupon.discount_percentage,
            'final_price': str(final_price),
        }, status=status.HTTP_201_CREATED)


class ProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for progress tracking"""
    queryset = Progress.objects.all()
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter progress by current user"""
        return Progress.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        """Create or update progress for current user"""
        lesson_id = serializer.validated_data.get('lesson_id')
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Check if user is enrolled in the course
        if not Enrollment.objects.filter(student=self.request.user, course=lesson.course).exists():
            raise permissions.PermissionDenied("You must be enrolled in this course to track progress.")
        
        serializer.save(student=self.request.user)

    def perform_update(self, serializer):
        """Ensure user can only update their own progress"""
        if serializer.instance.student != self.request.user:
            raise permissions.PermissionDenied("You can only update your own progress.")
        serializer.save()

    @action(detail=False, methods=['get'])
    def course_progress(self, request):
        """Get progress for a specific course"""
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id)
        
        # Check enrollment
        if not Enrollment.objects.filter(student=request.user, course=course).exists():
            raise permissions.PermissionDenied("You must be enrolled in this course.")
        
        progress = Progress.objects.filter(student=request.user, lesson__course=course)
        serializer = self.get_serializer(progress, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def student_progress(self, request):
        """Get all students' progress for instructor's courses"""
        if not request.user.is_instructor:
            raise permissions.PermissionDenied("Only instructors can view student progress.")
        
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        
        # Get all enrollments for this course
        enrollments = Enrollment.objects.filter(course=course)
        
        student_progress_data = []
        for enrollment in enrollments:
            total_lessons = course.lessons.count()
            completed = Progress.objects.filter(
                student=enrollment.student,
                lesson__course=course,
                completed=True
            ).count()
            percentage = int((completed / total_lessons) * 100) if total_lessons > 0 else 0
            
            student_progress_data.append({
                'student': enrollment.student.username,
                'student_id': enrollment.student.id,
                'completed_lessons': completed,
                'total_lessons': total_lessons,
                'percentage': percentage
            })
        
        return Response(student_progress_data)


# Platform Stats API (public endpoint for homepage)
class PlatformStatsView(APIView):
    """Public platform statistics for homepage"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Get platform-wide statistics"""
        from certificates.models import Certificate
        
        # Total students (users with is_student=True)
        total_students = User.objects.filter(is_student=True).count()
        
        # Total published courses
        total_courses = Course.objects.filter(status='published').count()
        
        # Total certificates issued
        try:
            total_certificates = Certificate.objects.count()
        except:
            total_certificates = 0
        
        # Calculate success rate (completed enrollments / total enrollments)
        total_enrollments = Enrollment.objects.count()
        if total_enrollments > 0:
            # Count enrollments where student completed all lessons
            completed_enrollments = 0
            for enrollment in Enrollment.objects.select_related('course').all():
                course = enrollment.course
                total_lessons = course.lessons.count()
                if total_lessons > 0:
                    completed_lessons = Progress.objects.filter(
                        student=enrollment.student,
                        lesson__course=course,
                        completed=True
                    ).count()
                    if completed_lessons == total_lessons:
                        completed_enrollments += 1
            success_rate = f"{int((completed_enrollments / total_enrollments) * 100)}%"
        else:
            success_rate = "0%"
        
        return Response({
            'total_students': total_students,
            'total_courses': total_courses,
            'total_certificates': total_certificates,
            'success_rate': success_rate
        })


# Student Dashboard API
class StudentDashboardView(APIView):
    """Student dashboard with enrolled courses and progress"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get student dashboard data"""
        user_id = request.query_params.get('userId')
        
        # Use provided userId or current user
        if user_id and request.user.is_instructor:
            student = get_object_or_404(User, id=user_id)
        else:
            student = request.user
        
        # Get all enrollments
        enrollments = Enrollment.objects.filter(student=student).select_related('course')
        
        dashboard_data = {
            'enrolled_courses': [],
            'total_courses': enrollments.count(),
            'completed_courses': 0,
            'in_progress_courses': 0,
            'total_lessons_completed': 0
        }
        
        for enrollment in enrollments:
            course = enrollment.course
            total_lessons = course.lessons.count()
            completed_lessons = Progress.objects.filter(
                student=student,
                lesson__course=course,
                completed=True
            ).count()
            
            percentage = int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
            
            if percentage == 100:
                dashboard_data['completed_courses'] += 1
            elif percentage > 0:
                dashboard_data['in_progress_courses'] += 1
            
            dashboard_data['total_lessons_completed'] += completed_lessons
            
            dashboard_data['enrolled_courses'].append({
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'instructor': course.instructor.username,
                'enrolled_at': enrollment.enrolled_at,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percentage': percentage
            })
        
        return Response(dashboard_data)


# Instructor Analytics API
class InstructorAnalyticsView(APIView):
    """Instructor analytics and statistics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get instructor analytics"""
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can view analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instructor_id = request.query_params.get('instructorId')
        if instructor_id and int(instructor_id) != request.user.id:
            return Response(
                {'detail': 'You can only view your own analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get instructor's courses
        courses = Course.objects.filter(instructor=request.user)
        
        # Calculate statistics
        total_courses = courses.count()
        total_students = Enrollment.objects.filter(course__instructor=request.user).values('student').distinct().count()
        total_enrollments = Enrollment.objects.filter(course__instructor=request.user).count()
        total_lessons = Lesson.objects.filter(course__instructor=request.user).count()
        
        # Course-wise enrollment data
        course_data = []
        for course in courses:
            enrollments = course.enrollments.count()
            lessons = course.lessons.count()
            
            # Calculate average progress
            enrolled_students = Enrollment.objects.filter(course=course)
            total_progress = 0
            for enrollment in enrolled_students:
                completed = Progress.objects.filter(
                    student=enrollment.student,
                    lesson__course=course,
                    completed=True
                ).count()
                progress = (completed / lessons * 100) if lessons > 0 else 0
                total_progress += progress
            
            avg_progress = (total_progress / enrollments) if enrollments > 0 else 0
            
            course_data.append({
                'id': course.id,
                'title': course.title,
                'enrollments': enrollments,
                'lessons': lessons,
                'average_progress': round(avg_progress, 1)
            })
        
        analytics = {
            'total_courses': total_courses,
            'total_students': total_students,
            'total_enrollments': total_enrollments,
            'total_lessons': total_lessons,
            'courses': course_data
        }
        
        return Response(analytics)


class InstructorActivityView(APIView):
    """Recent activity for instructor"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get recent activity"""
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can view activity.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        limit = int(request.query_params.get('limit', 10))
        
        # Get recent enrollments in instructor's courses
        recent_enrollments = Enrollment.objects.filter(
            course__instructor=request.user
        ).select_related('student', 'course').order_by('-enrolled_at')[:limit]
        
        activities = []
        for enrollment in recent_enrollments:
            activities.append({
                'type': 'enrollment',
                'student': enrollment.student.username,
                'course': enrollment.course.title,
                'timestamp': enrollment.enrolled_at,
                'message': f"{enrollment.student.username} enrolled in {enrollment.course.title}"
            })
        
        return Response(activities)


class InstructorStudentsView(APIView):
    """List of students enrolled in instructor's courses"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get students list"""
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can view students.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        limit = int(request.query_params.get('limit', 50))
        
        # Get unique students enrolled in instructor's courses
        enrollments = Enrollment.objects.filter(
            course__instructor=request.user
        ).select_related('student', 'course').order_by('-enrolled_at')
        
        # Group by student
        students_dict = {}
        for enrollment in enrollments:
            student_id = enrollment.student.id
            if student_id not in students_dict:
                students_dict[student_id] = {
                    'id': student_id,
                    'username': enrollment.student.username,
                    'email': enrollment.student.email,
                    'enrolled_courses': [],
                    'total_courses': 0
                }
            students_dict[student_id]['enrolled_courses'].append(enrollment.course.title)
            students_dict[student_id]['total_courses'] += 1
        
        students_list = list(students_dict.values())[:limit]
        
        return Response({
            'total': len(students_dict),
            'students': students_list
        })


class CourseStudentsProgressView(APIView):
    """Get all students' progress for a specific course (instructor only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        """Get list of all students and their progress in the course"""
        course = get_object_or_404(Course, id=course_id)
        
        # Only course instructor can view this
        if not request.user.is_instructor or course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can view student progress.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all enrollments for this course
        enrollments = Enrollment.objects.filter(course=course).select_related('student')
        total_lessons = course.lessons.count()
        
        students_progress = []
        for enrollment in enrollments:
            completed_lessons = Progress.objects.filter(
                student=enrollment.student,
                lesson__course=course,
                completed=True
            ).count()
            
            progress_percentage = int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
            
            # Get last activity
            last_progress = Progress.objects.filter(
                student=enrollment.student,
                lesson__course=course
            ).order_by('-completed_at').first()
            
            students_progress.append({
                'student_id': enrollment.student.id,
                'student_name': enrollment.student.username,
                'student_email': enrollment.student.email,
                'enrolled_at': enrollment.enrolled_at.isoformat(),
                'completed_lessons': completed_lessons,
                'total_lessons': total_lessons,
                'progress_percentage': progress_percentage,
                'last_activity': last_progress.completed_at.isoformat() if last_progress and last_progress.completed_at else None
            })
        
        return Response({
            'course_id': course.id,
            'course_title': course.title,
            'total_students': len(students_progress),
            'total_lessons': total_lessons,
            'students': students_progress
        })


class CourseDetailWithProgressView(APIView):
    """Get course details with student progress and lessons"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        """Get course details with progress for enrolled student or instructor"""
        course = get_object_or_404(Course, id=course_id)
        
        # Get student_id from query params (for instructor viewing student progress)
        student_id = request.query_params.get('studentId')
        
        # Determine which user's progress to show
        if student_id and request.user.is_instructor and course.instructor == request.user:
            # Instructor viewing a specific student's progress
            target_user = get_object_or_404(User, id=student_id)
            enrollment = Enrollment.objects.filter(student=target_user, course=course).first()
            if not enrollment:
                return Response(
                    {'detail': 'This student is not enrolled in this course.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif request.user.is_instructor and course.instructor == request.user:
            # Instructor viewing their own course (no specific student)
            # Return course info without specific student progress
            target_user = None
            enrollment = None
        else:
            # Student viewing their own progress
            target_user = request.user
            enrollment = Enrollment.objects.filter(student=request.user, course=course).first()
            if not enrollment:
                return Response(
                    {'detail': 'You are not enrolled in this course.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get all lessons for the course
        lessons = course.lessons.all().order_by('order')
        total_lessons = lessons.count()
        
        # Get progress for each lesson
        lesson_data = []
        completed_count = 0
        next_lesson = None
        
        for lesson in lessons:
            if target_user:
                progress = Progress.objects.filter(student=target_user, lesson=lesson).first()
                is_completed = progress.completed if progress else False
                
                if is_completed:
                    completed_count += 1
                elif next_lesson is None and not is_completed:
                    next_lesson = {
                        'id': lesson.id,
                        'title': lesson.title
                    }
                
                lesson_data.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'order': lesson.order,
                    'duration': '0:00',  # Duration not stored in model yet
                    'completed': is_completed,
                    'completed_at': progress.completed_at.isoformat() if progress and progress.completed_at else None,
                    'video_url': lesson.video_url,
                    'video_file': request.build_absolute_uri(lesson.video_file.url) if lesson.video_file else None,
                    'content': lesson.content
                })
            else:
                # Instructor viewing course without specific student - no progress data
                lesson_data.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'order': lesson.order,
                    'duration': '0:00',
                    'completed': False,
                    'completed_at': None,
                    'video_url': lesson.video_url,
                    'video_file': request.build_absolute_uri(lesson.video_file.url) if lesson.video_file else None,
                    'content': lesson.content
                })
        
        # Calculate progress percentage
        progress_percentage = int((completed_count / total_lessons) * 100) if total_lessons > 0 and target_user else 0
        
        # Build response
        response_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'instructor': {
                'id': course.instructor.id,
                'name': course.instructor.username,
                'email': course.instructor.email
            },
            'thumbnail': request.build_absolute_uri(course.thumbnail.url) if course.thumbnail else None,
            'price': float(course.price),
            'total_lessons': total_lessons,
            'enrolled_at': enrollment.enrolled_at.isoformat() if enrollment else None,
            'progress_percentage': progress_percentage,
            'completed_lessons': completed_count,
            'next_lesson': next_lesson,
            'lessons': lesson_data,
            'status': course.status,
            'created_at': course.created_at.isoformat(),
            'updated_at': course.updated_at.isoformat(),
            'is_instructor_view': request.user.is_instructor and course.instructor == request.user,
            'viewing_student': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email
            } if target_user and student_id else None
        }
        
        return Response(response_data)


# Chapter ViewSet
class ChapterViewSet(viewsets.ModelViewSet):
    """ViewSet for course chapters/sections"""
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter chapters by course"""
        course_id = self.request.query_params.get('course_id')
        if course_id:
            return Chapter.objects.filter(course_id=course_id).order_by('order')
        return Chapter.objects.all().order_by('course', 'order')
    
    def perform_create(self, serializer):
        """Ensure only course owner can create chapters"""
        course = serializer.validated_data.get('course')
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only add chapters to your own courses.")
        serializer.save()
    
    def perform_update(self, serializer):
        """Ensure only course owner can update chapters"""
        if serializer.instance.course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only edit chapters in your own courses.")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Ensure only course owner can delete chapters"""
        if instance.course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only delete chapters from your own courses.")
        instance.delete()
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reorder(self, request):
        """Reorder chapters within a course"""
        chapters_data = request.data.get('chapters', [])
        course_id = request.data.get('course_id')
        
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'detail': 'Course not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if course.instructor != request.user:
            return Response(
                {'detail': 'You can only reorder chapters in your own courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update chapter orders
        for chapter_data in chapters_data:
            chapter_id = chapter_data.get('id')
            new_order = chapter_data.get('order')
            
            try:
                chapter = Chapter.objects.get(id=chapter_id, course=course)
                chapter.order = new_order
                chapter.save()
            except Chapter.DoesNotExist:
                continue
        
        return Response({'detail': 'Chapters reordered successfully.'}, status=status.HTTP_200_OK)


# Category ViewSet
class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for course categories"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_permissions(self):
        """Only instructors can create/update/delete categories"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class CouponValidateView(APIView):
    """
    Validate a single coupon code against a course.

    This replaces the previous browsable coupon endpoints, which were
    AllowAny and — with no `code` filter — returned EVERY active coupon
    including its code and discount, letting anyone enumerate all discounts
    on the platform. See PRODUCTION_READINESS.md (P0-4).

    Callers must be authenticated, are rate limited, and can only ever confirm
    or deny one code they already know. Nothing here lists codes.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [SensitiveActionThrottle]

    # Uniform failure message: never reveal whether a code exists, is expired,
    # is exhausted, or was already used, since that turns this into an oracle.
    INVALID = {'valid': False, 'detail': 'This coupon code is not valid.'}

    def post(self, request):
        code = (request.data.get('code') or '').strip()
        course_id = request.data.get('course_id')

        if not code:
            return Response(
                {'detail': 'Coupon code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        course = get_object_or_404(Course, id=course_id, status='published')

        try:
            coupon = Coupon.objects.get(code=code.upper())
        except Coupon.DoesNotExist:
            return Response(self.INVALID, status=status.HTTP_200_OK)

        if not coupon.is_valid() or coupon.has_been_used_by(request.user):
            return Response(self.INVALID, status=status.HTTP_200_OK)

        final_price = coupon.apply_to(course.price)

        # Return only what checkout needs to render a price — never max_uses,
        # times_used, validity windows or the coupon's internal id.
        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_percentage': coupon.discount_percentage,
            'original_price': str(course.price),
            'final_price': str(final_price),
            'grants_free_access': course_is_free(course) or final_price <= 0,
        }, status=status.HTTP_200_OK)
