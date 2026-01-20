"""
Analytics API views for trainer dashboard.

Provides endpoints for trainers to view comprehensive analytics about
their courses, students, and engagement metrics.
"""
from django.utils import timezone
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsInstructor
from courses.models import Course
from .utils import (
    calculate_trainer_analytics,
    calculate_course_statistics,
    calculate_enrollment_trends,
    calculate_completion_rates,
    get_lesson_statistics,
    get_assessment_statistics,
)


class TrainerAnalyticsView(APIView):
    """
    GET /api/analytics/dashboard/

    Returns comprehensive dashboard analytics for the authenticated trainer.

    Response includes:
    - total_courses: Total number of courses created
    - total_students: Total unique students across all courses
    - total_enrollments: Total enrollment count
    - total_lessons: Total lesson count across all courses
    - courses: List of per-course analytics

    Cached for 5 minutes.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request):
        trainer = request.user

        # Generate cache key based on trainer ID
        cache_key = f'trainer_analytics_{trainer.id}'
        cached_data = cache.get(cache_key)

        if cached_data is not None:
            return Response(cached_data)

        # Calculate analytics
        analytics_data = calculate_trainer_analytics(trainer)

        # Cache for 5 minutes (300 seconds)
        cache.set(cache_key, analytics_data, timeout=300)

        return Response(analytics_data, status=status.HTTP_200_OK)


class CourseStatisticsView(APIView):
    """
    GET /api/analytics/course/{id}/

    Returns detailed statistics for a specific course.

    Response includes:
    - enrollments: Total enrollment count
    - active_students: Students with activity in last 30 days
    - completion_rate: Percentage of students who completed all lessons
    - avg_progress: Average progress percentage
    - total_lessons: Total number of lessons
    - completed_students: Number of students who completed all lessons

    Verifies that the trainer owns the course.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request, course_id):
        trainer = request.user

        # Verify course ownership
        try:
            course = Course.objects.get(id=course_id, instructor=trainer)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate statistics
        stats = calculate_course_statistics(course_id, trainer)

        if stats is None:
            return Response(
                {'error': 'Failed to calculate statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(stats, status=status.HTTP_200_OK)


class CourseLessonStatisticsView(APIView):
    """
    GET /api/analytics/course/{id}/lessons/

    Returns lesson-level statistics for a course.

    Response includes:
    - lesson_id: Lesson ID
    - lesson_title: Lesson title
    - chapter: Chapter name
    - order: Lesson order
    - completion_count: Number of students who completed this lesson
    - avg_time_minutes: Average time spent on this lesson

    Verifies that the trainer owns the course.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request, course_id):
        trainer = request.user

        # Verify course ownership
        try:
            course = Course.objects.get(id=course_id, instructor=trainer)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get lesson statistics
        lesson_stats = get_lesson_statistics(course_id, trainer)

        if lesson_stats is None:
            return Response(
                {'error': 'Failed to calculate lesson statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(lesson_stats, status=status.HTTP_200_OK)


class CourseAssessmentStatisticsView(APIView):
    """
    GET /api/analytics/course/{id}/assessments/

    Returns assessment statistics for a course.

    Response includes:
    - assessment_id: Quiz ID
    - assessment_title: Quiz title
    - total_attempts: Total number of attempts
    - avg_score: Average score percentage
    - pass_rate: Percentage of attempts that passed
    - passing_score: Minimum passing score

    Verifies that the trainer owns the course.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request, course_id):
        trainer = request.user

        # Verify course ownership
        try:
            course = Course.objects.get(id=course_id, instructor=trainer)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get assessment statistics
        assessment_stats = get_assessment_statistics(course_id, trainer)

        if assessment_stats is None:
            return Response(
                {'error': 'Failed to calculate assessment statistics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(assessment_stats, status=status.HTTP_200_OK)


class EnrollmentTrendsView(APIView):
    """
    GET /api/analytics/enrollment_trends/

    Returns enrollment trend data grouped by time period.

    Query Parameters:
    - period: 'daily', 'weekly', or 'monthly' (default: 'daily')

    Response:
    [
        {
            "date": "2024-01-01",
            "count": 10
        },
        ...
    ]

    Only includes enrollments for the trainer's courses.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request):
        trainer = request.user
        period = request.query_params.get('period', 'daily')

        # Validate period parameter
        valid_periods = ['daily', 'weekly', 'monthly']
        if period not in valid_periods:
            return Response(
                {'error': f'Invalid period. Must be one of: {", ".join(valid_periods)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate trends
        trends = calculate_enrollment_trends(trainer, period)

        return Response(trends, status=status.HTTP_200_OK)


class CompletionRatesView(APIView):
    """
    GET /api/analytics/completion_rates/

    Returns completion rate for each of the trainer's courses.

    Response:
    [
        {
            "course_id": 1,
            "course_title": "Course Title",
            "total_enrolled": 100,
            "total_completed": 45,
            "completion_rate": 45.0
        },
        ...
    ]

    Sorted by completion rate descending.
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request):
        trainer = request.user

        # Calculate completion rates
        completion_data = calculate_completion_rates(trainer)

        return Response(completion_data, status=status.HTTP_200_OK)


class StudentEngagementView(APIView):
    """
    GET /api/analytics/engagement/

    Returns student engagement metrics for the trainer's courses.

    Query Parameters:
    - course_id: Optional, filter by specific course
    - days: Number of days to look back (default: 30)

    Response:
    {
        "total_active_students": 50,
        "new_enrollments": 10,
        "lessons_completed": 100,
        "avg_engagement_score": 75.5,
        "top_performers": [...],
        "at_risk_students": [...]
    }
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get(self, request):
        trainer = request.user
        course_id = request.query_params.get('course_id')
        days = int(request.query_params.get('days', 30))

        from datetime import timedelta
        from django.db.models import Count, Q, Avg
        from django.utils import timezone

        cutoff_date = timezone.now() - timedelta(days=days)

        # Base queryset for enrollments
        enrollments_qs = Enrollment.objects.filter(
            course__instructor=trainer
        )

        if course_id:
            enrollments_qs = enrollments_qs.filter(course_id=course_id)

        # Get active students (those with activity in the period)
        active_students = Enrollment.objects.filter(
            course__instructor=trainer,
            enrolled_at__gte=cutoff_date
        ).values('student').distinct().count()

        if course_id:
            enrollments_qs = enrollments_qs.filter(course_id=course_id)

        # Get course IDs for filtering
        course_ids = Course.objects.filter(instructor=trainer).values_list('id', flat=True)
        if course_id:
            course_ids = [int(course_id)]

        # Count lessons completed in the period
        lessons_completed = Progress.objects.filter(
            lesson__course_id__in=course_ids,
            completed_at__gte=cutoff_date,
            completed=True
        ).count()

        # Calculate average engagement score based on activity
        from activity.models import ActivityLog

        engagement_data = ActivityLog.objects.filter(
            timestamp__gte=cutoff_date,
            content_type__model='course',
            object_id__in=course_ids
        ).values('user').annotate(
            activity_count=Count('id')
        )

        avg_engagement = 0
        if engagement_data.exists():
            total_activities = sum(item['activity_count'] for item in engagement_data)
            avg_engagement = total_activities / engagement_data.count()

        # Get top performers (students with high completion rates)
        top_performers = []
        for course in Course.objects.filter(id__in=course_ids):
            total_lessons = course.lessons.count()
            if total_lessons == 0:
                continue

            student_progress = Progress.objects.filter(
                lesson__course=course,
                completed=True
            ).values('student').annotate(
                completed_count=Count('id')
            ).filter(
                completed_count__gte=total_lessons * 0.8  # At least 80% complete
            )[:5]

            for sp in student_progress:
                from core.models import User
                student = User.objects.get(id=sp['student'])
                completion_pct = (sp['completed_count'] / total_lessons) * 100
                top_performers.append({
                    'student_id': student.id,
                    'student_name': student.get_full_name() or student.username,
                    'course_id': course.id,
                    'course_title': course.title,
                    'completion_rate': round(completion_pct, 2),
                })

        # Get at-risk students (enrolled but low or no progress)
        at_risk_students = []
        for course in Course.objects.filter(id__in=course_ids):
            total_lessons = course.lessons.count()
            if total_lessons == 0:
                continue

            # Students with less than 20% progress after 7 days
            week_ago = timezone.now() - timedelta(days=7)

            early_enrollments = Enrollment.objects.filter(
                course=course,
                enrolled_at__lte=week_ago
            )

            for enrollment in early_enrollments:
                completed_count = Progress.objects.filter(
                    student=enrollment.student,
                    lesson__course=course,
                    completed=True
                ).count()

                completion_pct = (completed_count / total_lessons) * 100 if total_lessons > 0 else 0

                if completion_pct < 20:
                    at_risk_students.append({
                        'student_id': enrollment.student.id,
                        'student_name': enrollment.student.get_full_name() or enrollment.student.username,
                        'course_id': course.id,
                        'course_title': course.title,
                        'completion_rate': round(completion_pct, 2),
                        'enrolled_date': enrollment.enrolled_at.strftime('%Y-%m-%d'),
                    })

        return Response({
            'total_active_students': active_students,
            'new_enrollments': enrollments_qs.filter(enrolled_at__gte=cutoff_date).count(),
            'lessons_completed': lessons_completed,
            'avg_engagement_score': round(avg_engagement, 2),
            'top_performers': top_performers[:10],
            'at_risk_students': at_risk_students[:10],
        }, status=status.HTTP_200_OK)
