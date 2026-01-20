"""
Django signals for automatic notification creation.

This module defines signal handlers that create notifications in response to
various events in the LMS, such as:
- New discussion posts
- Course completions
- Quiz/assessment submissions

All signal handlers respect user notification preferences before creating notifications.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .utils import create_notification, check_course_completion


@receiver(post_save, sender='discussions.DiscussionThread')
def notify_discussion_post(sender, instance, created, **kwargs):
    """
    Create a notification for the course trainer when a student posts a discussion.

    Signal triggered when a new DiscussionThread is created.
    Only creates notification if:
    - The thread is newly created (not just updated)
    - The thread is not deleted
    - The course trainer has discussion_notifications enabled

    Args:
        sender: The DiscussionThread model
        instance: The DiscussionThread instance that was saved
        created: Boolean indicating if this is a new instance
    """
    # Only notify for new, non-deleted threads
    if created and not instance.is_deleted:
        # Get the course instructor/trainer
        trainer = instance.course.instructor

        # Don't notify if the poster is the trainer themselves
        if instance.author == trainer:
            return

        # Create notification (will check preferences internally)
        create_notification(
            recipient=trainer,
            notification_type='discussion_post',
            title=f'New Discussion Post in {instance.course.title}',
            message=f'{instance.author.get_full_name() or instance.author.username} posted: "{instance.title}"',
            related_course=instance.course,
            related_user=instance.author,
            link=f'/discussions/{instance.id}/'
        )


@receiver(post_save, sender='courses.Progress')
def notify_course_completion(sender, instance, created, **kwargs):
    """
    Create a notification for the course trainer when a student completes the course.

    Signal triggered when a Progress record is updated.
    Only creates notification if:
    - The progress is marked as completed
    - All lessons in the course are now completed
    - The course trainer has progress_notifications enabled

    Args:
        sender: The Progress model
        instance: The Progress instance that was saved
        created: Boolean indicating if this is a new instance
    """
    # Only check when progress is marked as completed
    if instance.completed:
        from courses.models import Enrollment

        # Get the enrollment for this student and course
        try:
            enrollment = Enrollment.objects.get(
                student=instance.student,
                course=instance.lesson.course
            )
        except Enrollment.DoesNotExist:
            return

        # Check if this completion means the entire course is complete
        if check_course_completion(enrollment):
            trainer = instance.lesson.course.instructor

            # Don't notify if the student completing is the trainer
            if instance.student == trainer:
                return

            # Check if we already notified for this completion
            # (to avoid duplicate notifications when multiple lessons complete at once)
            from .models import Notification
            existing_notification = Notification.objects.filter(
                recipient=trainer,
                notification_type='course_completion',
                related_course=instance.lesson.course,
                related_user=instance.student
            ).exists()

            if existing_notification:
                return

            # Create notification (will check preferences internally)
            create_notification(
                recipient=trainer,
                notification_type='course_completion',
                title=f'Course Completed: {instance.lesson.course.title}',
                message=f'{instance.student.get_full_name() or instance.student.username} has completed all lessons in the course!',
                related_course=instance.lesson.course,
                related_user=instance.student,
                link=f'/courses/{instance.lesson.course.id}/'
            )


@receiver(post_save, sender='quizzes.QuizAttempt')
def notify_quiz_submission(sender, instance, created, **kwargs):
    """
    Create a notification for the course trainer when a student submits a quiz.

    Signal triggered when a QuizAttempt is saved.
    Only creates notification if:
    - The attempt is completed (has completed_at timestamp)
    - The quiz is associated with a course
    - The course trainer has assessment_notifications enabled

    Args:
        sender: The QuizAttempt model
        instance: The QuizAttempt instance that was saved
        created: Boolean indicating if this is a new instance
    """
    # Only notify when the attempt is completed (not just started)
    if instance.completed_at:
        # Get the associated course (if any)
        if hasattr(instance.quiz, 'lesson') and instance.quiz.lesson:
            course = instance.quiz.lesson.course
            trainer = course.instructor

            # Don't notify if the student submitting is the trainer
            if instance.student == trainer:
                return

            # Create notification (will check preferences internally)
            create_notification(
                recipient=trainer,
                notification_type='assessment_submission',
                title=f'Quiz Submitted: {instance.quiz.title}',
                message=f'{instance.student.get_full_name() or instance.student.username} submitted {instance.quiz.title} (Score: {instance.percentage:.1f}%)',
                related_course=course,
                related_user=instance.student,
                link=f'/quizzes/{instance.quiz.id}/results/{instance.student.id}/'
            )
