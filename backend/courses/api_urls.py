"""
API URLs for courses app
All endpoints are prefixed with /api/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'chapters', views.ChapterViewSet, basename='chapter')
router.register(r'lessons', views.LessonViewSet, basename='lesson')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'progress', views.ProgressViewSet, basename='progress')
router.register(r'categories', views.CategoryViewSet, basename='category')

urlpatterns = [
    # Coupon validation. Authenticated POST of a single known code against a
    # single course. The previous GET listing endpoints exposed every active
    # coupon to anonymous callers — see PRODUCTION_READINESS.md (P0-4).
    path('coupons/validate/', views.CouponValidateView.as_view(), name='coupon-validate'),

    # Course detail with progress
    path('courses/<int:course_id>/with-progress/', views.CourseDetailWithProgressView.as_view(), name='course-with-progress'),
    
    # Platform stats endpoint
    path('platform-stats/', views.PlatformStatsView.as_view(), name='platform-stats'),
    
    # Router endpoints
    path('', include(router.urls)),
    
    # Student endpoints
    path('student/dashboard/', views.StudentDashboardView.as_view(), name='student-dashboard'),
    
    # Instructor endpoints
    path('instructor/analytics/', views.InstructorAnalyticsView.as_view(), name='instructor-analytics'),
    path('instructor/activity/', views.InstructorActivityView.as_view(), name='instructor-activity'),
    path('instructor/students/', views.InstructorStudentsView.as_view(), name='instructor-students'),
]
