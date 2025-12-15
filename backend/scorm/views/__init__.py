"""
SCORM views package.
"""

from .upload_views import (
    ScormUploadView,
    ScormPackageListView,
    ScormPackageDetailView,
)

from .runtime_views import (
    ScormInitializeView,
    ScormGetValueView,
    ScormSetValueView,
    ScormCommitView,
    ScormTerminateView,
)

__all__ = [
    'ScormUploadView',
    'ScormPackageListView',
    'ScormPackageDetailView',
    'ScormInitializeView',
    'ScormGetValueView',
    'ScormSetValueView',
    'ScormCommitView',
    'ScormTerminateView',
]
