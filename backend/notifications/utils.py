"""
Utility functions for notification system.
"""
from .models import Notification


def create_notification(
    recipient,
    notification_type,
    title,
    message,
    related_course=None,
    related_user=None,
    link=None
):
    """
    Create a notification for a user after checking their notification preferences.

    This helper function checks if the recipient has enabled notifications for
    the specific notification type before creating the notification.

    Args:
        recipient: User instance who will receive the notification
        notification_type: Type of notification (discussion_post, assessment_submission, etc.)
        title: Notification title
        message: Notification message content
        related_course: Optional Course instance related to the notification
        related_user: Optional User instance related to the notification (e.g., student who posted)
        link: Optional URL link for the notification

    Returns:
        Notification instance if created, None if notifications are disabled for this type

    Example:
        >>> create_notification(
        ...     recipient=trainer,
        ...     notification_type='discussion_post',
        ...     title='New Discussion Post',
        ...     message='John Doe posted in Python Basics',
        ...     related_course=course,
        ...     related_user=student,
        ...     link=f'/discussions/{thread.id}/'
        ... )
    """
    # Get recipient's notification preferences
    preferences = recipient.notification_preferences or {}

    # Check if notifications are enabled for this type
    notification_enabled = False

    if notification_type == 'discussion_post':
        # Check discussion_notifications preference
        notification_enabled = preferences.get('discussion_notifications', True)
    elif notification_type == 'course_completion':
        # Check progress_notifications preference
        notification_enabled = preferences.get('progress_notifications', True)
    elif notification_type == 'assessment_submission':
        # Check assessment_notifications preference
        notification_enabled = preferences.get('assessment_notifications', True)
    else:
        # For other notification types, default to True
        notification_enabled = preferences.get('student_question', True)

    # If notifications are disabled for this type, return None
    if not notification_enabled:
        return None

    # Create the notification
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_course=related_course,
        related_user=related_user,
        link=link
    )

    return notification


def check_course_completion(enrollment):
    """
    Check if a student has completed all lessons in a course.

    This helper function determines if all lessons in a course have been
    completed by the student. Used by signals to trigger completion notifications.

    Args:
        enrollment: Enrollment instance

    Returns:
        bool: True if all lessons are completed, False otherwise
    """
    from courses.models import Progress

    course = enrollment.course
    student = enrollment.student

    # Get total lesson count
    total_lessons = course.lessons.count()

    if total_lessons == 0:
        return False

    # Count completed lessons
    completed_lessons = Progress.objects.filter(
        student=student,
        lesson__course=course,
        completed=True
    ).count()

    return completed_lessons == total_lessons
