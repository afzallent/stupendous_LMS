from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Course, Lesson, Enrollment, Progress
from .forms import CourseForm, LessonForm
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer,
    EnrollmentSerializer, ProgressSerializer
)
from .permissions import IsInstructorOrReadOnly, IsOwnerOrReadOnly, IsEnrolledStudent

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

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

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
        """Get courses created by current instructor"""
        if not request.user.is_instructor:
            return Response(
                {'detail': 'Only instructors can view their courses.'},
                status=status.HTTP_403_FORBIDDEN
            )
        courses = Course.objects.filter(instructor=request.user)
        page = self.paginate_queryset(courses)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)


class LessonViewSet(viewsets.ModelViewSet):
    """ViewSet for lesson CRUD operations"""
    queryset = Lesson.objects.all().order_by('order')
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter lessons by course"""
        course_id = self.request.query_params.get('course_id')
        if course_id:
            return Lesson.objects.filter(course_id=course_id).order_by('order')
        return Lesson.objects.all().order_by('order')

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


class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for enrollment operations"""
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter enrollments by current user"""
        return Enrollment.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        """Create enrollment for current user"""
        course_id = serializer.validated_data.get('course_id')
        course = get_object_or_404(Course, id=course_id)
        
        # Check for duplicate enrollment
        if Enrollment.objects.filter(student=self.request.user, course=course).exists():
            return Response(
                {'detail': 'You are already enrolled in this course.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save(student=self.request.user)

    def perform_destroy(self, instance):
        """Ensure user can only unenroll from their own enrollments"""
        if instance.student != self.request.user:
            raise permissions.PermissionDenied("You can only unenroll from your own enrollments.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def my_enrollments(self, request):
        """Get current user's enrollments"""
        enrollments = Enrollment.objects.filter(student=request.user)
        serializer = self.get_serializer(enrollments, many=True)
        return Response(serializer.data)


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
