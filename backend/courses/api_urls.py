"""
API URLs for courses app
All endpoints are prefixed with /api/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'lessons', views.LessonViewSet, basename='lesson')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'progress', views.ProgressViewSet, basename='progress')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # Student endpoints
    path('student/dashboard/', views.StudentDashboardView.as_view(), name='student-dashboard'),
    
    # Instructor endpoints
    path('instructor/analytics/', views.InstructorAnalyticsView.as_view(), name='instructor-analytics'),
    path('instructor/activity/', views.InstructorActivityView.as_view(), name='instructor-activity'),
    path('instructor/students/', views.InstructorStudentsView.as_view(), name='instructor-students'),
]
