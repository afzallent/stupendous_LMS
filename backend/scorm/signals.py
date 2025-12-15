"""
Django signals for SCORM data synchronization.

These signals automatically update Progress models and generate xAPI statements
when SCORM CMI data is updated.

Requirements: 2.3, 2.4, 8.1
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from scorm.models import ScormData
from scorm.sync_manager import DataSyncManager
from xapi.statement_generator import XAPIStatementGenerator
from xapi.statement_store import XAPIStatementStore

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ScormData)
def sync_scorm_completion(sender, instance, created, **kwargs):
    """
    Signal handler to sync SCORM completion to Progress model.
    
    When SCORM content reports completion (lesson_status = 'completed' or 'passed'),
    this signal updates the corresponding Progress record and generates an xAPI statement.
    
    Validates: Requirements 2.3, 8.1
    """
    # Only process if lesson_status indicates completion
    completed_statuses = ['completed', 'passed']
    if instance.lesson_status not in completed_statuses:
        return
    
    try:
        # Sync to Progress model
        sync_manager = DataSyncManager()
        progress = sync_manager.sync_scorm_to_progress(instance)
        
        if progress:
            logger.info(
                f"SCORM completion synced to Progress: "
                f"student={instance.student.username}, "
                f"sco={instance.sco.title}"
            )
            
            # Generate xAPI statement for SCORM completion
            lesson = instance.sco.package.lesson
            if lesson:
                try:
                    generator = XAPIStatementGenerator()
                    statement = generator.generate_lesson_completed(
                        student=instance.student,
                        lesson=lesson
                    )
                    
                    logger.info(
                        f"Generated xAPI statement for SCORM completion: "
                        f"statement_id={statement.statement_id}"
                    )
                    
                except Exception as e:
                    logger.error(
                        f"Failed to generate xAPI statement for SCORM completion: {e}",
                        exc_info=True
                    )
        
    except Exception as e:
        logger.error(
            f"Failed to sync SCORM completion: {e}",
            exc_info=True,
            extra={
                'student_id': instance.student.id,
                'sco_id': instance.sco.id,
            }
        )


@receiver(post_save, sender=ScormData)
def sync_scorm_score(sender, instance, created, **kwargs):
    """
    Signal handler to sync SCORM score data.
    
    When SCORM content reports a score, this signal generates an xAPI statement
    with the score information.
    
    Validates: Requirements 2.4, 8.1
    """
    # Only process if score is present
    if instance.score_raw is None:
        return
    
    try:
        lesson = instance.sco.package.lesson
        if not lesson:
            return
        
        # Generate xAPI statement with score
        generator = XAPIStatementGenerator()
        
        # Determine verb based on lesson_status
        if instance.lesson_status == 'passed':
            verb_id = generator.VERB_PASSED
            verb_display = 'passed'
        elif instance.lesson_status == 'failed':
            verb_id = generator.VERB_FAILED
            verb_display = 'failed'
        else:
            # For other statuses, use completed verb with score
            verb_id = generator.VERB_COMPLETED
            verb_display = 'completed'
        
        # Build statement components
        actor = generator._create_actor(instance.student)
        verb = generator._create_verb(verb_id, verb_display)
        
        activity_id = f"{generator.base_url}/courses/{lesson.course.id}/lessons/{lesson.id}"
        activity = generator._create_activity(
            activity_id=activity_id,
            name=lesson.title,
            activity_type=generator.ACTIVITY_TYPE_LESSON,
            description=lesson.content[:200] if lesson.content else None
        )
        
        # Calculate scaled score
        scaled_score = None
        if instance.score_max and float(instance.score_max) > 0:
            scaled_score = float(instance.score_raw) / float(instance.score_max)
        
        result = generator._create_result(
            score={
                'raw': float(instance.score_raw),
                'min': float(instance.score_min) if instance.score_min else 0,
                'max': float(instance.score_max) if instance.score_max else 100,
                'scaled': scaled_score
            },
            success=instance.lesson_status == 'passed',
            completion=instance.lesson_status in ['completed', 'passed']
        )
        
        # Add context with course information
        context = {
            "contextActivities": {
                "parent": [{
                    "objectType": "Activity",
                    "id": f"{generator.base_url}/courses/{lesson.course.id}",
                    "definition": {
                        "name": {
                            "en-US": lesson.course.title
                        },
                        "type": generator.ACTIVITY_TYPE_COURSE
                    }
                }]
            }
        }
        
        # Save the statement
        statement = generator._save_statement(actor, verb, activity, result, context)
        
        # Link to existing models
        statement.user = instance.student
        statement.course = lesson.course
        statement.lesson = lesson
        statement.save()
        
        logger.info(
            f"Generated xAPI statement for SCORM score: "
            f"student={instance.student.username}, "
            f"score={instance.score_raw}, "
            f"statement_id={statement.statement_id}"
        )
        
    except Exception as e:
        logger.error(
            f"Failed to sync SCORM score: {e}",
            exc_info=True,
            extra={
                'student_id': instance.student.id,
                'sco_id': instance.sco.id,
            }
        )
