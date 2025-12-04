from django.urls import path
from . import api_views

app_name = 'activity_api'

urlpatterns = [
    # Course-level activity
    path('course/<int:course_id>/students', api_views.course_students_activity, name='course_students_activity'),
    path('course/<int:course_id>/analytics', api_views.course_analytics, name='course_analytics'),
    
    # Student-level activity
    path('course/<int:course_id>/students/<int:student_id>', api_views.student_detail_activity, name='student_detail_activity'),
]
