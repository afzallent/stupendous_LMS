"""
Celery application.

Deliberately optional. When `CELERY_BROKER_URL` is unset, settings.py turns on
eager mode, so `.delay()` runs the task inline and the application behaves
exactly as it did before Celery existed. That means:

  - local development and CI need no broker and no worker;
  - deploying the worker is a separate decision from deploying this code;
  - forgetting to run a worker degrades to the old synchronous behaviour
    rather than silently dropping mail on the floor.

To actually run tasks in the background, set CELERY_BROKER_URL and start a
worker alongside the web process:

    celery -A lms_project worker --loglevel=info
"""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')

app = Celery('lms_project')

# All Celery settings live in Django settings under a CELERY_ prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
