"""
API URLs for certificates app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'certificates', views.CertificateViewSet, basename='certificate')

urlpatterns = [
    path('', include(router.urls)),
    path('certificates/auto-generate/', views.AutoGenerateCertificatesView.as_view(), name='auto-generate-certificates'),
]
