from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta
from .models import ActivityLog, DailyActivitySummary, LessonTimeTracking, SessionActivity
from .utils import get_user_activity_stats


@login_required
def user_activity_dashboard(request):
    """Display user's own activity dashboard"""
    user = request.user
    
    # Get stats for different time periods
    stats_7_days = get_user_activity_stats(user, days=7)
    stats_30_days = get_user_activity_stats(user, days=30)
    
    # Get recent activities
    recent_activities = ActivityLog.objects.filter(user=user)[:20]
    
    # Get daily summaries for the last 30 days
    daily_summaries = DailyActivitySummary.objects.filter(
        user=user,
        date__gte=timezone.now().date() - timedelta(days=30)
    ).order_by('-date')
    
    # Get lesson time tracking
    lesson_tracking = LessonTimeTracking.objects.filter(
        student=user
    ).select_related('lesson', 'lesson__course').order_by('-started_at')[:10]
    
    context = {
        'stats_7_days': stats_7_days,
        'stats_30_days': stats_30_days,
        'recent_activities': recent_activities,
        'daily_summaries': daily_summaries,
        'lesson_tracking': lesson_tracking,
    }
    
    return render(request, 'activity/user_dashboard.html', context)


@login_required
def instructor_analytics(request):
    """Analytics dashboard for instructors"""
    if not request.user.is_instructor:
        from django.http import HttpResponseForbidden
        return HttpResponseForbidden("Only instructors can access this page")
    
    from courses.models import Course
    
    # Get instructor's courses
    courses = Course.objects.filter(instructor=request.user)
    
    # Get engagement stats for each course
    course_stats = []
    for course in courses:
        from .utils import get_course_engagement_stats
        stats = get_course_engagement_stats(course)
        stats['course'] = course
        course_stats.append(stats)
    
    # Get overall stats
    total_students = ActivityLog.objects.filter(
        action_type='course_enroll',
        content_type__model='course',
        object_id__in=courses.values_list('id', flat=True)
    ).values('user').distinct().count()
    
    total_completions = ActivityLog.objects.filter(
        action_type='lesson_complete',
        user__enrollments__course__in=courses
    ).count()
    
    context = {
        'course_stats': course_stats,
        'total_students': total_students,
        'total_completions': total_completions,
    }
    
    return render(request, 'activity/instructor_analytics.html', context)
