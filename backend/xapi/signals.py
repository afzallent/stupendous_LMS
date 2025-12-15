"""
Django signals for automatic xAPI statement generation

This module connects Django model signals to the xAPI statement generator,
automatically creating xAPI statements when learning activities occur.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .statement_generator import XAPIStatementGenerator


# Initialize the statement generator
generator = XAPIStatementGenerator()


@receiver(post_save, sender='courses.Progress')
def generate_lesson_completion_statement(sender, instance, created, **kwargs):
    """
    Generate xAPI statement when a student completes a lesson
    
    Triggered when Progress.completed is set to True.
    Validates: Requirements 4.1
    """
    # Only generate statement when lesson is marked as completed
    if instance.completed and instance.completed_at:
        # Check if a statement already exists for this completion
        # This prevents duplicate statements on subsequent saves
        from .models import XAPIStatement
        existing_statement = XAPIStatement.objects.filter(
            user=instance.student,
            lesson=instance.lesson,
            verb_id="http://adlnet.gov/expapi/verbs/completed"
        ).exists()
        
        if not existing_statement:
            try:
                # Calculate duration if we have the data
                duration = None
                if instance.completed_at:
                    # Try to estimate duration based on completion time
                    # This is a simple estimation - in production you'd track actual time spent
                    # For now, we'll leave duration as None and let it be calculated elsewhere
                    pass
                
                # Generate the xAPI statement
                generator.generate_lesson_completed(
                    student=instance.student,
                    lesson=instance.lesson,
                    duration=duration
                )
            except Exception as e:
                # Log the error but don't prevent the save operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(
                    f"Failed to generate xAPI statement for lesson completion: "
                    f"student={instance.student.id}, lesson={instance.lesson.id}, error={str(e)}"
                )


@receiver(post_save, sender='quizzes.QuizAttempt')
def generate_quiz_result_statement(sender, instance, created, **kwargs):
    """
    Generate xAPI statement when a student completes a quiz
    
    Generates either a 'passed' or 'failed' statement based on the quiz result.
    Validates: Requirements 4.2, 4.3
    """
    # Only generate statement when the attempt is completed
    if instance.completed_at:
        # Check if this is a new completion or an update that just completed
        # Avoid duplicate statements on subsequent saves
        if created or kwargs.get('update_fields') is None or 'completed_at' in kwargs.get('update_fields', []):
            try:
                # Calculate duration in ISO 8601 format if we have time_taken
                duration = None
                if instance.time_taken:
                    # Convert seconds to ISO 8601 duration format (PT#S)
                    duration = f"PT{instance.time_taken}S"
                
                # Get score values
                score = float(instance.score) if instance.score else 0.0
                max_score = float(instance.max_score) if instance.max_score else 0.0
                
                # Generate appropriate statement based on pass/fail
                if instance.passed:
                    generator.generate_quiz_passed(
                        student=instance.student,
                        quiz=instance.quiz,
                        score=score,
                        max_score=max_score,
                        duration=duration
                    )
                else:
                    generator.generate_quiz_failed(
                        student=instance.student,
                        quiz=instance.quiz,
                        score=score,
                        max_score=max_score,
                        duration=duration
                    )
            except Exception as e:
                # Log the error but don't prevent the save operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(
                    f"Failed to generate xAPI statement for quiz attempt: "
                    f"student={instance.student.id}, quiz={instance.quiz.id}, error={str(e)}"
                )


@receiver(post_save, sender='courses.Enrollment')
def generate_course_registration_statement(sender, instance, created, **kwargs):
    """
    Generate xAPI statement when a student enrolls in a course
    
    Triggered when a new Enrollment is created.
    Validates: Requirements 4.4
    """
    # Only generate statement for new enrollments
    if created:
        try:
            # Generate the xAPI statement
            generator.generate_course_registered(
                student=instance.student,
                course=instance.course
            )
        except Exception as e:
            # Log the error but don't prevent the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                f"Failed to generate xAPI statement for course enrollment: "
                f"student={instance.student.id}, course={instance.course.id}, error={str(e)}"
            )
