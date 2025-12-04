from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from courses.models import Course, Enrollment
from .models import ActivityLog, LessonTimeTracking, DailyActivitySummary
from .utils import get_user_activity_stats, get_course_engagement_stats


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
        user=student,
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
    
    # Get completion rate by lesson
    lesson_completion = []
    for lesson in course.lessons.all():
        completed_count = LessonTimeTracking.objects.filter(
            lesson=lesson,
            completed=True
        ).count()
        
        total_enrolled = Enrollment.objects.filter(course=course).count()
        completion_rate = (completed_count / total_enrolled * 100) if total_enrolled > 0 else 0
        
        lesson_completion.append({
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'completed_count': completed_count,
            'completion_rate': round(completion_rate, 1)
        })
    
    return Response({
        'engagement_stats': engagement_stats,
        'enrollment_trend': list(enrollments_by_day),
        'lesson_completion': lesson_completion,
    })
