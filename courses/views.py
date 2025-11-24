from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q
from .models import Course, Lesson, Enrollment, Progress
from .forms import CourseForm, LessonForm

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
