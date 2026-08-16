from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
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


@receiver(post_save, sender='courses.Progress')
def sync_lesson_time_tracking_completion(sender, instance, created, **kwargs):
    """
    Mirror completion from Progress onto LessonTimeTracking.

    Both models carry `completed`/`completed_at` for the same
    (student, lesson) pair, and they were never kept in agreement.
    `courses.Progress` is written by the lesson-completion endpoint and is
    what most analytics read; `LessonTimeTracking.completed` had **no writer
    at all** outside tests — `mark_complete()` exists but is never called.
    Any report reading it therefore showed zero completions regardless of
    real student activity.

    `Progress` is the single source of truth. `LessonTimeTracking` owns time
    and engagement metrics only, and its completion flag is derived here so
    existing readers stop being wrong. Do not write it directly.
    See PRODUCTION_READINESS.md (P2 schema item).
    """
    from .models import LessonTimeTracking

    if not instance.completed:
        return

    completed_at = instance.completed_at or timezone.now()

    # Only create a tracking row if one already exists: this signal reflects
    # completion, it does not fabricate viewing time for a lesson the student
    # never opened in the player.
    updated = LessonTimeTracking.objects.filter(
        student=instance.student,
        lesson=instance.lesson,
        completed=False,
    ).update(completed=True, completed_at=completed_at)

    if not updated:
        # No player session recorded (e.g. marked complete from the course
        # outline). Create a zero-time row so completion reporting is
        # consistent across both models.
        LessonTimeTracking.objects.get_or_create(
            student=instance.student,
            lesson=instance.lesson,
            defaults={
                'completed': True,
                'completed_at': completed_at,
                'time_spent': 0,
            },
        )


@receiver(post_save, sender='quizzes.QuizAttempt')
def log_quiz_submission(sender, instance, created, **kwargs):
    """Log when a student submits a quiz"""
    # Only log when the attempt is completed (has a completed_at timestamp)
    if instance.completed_at:
        # Check if this is a new completion or an update that just completed
        if created or kwargs.get('update_fields') is None or 'completed_at' in kwargs.get('update_fields', []):
            log_activity(
                user=instance.student,
                action_type='quiz_submit',
                content_object=instance.quiz,
                description=f"{instance.student.username} submitted {instance.quiz.title} (Attempt #{instance.attempt_number})",
                metadata={
                    'attempt_number': instance.attempt_number,
                    'score': float(instance.score) if instance.score else 0,
                    'percentage': float(instance.percentage) if instance.percentage else 0,
                    'passed': instance.passed,
                    'time_taken': instance.time_taken
                }
            )


@receiver(post_save, sender='discussions.DiscussionThread')
def log_discussion_post(sender, instance, created, **kwargs):
    """Log when a user creates a discussion thread"""
    if created and not instance.is_deleted:
        log_activity(
            user=instance.author,
            action_type='discussion_post',
            content_object=instance,
            description=f"{instance.author.username} posted '{instance.title}' in {instance.course.title}",
            metadata={
                'course_id': instance.course.id,
                'course_title': instance.course.title,
                'thread_title': instance.title
            }
        )


@receiver(post_save, sender='discussions.DiscussionReply')
def log_discussion_reply(sender, instance, created, **kwargs):
    """Log when a user replies to a discussion thread"""
    if created and not instance.is_deleted:
        log_activity(
            user=instance.author,
            action_type='discussion_reply',
            content_object=instance.thread,
            description=f"{instance.author.username} replied to '{instance.thread.title}'",
            metadata={
                'thread_id': instance.thread.id,
                'thread_title': instance.thread.title,
                'course_id': instance.thread.course.id,
                'course_title': instance.thread.course.title
            }
        )
