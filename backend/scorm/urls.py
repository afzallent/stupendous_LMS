from django.urls import path
from scorm.views import (
    ScormUploadView,
    ScormPackageListView,
    ScormPackageDetailView,
    ScormInitializeView,
    ScormGetValueView,
    ScormSetValueView,
    ScormCommitView,
    ScormTerminateView,
)

app_name = 'scorm'

urlpatterns = [
    # SCORM package upload
    path('upload/', ScormUploadView.as_view(), name='upload'),
    
    # SCORM package management
    path('packages/', ScormPackageListView.as_view(), name='package-list'),
    path('packages/<int:package_id>/', ScormPackageDetailView.as_view(), name='package-detail'),
    
    # SCORM runtime API endpoints
    path('runtime/initialize/', ScormInitializeView.as_view(), name='runtime-initialize'),
    path('runtime/get-value/', ScormGetValueView.as_view(), name='runtime-get-value'),
    path('runtime/set-value/', ScormSetValueView.as_view(), name='runtime-set-value'),
    path('runtime/commit/', ScormCommitView.as_view(), name='runtime-commit'),
    path('runtime/terminate/', ScormTerminateView.as_view(), name='runtime-terminate'),
]
