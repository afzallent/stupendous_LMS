from django.contrib.contenttypes.models import ContentType
from .models import ActivityLog


def log_activity(user, action_type, content_object=None, description='', metadata=None, request=None):
    """
    Utility function to log user activities.
    
    Args:
        user: User instance (can be None for anonymous)
        action_type: String matching ActivityLog.ACTION_TYPES
        content_object: Any Django model instance (optional)
        description: Human-readable description
        metadata: Dictionary of additional data
        request: HttpRequest object for session/IP info
    
    Returns:
        ActivityLog instance
    """
    activity_data = {
        'user': user,
        'action_type': action_type,
        'description': description,
        'metadata': metadata or {},
    }
    
    # Add content object if provided
    if content_object:
        activity_data['content_type'] = ContentType.objects.get_for_model(content_object)
        activity_data['object_id'] = content_object.pk
    
    # Add request info if provided
    if request:
        activity_data['session_key'] = request.session.session_key or ''
        activity_data['ip_address'] = get_client_ip(request)
        activity_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:500]
    
    return ActivityLog.objects.create(**activity_data)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_activity_stats(user, days=30):
    """
    Get activity statistics for a user over the last N days.
    
    Args:
        user: User instance
        days: Number of days to look back
    
    Returns:
        Dictionary with activity statistics
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Count, Sum
    
    start_date = timezone.now() - timedelta(days=days)
    
    # Get activity counts by type
    activities = ActivityLog.objects.filter(
        user=user,
        timestamp__gte=start_date
    ).values('action_type').annotate(count=Count('id'))
    
    activity_counts = {item['action_type']: item['count'] for item in activities}
    
    # Get lesson time tracking stats
    from .models import LessonTimeTracking
    lesson_stats = LessonTimeTracking.objects.filter(
        student=user,
        started_at__gte=start_date
    ).aggregate(
        total_time=Sum('time_spent'),
        completed_count=Count('id', filter=models.Q(completed=True))
    )
    
    # Get session stats
    from .models import SessionActivity
    session_stats = SessionActivity.objects.filter(
        user=user,
        started_at__gte=start_date
    ).aggregate(
        total_sessions=Count('id'),
        total_page_views=Sum('page_views')
    )
    
    return {
        'activity_counts': activity_counts,
        'total_activities': sum(activity_counts.values()),
        'lesson_time_spent': lesson_stats['total_time'] or 0,
        'lessons_completed': lesson_stats['completed_count'] or 0,
        'total_sessions': session_stats['total_sessions'] or 0,
        'total_page_views': session_stats['total_page_views'] or 0,
    }


def get_course_engagement_stats(course):
    """
    Get engagement statistics for a course.
    
    Args:
        course: Course instance
    
    Returns:
        Dictionary with engagement statistics
    """
    from django.db.models import Count, Avg, Sum
    from .models import LessonTimeTracking
    
    # Get all lessons for this course
    lesson_ids = course.lessons.values_list('id', flat=True)
    
    # Get time tracking stats
    stats = LessonTimeTracking.objects.filter(
        lesson_id__in=lesson_ids
    ).aggregate(
        total_students=Count('student', distinct=True),
        total_time=Sum('time_spent'),
        avg_time_per_lesson=Avg('time_spent'),
        completed_count=Count('id', filter=models.Q(completed=True))
    )
    
    # Get activity logs for this course
    from django.contrib.contenttypes.models import ContentType
    course_ct = ContentType.objects.get_for_model(course)
    
    course_activities = ActivityLog.objects.filter(
        content_type=course_ct,
        object_id=course.id
    ).values('action_type').annotate(count=Count('id'))
    
    activity_counts = {item['action_type']: item['count'] for item in course_activities}
    
    return {
        'unique_students': stats['total_students'] or 0,
        'total_time_spent': stats['total_time'] or 0,
        'avg_time_per_lesson': stats['avg_time_per_lesson'] or 0,
        'lessons_completed': stats['completed_count'] or 0,
        'activity_counts': activity_counts,
    }


# Import models for the stats functions
from django.db import models
