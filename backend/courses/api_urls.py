"""
API URLs for courses app
All endpoints are prefixed with /api/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .markdown_views import (
    MarkdownContentView,
    MarkdownCompleteView,
    MarkdownTrackScrollView,
)
from .h5p_views import (
    H5PUploadView,
    H5PEmbedView,
    H5PXAPIView,
    H5PStateView,
    H5PProgressView,
    H5PDeleteView,
)
from .html_embed_views import (
    HTMLEmbedContentView,
    HTMLEmbedXAPIView,
)

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'chapters', views.ChapterViewSet, basename='chapter')
router.register(r'lessons', views.LessonViewSet, basename='lesson')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'progress', views.ProgressViewSet, basename='progress')
router.register(r'categories', views.CategoryViewSet, basename='category')

urlpatterns = [
    # Coupon endpoints under courses namespace for frontend compatibility (must be before router)
    path('courses/coupons/', views.CouponListView.as_view(), name='course-coupons-list'),
    
    # Course detail with progress
    path('courses/<int:course_id>/with-progress/', views.CourseDetailWithProgressView.as_view(), name='course-with-progress'),
    
    # Markdown content endpoints (Requirements: 11.1, 11.2, 11.4, 11.5)
    path('lessons/<int:lesson_id>/markdown/', MarkdownContentView.as_view(), name='lesson-markdown'),
    path('lessons/<int:lesson_id>/markdown/complete/', MarkdownCompleteView.as_view(), name='lesson-markdown-complete'),
    path('lessons/<int:lesson_id>/markdown/track/', MarkdownTrackScrollView.as_view(), name='lesson-markdown-track'),
    
    # H5P content endpoints (Requirements: 12.1, 12.2, 12.4, 12.5)
    path('h5p/upload/', H5PUploadView.as_view(), name='h5p-upload'),
    path('h5p/<int:h5p_id>/embed/', H5PEmbedView.as_view(), name='h5p-embed'),
    path('h5p/<int:h5p_id>/xapi/', H5PXAPIView.as_view(), name='h5p-xapi'),
    path('h5p/<int:h5p_id>/state/', H5PStateView.as_view(), name='h5p-state'),
    path('h5p/<int:h5p_id>/progress/', H5PProgressView.as_view(), name='h5p-progress'),
    path('h5p/<int:h5p_id>/', H5PDeleteView.as_view(), name='h5p-delete'),
    
    # HTML Embed content endpoints (Requirements: 13.1, 13.4, 13.5)
    path('lessons/<int:lesson_id>/html-embed/', HTMLEmbedContentView.as_view(), name='lesson-html-embed'),
    path('lessons/<int:lesson_id>/html-embed/xapi/', HTMLEmbedXAPIView.as_view(), name='lesson-html-embed-xapi'),
    
    # Router endpoints
    path('', include(router.urls)),
    
    # Student endpoints
    path('student/dashboard/', views.StudentDashboardView.as_view(), name='student-dashboard'),
    
    # Instructor endpoints
    path('instructor/analytics/', views.InstructorAnalyticsView.as_view(), name='instructor-analytics'),
    path('instructor/activity/', views.InstructorActivityView.as_view(), name='instructor-activity'),
    path('instructor/students/', views.InstructorStudentsView.as_view(), name='instructor-students'),
]
