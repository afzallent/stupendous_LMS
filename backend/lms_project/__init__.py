"""
Project package.

Importing the Celery app here ensures `@shared_task` is bound to it whenever
Django starts, whether that is the web process, a worker, or a management
command.
"""
from .celery import app as celery_app

__all__ = ('celery_app',)
