"""
xAPI Analytics API Views
Provides REST API endpoints for analytics and reporting
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import datetime

from courses.models import Course
from core.models import User
from xapi.analytics import XAPIAnalytics
from xapi.models.statement import XAPIStatement


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_completion_rate(request, course_id):
    """
    GET /api/xapi/analytics/course/{id}/completion-rate/
    
    Get course completion statistics
    """
    course = get_object_or_404(Course, id=course_id)
    
    # Check permissions - instructors can view their courses, admins can view all
    if not request.user.is_staff and course.instructor != request.user:
        return Response(
            {'error': 'You do not have permission to view this course analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    analytics = XAPIAnalytics.get_course_analytics(course_id)
    
    return Response(analytics, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_quiz_scores(request, course_id):
    """
    GET /api/xapi/analytics/course/{id}/quiz-scores/
    
    Get quiz performance statistics for a course
    """
    course = get_object_or_404(Course, id=course_id)
    
    # Check permissions
    if not request.user.is_staff and course.instructor != request.user:
        return Response(
            {'error': 'You do not have permission to view this course analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    analytics = XAPIAnalytics.get_course_analytics(course_id)
    
    # Return quiz-specific data
    return Response({
        'course_id': course_id,
        'average_score': analytics.get('average_score', 0),
        'total_interactions': analytics.get('total_interactions', 0)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_activity_stream(request, user_id):
    """
    GET /api/xapi/analytics/student/{id}/activity-stream/
    
    Get student activity timeline
    """
    user = get_object_or_404(User, id=user_id)
    
    # Check permissions - students can view their own, instructors/admins can view all
    if not request.user.is_staff and request.user.id != user_id:
        return Response(
            {'error': 'You do not have permission to view this student activity'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get optional course filter
    course_id = request.query_params.get('course_id')
    if course_id:
        course_id = int(course_id)
    
    summary = XAPIAnalytics.get_learner_summary(user_id, course_id)
    
    return Response(summary, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_time_spent(request, course_id):
    """
    GET /api/xapi/analytics/course/{id}/time-spent/
    
    Get time spent per lesson in a course
    """
    course = get_object_or_404(Course, id=course_id)
    
    # Check permissions
    if not request.user.is_staff and course.instructor != request.user:
        return Response(
            {'error': 'You do not have permission to view this course analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get content performance for all lessons
    lessons = course.lessons.all()
    time_data = []
    
    for lesson in lessons:
        performance = XAPIAnalytics.get_content_performance(lesson.id)
        time_data.append({
            'lesson_id': lesson.id,
            'lesson_title': lesson.title,
            'total_statements': performance.get('total_statements', 0),
            'total_views': performance.get('total_views', 0),
            'total_completions': performance.get('total_completions', 0)
        })
    
    return Response({
        'course_id': course_id,
        'lessons': time_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_verb_distribution(request, course_id):
    """
    GET /api/xapi/analytics/course/{id}/verb-distribution/
    
    Get activity type breakdown for a course
    """
    course = get_object_or_404(Course, id=course_id)
    
    # Check permissions
    if not request.user.is_staff and course.instructor != request.user:
        return Response(
            {'error': 'You do not have permission to view this course analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get activity timeline which includes verb data
    days = int(request.query_params.get('days', 30))
    timeline = XAPIAnalytics.get_activity_timeline(course_id=course_id, days=days)
    
    return Response({
        'course_id': course_id,
        'timeline': timeline,
        'days': days
    }, status=status.HTTP_200_OK)



class StatementPagination(PageNumberPagination):
    """Custom pagination for statement export"""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_statements(request):
    """
    GET /api/xapi/export/
    
    Export xAPI statements as JSON with filtering and pagination
    
    Query parameters:
    - course_id: Filter by course
    - student_id: Filter by student
    - verb: Filter by verb ID
    - since: Filter by date (ISO format)
    - until: Filter by date (ISO format)
    - page: Page number
    - page_size: Results per page (max 1000)
    """
    # Build filters
    filters = Q()
    
    # Course filter
    course_id = request.query_params.get('course_id')
    if course_id:
        filters &= Q(context__contains={'course_id': int(course_id)})
    
    # Student filter
    student_id = request.query_params.get('student_id')
    if student_id:
        filters &= Q(actor_id=int(student_id))
    
    # Verb filter
    verb = request.query_params.get('verb')
    if verb:
        filters &= Q(verb_id=verb)
    
    # Date range filters
    since = request.query_params.get('since')
    if since:
        try:
            since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
            filters &= Q(timestamp__gte=since_date)
        except ValueError:
            return Response(
                {'error': 'Invalid since date format. Use ISO format.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    until = request.query_params.get('until')
    if until:
        try:
            until_date = datetime.fromisoformat(until.replace('Z', '+00:00'))
            filters &= Q(timestamp__lte=until_date)
        except ValueError:
            return Response(
                {'error': 'Invalid until date format. Use ISO format.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Permission check - students can only export their own data
    if not request.user.is_staff and not request.user.is_instructor:
        filters &= Q(actor_id=request.user.id)
    
    # Query statements
    statements = XAPIStatement.objects.filter(filters).order_by('-timestamp')
    
    # Apply pagination
    paginator = StatementPagination()
    paginated_statements = paginator.paginate_queryset(statements, request)
    
    # Serialize statements
    statement_data = []
    for stmt in paginated_statements:
        statement_data.append({
            'id': str(stmt.statement_id),
            'actor': stmt.actor,
            'verb': {
                'id': stmt.verb_id,
                'display': stmt.verb_display
            },
            'object': stmt.object,
            'result': stmt.result,
            'context': stmt.context,
            'timestamp': stmt.timestamp.isoformat(),
            'stored': stmt.stored.isoformat(),
            'authority': stmt.authority,
            'version': stmt.version
        })
    
    return paginator.get_paginated_response(statement_data)
