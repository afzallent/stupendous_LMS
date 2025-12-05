from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from django.contrib.auth import views as auth_views

router = DefaultRouter()
router.register(r'auth', views.AuthViewSet, basename='auth')
router.register(r'user', views.UserProfileViewSet, basename='user')
router.register(r'users', views.UserManagementViewSet, basename='users')

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('register/', views.register, name='register'),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    
    # API endpoints
    path('api/', include(router.urls)),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
