from django.urls import path
from . import views

# NOTE: this module previously mounted a SECOND copy of the API router here
# (at /courses/api/...), duplicating every endpoint already served from
# courses/api_urls.py under /api/. Two mounts of the same viewsets meant any
# permission change had to be reasoned about twice. The duplicate router has
# been removed; the API lives only under /api/.

urlpatterns = [
    # Student URLs (Template views for backward compatibility)
    path('', views.course_list, name='course_list'),
    path('<int:course_id>/', views.course_detail, name='course_detail'),
    path('course/<int:course_id>/lesson/<int:lesson_id>/', views.lesson_detail, name='lesson_detail'),
    path('my-learning/', views.student_dashboard, name='student_dashboard'),

    # Instructor URLs (Template views)
    path('instructor/', views.instructor_dashboard, name='instructor_dashboard'),
    path('instructor/create/', views.create_course, name='create_course'),
    path('instructor/edit/<int:course_id>/', views.edit_course, name='edit_course'),
    path('instructor/course/<int:course_id>/lessons/', views.course_lessons, name='course_lessons'),
    path('instructor/course/<int:course_id>/lessons/add/', views.add_lesson, name='add_lesson'),
    path('instructor/course/<int:course_id>/monitor/', views.monitor_progress, name='monitor_progress'),
]
