from django.urls import path
from . import views

app_name = 'activity'

urlpatterns = [
    path('dashboard/', views.user_activity_dashboard, name='user_dashboard'),
    path('analytics/', views.instructor_analytics, name='instructor_analytics'),
]
