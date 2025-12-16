from django.urls import path
from xapi.views import (
    StatementsView,
    course_completion_rate,
    course_quiz_scores,
    student_activity_stream,
    course_time_spent,
    course_verb_distribution,
    export_statements
)
from xapi.views.privacy import export_student_data, delete_student_data

app_name = 'xapi'

urlpatterns = [
    # xAPI LRS endpoints (per xAPI specification)
    path('statements/', StatementsView.as_view(), name='statements'),
    
    # Analytics endpoints
    path('analytics/course/<int:course_id>/completion-rate/', 
         course_completion_rate, name='course_completion_rate'),
    path('analytics/course/<int:course_id>/quiz-scores/', 
         course_quiz_scores, name='course_quiz_scores'),
    path('analytics/student/<int:user_id>/activity-stream/', 
         student_activity_stream, name='student_activity_stream'),
    path('analytics/course/<int:course_id>/time-spent/', 
         course_time_spent, name='course_time_spent'),
    path('analytics/course/<int:course_id>/verb-distribution/', 
         course_verb_distribution, name='course_verb_distribution'),
    
    # Export endpoint
    path('export/', export_statements, name='export_statements'),
    
    # Privacy endpoints
    path('my-data/', export_student_data, name='export_student_data'),
    path('my-data/', delete_student_data, name='delete_student_data'),
]
