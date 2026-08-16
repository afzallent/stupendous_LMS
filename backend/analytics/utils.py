"""
Utility functions for calculating analytics and statistics.

These functions use Django ORM aggregation for efficient calculations
and are optimized with select_related and prefetch_related.
"""
from django.db.models import Count, Avg, Q, F, ExpressionWrapper, FloatField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache

from courses.models import Course, Lesson, Enrollment, Progress
from activity.models import ActivityLog, LessonTimeTracking


def calculate_trainer_analytics(trainer):
    """
    Calculate comprehensive analytics for a trainer.

    Args:
        trainer: User instance with is_instructor=True

    Returns:
        dict: Analytics data including:
            - total_courses: Total number of courses created by trainer
            - total_students: Total unique students enrolled in trainer's courses
            - total_enrollments: Total enrollment count across all courses
            - total_lessons: Total number of lessons across all courses
            - courses: List of per-course analytics
    """
    # Get all courses for this trainer with optimized queries
    courses = Course.objects.filter(instructor=trainer).select_related(
        'category'
    ).prefetch_related(
        'enrollments__student',
        'lessons'
    )

    # Calculate aggregate statistics
    total_courses = courses.count()
    total_enrollments = Enrollment.objects.filter(
        course__instructor=trainer
    ).count()

    # Count unique students using distinct
    total_students = Enrollment.objects.filter(
        course__instructor=trainer
    ).values('student').distinct().count()

    # Count total lessons
    total_lessons = Lesson.objects.filter(
        course__instructor=trainer
    ).count()

    # Calculate per-course analytics
    courses_data = []
    for course in courses:
        enrollment_count = course.enrollments.count()
        lessons_count = course.lessons.count()

        # Average completion across enrolled students: for each student,
        # completed lessons / total lessons * 100, then mean over students.
        # (Aggregating an aggregate — Avg(Count(...)) — is not valid SQL; the
        # per-student counts are annotated and averaged here instead.)
        if lessons_count > 0 and enrollment_count > 0:
            enrolled = course.enrollments.values('student')
            per_student = (
                Progress.objects.filter(
                    lesson__course=course,
                    completed=True,
                    student__in=enrolled,
                )
                .values('student')
                .annotate(done=Count('id', distinct=True))
            )
            total_pct = sum(
                min(row['done'], lessons_count) / lessons_count * 100.0
                for row in per_student
            )
            avg_progress = total_pct / enrollment_count
        else:
            avg_progress = 0

        courses_data.append({
            'id': course.id,
            'title': course.title,
            'enrollment_count': enrollment_count,
            'lesson_count': lessons_count,
            'avg_progress': round(avg_progress, 2) if avg_progress else 0,
        })

    return {
        'total_courses': total_courses,
        'total_students': total_students,
        'total_enrollments': total_enrollments,
        'total_lessons': total_lessons,
        'courses': courses_data,
    }


def calculate_course_statistics(course_id, trainer):
    """
    Calculate detailed statistics for a specific course.

    Args:
        course_id: ID of the course
        trainer: User instance to verify ownership

    Returns:
        dict: Course statistics including:
            - enrollments: Total number of enrollments
            - active_students: Students with activity in last 30 days
            - completion_rate: Percentage of students who completed all lessons
            - avg_progress: Average progress percentage across all students
    """
    try:
        course = Course.objects.get(id=course_id, instructor=trainer)
    except Course.DoesNotExist:
        return None

    # Get all enrollments for this course
    enrollments = course.enrollments.select_related('student')
    enrollment_count = enrollments.count()

    if enrollment_count == 0:
        return {
            'course_id': course.id,
            'course_title': course.title,
            'enrollments': 0,
            'active_students': 0,
            'completion_rate': 0,
            'avg_progress': 0,
        }

    # Calculate active students (activity in last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    active_students = ActivityLog.objects.filter(
        timestamp__gte=thirty_days_ago,
        content_type__model='course',
        object_id=course.id
    ).values('user').distinct().count()

    # Alternative: Check for any lesson activity in last 30 days
    if active_students == 0:
        active_students = Progress.objects.filter(
            lesson__course=course,
            completed_at__gte=thirty_days_ago
        ).values('student').distinct().count()

    # Calculate completion rate
    # A student is considered to have completed if they completed all lessons
    total_lessons = course.lessons.count()
    completed_students = 0

    if total_lessons > 0:
        # Count students who completed all lessons
        completed_students = Progress.objects.filter(
            lesson__course=course,
            completed=True
        ).values('student').annotate(
            completed_count=Count('id')
        ).filter(completed_count=total_lessons).count()

    completion_rate = (completed_students / enrollment_count * 100) if enrollment_count > 0 else 0

    # Calculate average progress across all enrolled students
    # For each student, calculate their progress percentage
    avg_progress = 0
    if total_lessons > 0:
        progress_aggregate = Progress.objects.filter(
            lesson__course=course
        ).values('student').annotate(
            completed_lessons=Count('id', filter=Q(completed=True))
        ).aggregate(
            avg_progress=Avg(
                ExpressionWrapper(
                    F('completed_lessons') * 100.0 / total_lessons,
                    output_field=FloatField()
                )
            )
        )
        avg_progress = progress_aggregate.get('avg_progress') or 0

    return {
        'course_id': course.id,
        'course_title': course.title,
        'enrollments': enrollment_count,
        'active_students': active_students,
        'completion_rate': round(completion_rate, 2),
        'avg_progress': round(avg_progress, 2),
        'total_lessons': total_lessons,
        'completed_students': completed_students,
    }


