"""
API URLs for core app (authentication and user management)
All endpoints are prefixed with /api/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'user', views.UserProfileViewSet, basename='user')

urlpatterns = [
    # Router endpoints
    path('', include(router.urls)),
    
    # JWT token refresh
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Alias endpoints for frontend compatibility
    path('auth/me/', views.UserProfileViewSet.as_view({'get': 'me'}), name='auth-me'),
    path('auth/signup/', views.AuthViewSet.as_view({'post': 'register'}), name='auth-signup'),
]
