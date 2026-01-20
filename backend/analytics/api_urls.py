"""
API URLs for analytics app.

All endpoints are prefixed with /api/analytics/
"""
from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Dashboard analytics (cached for 5 minutes)
    path('dashboard/', views.TrainerAnalyticsView.as_view(), name='trainer-dashboard'),

    # Course-specific statistics
    path('course/<int:course_id>/', views.CourseStatisticsView.as_view(), name='course-statistics'),
    path('course/<int:course_id>/lessons/', views.CourseLessonStatisticsView.as_view(), name='course-lesson-statistics'),
    path('course/<int:course_id>/assessments/', views.CourseAssessmentStatisticsView.as_view(), name='course-assessment-statistics'),

    # Trends and rates
    path('enrollment_trends/', views.EnrollmentTrendsView.as_view(), name='enrollment-trends'),
    path('completion_rates/', views.CompletionRatesView.as_view(), name='completion-rates'),

    # Engagement metrics
    path('engagement/', views.StudentEngagementView.as_view(), name='student-engagement'),
]
