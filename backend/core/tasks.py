"""
Background tasks for the core app.

These run inline when no CELERY_BROKER_URL is configured (eager mode), so
callers need not care whether a worker is deployed.
"""
import logging

from celery import shared_task
from django.core.mail import get_connection, send_mail

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    # Exponential backoff with jitter: a flapping SMTP host should not be
    # hammered, and simultaneous failures should not retry in lockstep.
    autoretry_for=(OSError,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
)
def send_password_reset_email(self, *, recipient, subject, message, from_email, connection_kwargs):
    """
    Send a password reset email.

    SMTP settings are passed in rather than read here so the task does not
    depend on database state at execution time — the connection details are
    resolved by the caller from SiteSettings.

    Note the deliberate lack of detail in log messages: this runs for a
    specific user's email address, which does not belong in aggregated logs.
    """
    connection = get_connection(**connection_kwargs)
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[recipient],
        connection=connection,
        fail_silently=False,
    )
    logger.info("Password reset email dispatched (attempt %s)", self.request.retries + 1)