def calculate_enrollment_trends(trainer, period='daily'):
    """
    Calculate enrollment trends grouped by time period.

    Args:
        trainer: User instance with is_instructor=True
        period: Grouping period - 'daily', 'weekly', or 'monthly'

    Returns:
        list: Time series data with date and count
    """
    from django.db.models.functions import TruncDate, TruncWeek, TruncMonth

    # Get enrollments for trainer's courses
    enrollments = Enrollment.objects.filter(
        course__instructor=trainer
    ).annotate(
        date=TruncDate('enrolled_at')
    )

    # Group by period
    if period == 'weekly':
        enrollments = enrollments.annotate(
            period=TruncWeek('enrolled_at')
        )
    elif period == 'monthly':
        enrollments = enrollments.annotate(
            period=TruncMonth('enrolled_at')
        )
    else:  # daily
        enrollments = enrollments.annotate(
            period=TruncDate('enrolled_at')
        )

    # Aggregate counts by period
    trends = enrollments.values('period').annotate(
        count=Count('id')
    ).order_by('period')

    # Format results
    return [
        {
            'date': trend['period'].strftime('%Y-%m-%d'),
            'count': trend['count'],
        }
        for trend in trends
    ]


def calculate_completion_rates(trainer):
    """
    Calculate completion rates for all trainer's courses.

    Args:
        trainer: User instance with is_instructor=True

    Returns:
        list: Course completion data sorted by completion rate descending
    """
    courses = Course.objects.filter(instructor=trainer).prefetch_related('lessons', 'enrollments')

    completion_data = []

    for course in courses:
        total_lessons = course.lessons.count()
        enrollment_count = course.enrollments.count()

        if enrollment_count == 0 or total_lessons == 0:
            completion_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'total_enrolled': enrollment_count,
                'total_completed': 0,
                'completion_rate': 0,
            })
            continue

        # Count students who completed all lessons
        completed_students = Progress.objects.filter(
            lesson__course=course,
            completed=True
        ).values('student').annotate(
            completed_count=Count('id')
        ).filter(completed_count=total_lessons).count()

        completion_rate = (completed_students / enrollment_count * 100)

        completion_data.append({
            'course_id': course.id,
            'course_title': course.title,
            'total_enrolled': enrollment_count,
            'total_completed': completed_students,
            'completion_rate': round(completion_rate, 2),
        })

    # Sort by completion rate descending
    completion_data.sort(key=lambda x: x['completion_rate'], reverse=True)

    return completion_data


def get_lesson_statistics(course_id, trainer):
    """
    Get completion statistics for each lesson in a course.

    Args:
        course_id: ID of the course
        trainer: User instance to verify ownership

    Returns:
        list: Lesson statistics with completion count and average time
    """
    try:
        course = Course.objects.get(id=course_id, instructor=trainer)
    except Course.DoesNotExist:
        return None

    lessons = course.lessons.all().select_related('chapter')

    lesson_stats = []

    for lesson in lessons:
        # Count completions
        completion_count = Progress.objects.filter(
            lesson=lesson,
            completed=True
        ).count()

        # Calculate average time spent
        time_tracking = LessonTimeTracking.objects.filter(
            lesson=lesson
        ).aggregate(
            avg_time=Avg('time_spent')
        )

        avg_time_seconds = time_tracking.get('avg_time') or 0
        avg_time_minutes = round(avg_time_seconds / 60, 2) if avg_time_seconds > 0 else 0

        lesson_stats.append({
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'chapter': lesson.chapter.title if lesson.chapter else None,
            'order': lesson.order,
            'completion_count': completion_count,
            'avg_time_minutes': avg_time_minutes,
        })

    return lesson_stats


def get_assessment_statistics(course_id, trainer):
    """
    Get statistics for assessments in a course.

    Args:
        course_id: ID of the course
        trainer: User instance to verify ownership

    Returns:
        list: Assessment statistics with average score, pass rate, attempt count
    """
    from quizzes.models import Quiz, QuizAttempt

    try:
        course = Course.objects.get(id=course_id, instructor=trainer)
    except Course.DoesNotExist:
        return None

    quizzes = Quiz.objects.filter(course=course).prefetch_related('attempts')

    assessment_stats = []

    for quiz in quizzes:
        attempts = quiz.attempts.all()

        # Calculate average score
        avg_score_data = attempts.aggregate(
            avg_score=Avg('percentage')
        )
        avg_score = avg_score_data.get('avg_score') or 0

        # Calculate pass rate
        total_attempts = attempts.count()
        passed_attempts = attempts.filter(passed=True).count()
        pass_rate = (passed_attempts / total_attempts * 100) if total_attempts > 0 else 0

        assessment_stats.append({
            'assessment_id': quiz.id,
            'assessment_title': quiz.title,
            'total_attempts': total_attempts,
            'avg_score': round(float(avg_score), 2),
            'pass_rate': round(pass_rate, 2),
            'passing_score': quiz.passing_score,
        })

    return assessment_stats
