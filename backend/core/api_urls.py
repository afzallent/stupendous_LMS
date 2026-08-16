"""
API URLs for core app (authentication and user management)
All endpoints are prefixed with /api/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import trainer_views

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'user', views.UserProfileViewSet, basename='user')

urlpatterns = [
    # Health check endpoint
    path('health/', views.health_check, name='health-check'),

    # Public white-label branding (site name, tagline, logo)
    path('settings/branding/', views.branding, name='branding'),
    
    # Router endpoints
    path('', include(router.urls)),
    
    # JWT token refresh
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Alias endpoints for frontend compatibility
    path('auth/me/', views.UserProfileViewSet.as_view({'get': 'me'}), name='auth-me'),
    path('auth/signup/', views.AuthViewSet.as_view({'post': 'register'}), name='auth-signup'),
    
    # Trainer profile endpoints
    path('trainer/profile/', trainer_views.TrainerProfileViewSet.as_view({'get': 'profile'}), name='trainer-profile'),
    path('trainer/profile/update_profile/', trainer_views.TrainerProfileViewSet.as_view({'put': 'update_profile', 'patch': 'update_profile'}), name='trainer-profile-update'),
    path('trainer/profile/upload_avatar/', trainer_views.TrainerProfileViewSet.as_view({'post': 'upload_avatar'}), name='trainer-upload-avatar'),
    path('trainer/profile/delete_avatar/', trainer_views.TrainerProfileViewSet.as_view({'delete': 'delete_avatar'}), name='trainer-delete-avatar'),
    path('trainer/profile/change_password/', trainer_views.TrainerProfileViewSet.as_view({'post': 'change_password'}), name='trainer-change-password'),
    
    # Trainer student management endpoints
    path('trainer/students/', trainer_views.StudentManagementView.as_view(), name='trainer-students'),
    path('trainer/students/<int:student_id>/', trainer_views.StudentDetailView.as_view(), name='trainer-student-detail'),
    path('trainer/students/<int:student_id>/progress/', trainer_views.StudentProgressView.as_view(), name='trainer-student-progress'),
    path('trainer/students/<str:operation>/', trainer_views.BulkStudentOperationsView.as_view(), name='trainer-student-bulk-operations'),
]
