from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
from django.contrib.contenttypes.models import ContentType

from courses.models import Course, Enrollment, Lesson
from .models import ActivityLog, LessonTimeTracking, DailyActivitySummary
from .utils import get_user_activity_stats, get_course_engagement_stats
from .serializers import ActivityLogSerializer, ActivityLogDetailSerializer
from .permissions import IsInstructor


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_students_activity(request, course_id):
    """
    Get activity data for all students in a course (instructor only).
    """
    # Verify user is instructor of this course
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    
    # Get all enrollments
    enrollments = Enrollment.objects.filter(course=course).select_related('student')
    
    students_data = []
    for enrollment in enrollments:
        student = enrollment.student
        
        # Get recent activity
        last_activity = ActivityLog.objects.filter(
            user=student,
            content_type__model='lesson',
            object_id__in=course.lessons.values_list('id', flat=True)
        ).order_by('-timestamp').first()
        
        # Get time tracking stats
        time_stats = LessonTimeTracking.objects.filter(
            student=student,
            lesson__course=course
        ).aggregate(
            total_time=Sum('time_spent'),
            completed_count=Count('id', filter=Q(completed=True))
        )
        
        # Get engagement score from daily summaries
        recent_summary = DailyActivitySummary.objects.filter(
            user=student
        ).order_by('-date').first()
        
        # Get recent activities
        recent_activities = ActivityLog.objects.filter(
            user=student,
            action_type__in=['lesson_view', 'lesson_complete', 'course_view']
        ).order_by('-timestamp')[:5]
        
        students_data.append({
            'student_id': student.id,
            'student_name': student.username,
            'last_active': last_activity.timestamp.isoformat() if last_activity else None,
            'total_time_spent': time_stats['total_time'] or 0,
            'lessons_completed': time_stats['completed_count'] or 0,
            'engagement_score': recent_summary.engagement_score if recent_summary else 0,
            'recent_activities': [
                {
                    'action': activity.get_action_type_display(),
                    'timestamp': activity.timestamp.isoformat(),
                    'lesson': activity.description
                }
                for activity in recent_activities
            ]
        })
    
    return Response({'data': students_data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_detail_activity(request, course_id, student_id):
    """
    Get detailed activity data for a specific student in a course (instructor only).
    """
    # Verify user is instructor of this course
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    
    # Verify student is enrolled
    enrollment = get_object_or_404(Enrollment, course=course, student_id=student_id)
    student = enrollment.student
    
    # Get comprehensive stats
    stats = get_user_activity_stats(student, days=30)
    
    # Get lesson-by-lesson progress
    lesson_progress = []
    for lesson in course.lessons.all():
        tracking = LessonTimeTracking.objects.filter(
            student=student,
            lesson=lesson
        ).first()
        
        lesson_progress.append({
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'time_spent': tracking.time_spent if tracking else 0,
            'completed': tracking.completed if tracking else False,
            'completed_at': tracking.completed_at.isoformat() if tracking and tracking.completed_at else None,
            'last_position': tracking.last_position if tracking else 0,
            'pause_count': tracking.pause_count if tracking else 0,
            'replay_count': tracking.replay_count if tracking else 0,
        })
    
    # Get activity timeline
    activities = ActivityLog.objects.filter(
        user=student
    ).filter(
        Q(content_type__model='lesson', object_id__in=course.lessons.values_list('id', flat=True)) |
        Q(content_type__model='course', object_id=course.id)
    ).order_by('-timestamp')[:50]
    
    activity_timeline = [
        {
            'id': activity.id,
            'action': activity.get_action_type_display(),
            'action_type': activity.action_type,
            'description': activity.description,
            'timestamp': activity.timestamp.isoformat(),
            'metadata': activity.metadata
        }
        for activity in activities
    ]
    
    # Get daily summaries for last 30 days
    daily_summaries = DailyActivitySummary.objects.filter(
        user=student,
        date__gte=timezone.now().date() - timedelta(days=30)
    ).order_by('-date')
    
    daily_data = [
        {
            'date': summary.date.isoformat(),
            'login_count': summary.login_count,
            'lessons_viewed': summary.lessons_viewed,
            'lessons_completed': summary.lessons_completed,
            'time_spent': summary.total_time_spent,
            'engagement_score': summary.engagement_score
        }
        for summary in daily_summaries
    ]
    
    return Response({
        'student': {
            'id': student.id,
            'username': student.username,
            'email': student.email,
        },
        'course': {
            'id': course.id,
            'title': course.title,
        },
        'stats': stats,
        'lesson_progress': lesson_progress,
        'activity_timeline': activity_timeline,
        'daily_summaries': daily_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_analytics(request, course_id):
    """
    Get comprehensive analytics for a course (instructor only).
    """
    # Verify user is instructor of this course
    course = get_object_or_404(Course, id=course_id, instructor=request.user)
    
    # Get course engagement stats
    engagement_stats = get_course_engagement_stats(course)
    
    # Get enrollment trend (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    enrollments_by_day = Enrollment.objects.filter(
        course=course,
        enrolled_at__gte=thirty_days_ago
    ).extra(
        select={'day': 'date(enrolled_at)'}
    ).values('day').annotate(count=Count('id')).order_by('day')
    
    # Get completion rate by lesson.
    # Previously this issued two queries per lesson inside the loop (a
    # completion count plus a re-count of enrollments that never varies), so a
    # 50-lesson course cost 100 queries. Now: one annotated query plus one
    # count. See PRODUCTION_READINESS.md (P2-1).
    total_enrolled = Enrollment.objects.filter(course=course).count()

    lessons_with_counts = course.lessons.annotate(
        completed_count=Count(
            'time_logs',
            filter=Q(time_logs__completed=True),
            distinct=True,
        )
    ).order_by('order')

    lesson_completion = [
        {
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'completed_count': lesson.completed_count,
            'completion_rate': round(
                (lesson.completed_count / total_enrolled * 100) if total_enrolled > 0 else 0,
                1,
            ),
        }
        for lesson in lessons_with_counts
    ]
    
    return Response({
        'engagement_stats': engagement_stats,
        'enrollment_trend': list(enrollments_by_day),
        'lesson_completion': lesson_completion,
    })



class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing activity logs.
    Trainers can only see activities from their courses.
    
    Supports filtering by:
    - course: Filter by course ID
    - student: Filter by student ID
    - action_type: Filter by action type
    - date_from: Filter activities from this date (YYYY-MM-DD)
    - date_to: Filter activities to this date (YYYY-MM-DD)
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsInstructor]
    
    def get_queryset(self):
        """
        Return activity logs for the trainer's courses only.
        Supports filtering by course, student, action_type, and date_range.
        """
        user = self.request.user
        
        # Get all courses taught by this instructor
        instructor_courses = Course.objects.filter(instructor=user)
        
        # Get all lessons from instructor's courses
        lesson_ids = Lesson.objects.filter(course__in=instructor_courses).values_list('id', flat=True)
        
        # Get content types for Course and Lesson
        course_ct = ContentType.objects.get_for_model(Course)
        lesson_ct = ContentType.objects.get_for_model(Lesson)
        
        # Build base queryset - activities related to instructor's courses or lessons
        queryset = ActivityLog.objects.filter(
            Q(content_type=course_ct, object_id__in=instructor_courses.values_list('id', flat=True)) |
            Q(content_type=lesson_ct, object_id__in=lesson_ids)
        ).select_related('user').order_by('-timestamp')
        
        # Apply filters from query parameters
        course_id = self.request.query_params.get('course', None)
        student_id = self.request.query_params.get('student', None)
        action_type = self.request.query_params.get('action_type', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        # Filter by course
        if course_id:
            try:
                course = Course.objects.get(id=course_id, instructor=user)
                course_lesson_ids = course.lessons.values_list('id', flat=True)
                queryset = queryset.filter(
                    Q(content_type=course_ct, object_id=course.id) |
                    Q(content_type=lesson_ct, object_id__in=course_lesson_ids)
                )
            except Course.DoesNotExist:
                # Return empty queryset if course doesn't exist or doesn't belong to trainer
                return ActivityLog.objects.none()
        
        # Filter by student
        if student_id:
            queryset = queryset.filter(user_id=student_id)
        
        # Filter by action type
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        # Filter by date range
        if date_from:
            try:
                from_date = timezone.datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__gte=from_date)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        if date_to:
            try:
                to_date = timezone.datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__lte=to_date)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='recent')
    def recent(self, request):
        """
        Get recent activities for trainer's courses.
        Returns last 50 activities by default.
        
        Query parameters:
        - limit: Number of activities to return (default: 50, max: 100)
        """
        # Get limit from query params, default to 50, max 100
        try:
            limit = int(request.query_params.get('limit', 50))
            limit = min(limit, 100)  # Cap at 100
        except (ValueError, TypeError):
            limit = 50
        
        # Get the filtered queryset and limit it
        queryset = self.get_queryset()[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
