from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SessionActivity
from .utils import log_activity


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log user login activity"""
    log_activity(
        user=user,
        action_type='login',
        description=f"{user.username} logged in",
        request=request
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout activity and end session"""
    if user:
        log_activity(
            user=user,
            action_type='logout',
            description=f"{user.username} logged out",
            request=request
        )
        
        # End the session activity
        session_key = request.session.session_key
        if session_key:
            from django.utils import timezone
            SessionActivity.objects.filter(
                session_key=session_key,
                ended_at__isnull=True
            ).update(ended_at=timezone.now())


@receiver(post_save, sender='courses.Enrollment')
def log_course_enrollment(sender, instance, created, **kwargs):
    """Log when a student enrolls in a course"""
    if created:
        log_activity(
            user=instance.student,
            action_type='course_enroll',
            content_object=instance.course,
            description=f"{instance.student.username} enrolled in {instance.course.title}"
        )


@receiver(post_save, sender='courses.Progress')
def log_lesson_completion(sender, instance, created, **kwargs):
    """Log when a student completes a lesson"""
    if instance.completed:
        # Check if this is a new completion (not an update)
        if created or instance.completed_at:
            log_activity(
                user=instance.student,
                action_type='lesson_complete',
                content_object=instance.lesson,
                description=f"{instance.student.username} completed {instance.lesson.title}"
            )
