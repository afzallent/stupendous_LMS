from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

app_name = 'activity_api'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'logs', api_views.ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Course-level activity
    path('course/<int:course_id>/students', api_views.course_students_activity, name='course_students_activity'),
    path('course/<int:course_id>/analytics', api_views.course_analytics, name='course_analytics'),
    
    # Student-level activity
    path('course/<int:course_id>/students/<int:student_id>', api_views.student_detail_activity, name='student_detail_activity'),
]
