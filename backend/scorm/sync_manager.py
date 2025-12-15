"""
Data Synchronization Manager for SCORM/xAPI integration.

This module provides the DataSyncManager class that keeps SCORM CMI data,
xAPI statements, and existing Progress/QuizAttempt models synchronized.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
"""

import logging
from decimal import Decimal
from typing import Optional, List, Dict, Any
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist

from courses.models import Progress, Lesson
from quizzes.models import QuizAttempt
from scorm.models import ScormData, ScormSCO
from xapi.models import XAPIStatement

logger = logging.getLogger(__name__)


class SyncError(Exception):
    """Exception raised when synchronization fails"""
    pass


class DataSyncManager:
    """
    Synchronize tracking data across SCORM, xAPI, and existing models.
    
    This class ensures that progress tracking remains consistent across
    all tracking mechanisms in the system.
    """
    
    def sync_scorm_to_progress(self, scorm_data: ScormData) -> Optional[Progress]:
        """
        Update Progress model from SCORM CMI data.
        
        When SCORM content reports completion or progress, this method
        updates the corresponding Progress record to maintain consistency.
        
        Args:
            scorm_data: ScormData instance with updated CMI values
            
        Returns:
            Updated Progress instance, or None if sync failed
            
        Validates: Requirements 8.1
        """
        try:
            # Get the lesson associated with this SCORM package
            lesson = scorm_data.sco.package.lesson
            if not lesson:
                logger.warning(
                    f"SCORM package {scorm_data.sco.package.id} has no associated lesson"
                )
                return None
            
            # Get or create Progress record
            progress, created = Progress.objects.get_or_create(
                student=scorm_data.student,
                lesson=lesson,
                defaults={'completed': False}
            )
            
            # Determine if lesson should be marked as completed
            # Based on SCORM lesson_status
            completed_statuses = ['completed', 'passed']
            should_be_completed = scorm_data.lesson_status in completed_statuses
            
            # Update progress if status changed
            if should_be_completed and not progress.completed:
                progress.completed = True
                progress.completed_at = timezone.now()
                progress.save()
                
                logger.info(
                    f"Synced SCORM completion to Progress: "
                    f"student={scorm_data.student.username}, "
                    f"lesson={lesson.title}"
                )
            
            return progress
            
        except Exception as e:
            logger.error(
                f"Failed to sync SCORM to Progress: {e}",
                exc_info=True,
                extra={
                    'student_id': scorm_data.student.id,
                    'sco_id': scorm_data.sco.id,
                }
            )
            return None
    
    def sync_xapi_to_progress(self, statement: XAPIStatement) -> Optional[Progress]:
        """
        Update Progress model from xAPI statement.
        
        When an xAPI statement indicates lesson completion, this method
        updates the corresponding Progress record.
        
        Args:
            statement: XAPIStatement instance indicating lesson completion
            
        Returns:
            Updated Progress instance, or None if not applicable or failed
            
        Validates: Requirements 8.2
        """
        try:
            # Only process completion statements
            completed_verb = 'http://adlnet.gov/expapi/verbs/completed'
            if statement.verb_id != completed_verb:
                return None
            
            # Check if statement has lesson relation
            if not statement.lesson or not statement.user:
                logger.debug(
                    f"xAPI statement {statement.statement_id} has no lesson/user relation"
                )
                return None
            
            # Get or create Progress record
            progress, created = Progress.objects.get_or_create(
                student=statement.user,
                lesson=statement.lesson,
                defaults={'completed': False}
            )
            
            # Update progress if not already completed
            if not progress.completed:
                progress.completed = True
                # Use statement timestamp if available, otherwise use now
                progress.completed_at = statement.timestamp or timezone.now()
                progress.save()
                
                logger.info(
                    f"Synced xAPI statement to Progress: "
                    f"student={statement.user.username}, "
                    f"lesson={statement.lesson.title}"
                )
            
            return progress
            
        except Exception as e:
            logger.error(
                f"Failed to sync xAPI to Progress: {e}",
                exc_info=True,
                extra={
                    'statement_id': str(statement.statement_id),
                }
            )
            return None
    
    def sync_xapi_to_quiz_attempt(self, statement: XAPIStatement) -> Optional[QuizAttempt]:
        """
        Update QuizAttempt model from xAPI statement.
        
        When an xAPI statement indicates quiz completion (passed or failed),
        this method updates the corresponding QuizAttempt record with score
        and completion status.
        
        Args:
            statement: XAPIStatement instance indicating quiz completion
            
        Returns:
            Updated QuizAttempt instance, or None if not applicable or failed
            
        Validates: Requirements 8.3
        """
        try:
            # Only process quiz-related verbs
            quiz_verbs = [
                'http://adlnet.gov/expapi/verbs/passed',
                'http://adlnet.gov/expapi/verbs/failed',
            ]
            if statement.verb_id not in quiz_verbs:
                return None
            
            # Check if statement has quiz relation
            if not statement.quiz or not statement.user:
                logger.debug(
                    f"xAPI statement {statement.statement_id} has no quiz/user relation"
                )
                return None
            
            # Find the most recent incomplete quiz attempt for this user and quiz
            quiz_attempt = QuizAttempt.objects.filter(
                student=statement.user,
                quiz=statement.quiz,
                completed_at__isnull=True
            ).order_by('-started_at').first()
            
            if not quiz_attempt:
                logger.warning(
                    f"No incomplete quiz attempt found for xAPI statement {statement.statement_id}"
                )
                return None
            
            # Update quiz attempt with data from xAPI statement
            if statement.result_score_raw is not None:
                quiz_attempt.score = statement.result_score_raw
            
            if statement.result_score_max is not None:
                quiz_attempt.max_score = int(statement.result_score_max)
            
            # Calculate percentage if we have both score and max_score
            if quiz_attempt.score is not None and quiz_attempt.max_score > 0:
                quiz_attempt.percentage = (
                    Decimal(quiz_attempt.score) / Decimal(quiz_attempt.max_score) * 100
                )
            
            # Set passed status based on verb or result_success
            if statement.verb_id == 'http://adlnet.gov/expapi/verbs/passed':
                quiz_attempt.passed = True
            elif statement.verb_id == 'http://adlnet.gov/expapi/verbs/failed':
                quiz_attempt.passed = False
            elif statement.result_success is not None:
                quiz_attempt.passed = statement.result_success
            
            # Mark as completed
            if not quiz_attempt.completed_at:
                quiz_attempt.completed_at = statement.timestamp or timezone.now()
            
            quiz_attempt.save()
            
            logger.info(
                f"Synced xAPI statement to QuizAttempt: "
                f"student={statement.user.username}, "
                f"quiz={statement.quiz.title}, "
                f"score={quiz_attempt.score}/{quiz_attempt.max_score}"
            )
            
            return quiz_attempt
            
        except Exception as e:
            logger.error(
                f"Failed to sync xAPI to QuizAttempt: {e}",
                exc_info=True,
                extra={
                    'statement_id': str(statement.statement_id),
                }
            )
            return None
    
    def sync_content_interaction_to_progress(
        self,
        student,
        lesson: Lesson,
        interaction_data: Dict[str, Any]
    ) -> Optional[Progress]:
        """
        Update Progress from content interaction data.
        
        This method handles progress updates from various content types
        (Markdown, H5P, HTML embeds, etc.) based on interaction data.
        
        Args:
            student: User instance (student)
            lesson: Lesson instance
            interaction_data: Dictionary containing interaction details
            
        Returns:
            Updated Progress instance, or None if failed
        """
        try:
            # Get or create Progress record
            progress, created = Progress.objects.get_or_create(
                student=student,
                lesson=lesson,
                defaults={'completed': False}
            )
            
            # Check if interaction indicates completion
            is_completed = interaction_data.get('completed', False)
            
            if is_completed and not progress.completed:
                progress.completed = True
                progress.completed_at = timezone.now()
                progress.save()
                
                logger.info(
                    f"Synced content interaction to Progress: "
                    f"student={student.username}, "
                    f"lesson={lesson.title}"
                )
            
            return progress
            
        except Exception as e:
            logger.error(
                f"Failed to sync content interaction to Progress: {e}",
                exc_info=True,
                extra={
                    'student_id': student.id,
                    'lesson_id': lesson.id,
                }
            )
            return None
    
    def reconcile_discrepancies(self) -> List[Dict[str, Any]]:
        """
        Find and attempt to fix synchronization discrepancies.
        
        This method scans for inconsistencies between tracking systems
        and attempts to reconcile them. It returns a list of issues found.
        
        Returns:
            List of dictionaries describing issues found and actions taken
            
        Validates: Requirements 8.4, 8.5
        """
        issues = []
        
        try:
            # Find SCORM data marked as completed but Progress not completed
            completed_scorm = ScormData.objects.filter(
                lesson_status__in=['completed', 'passed']
            ).select_related('sco__package__lesson', 'student')
            
            for scorm_data in completed_scorm:
                if not scorm_data.sco.package.lesson:
                    continue
                
                try:
                    progress = Progress.objects.get(
                        student=scorm_data.student,
                        lesson=scorm_data.sco.package.lesson
                    )
                    
                    if not progress.completed:
                        # Discrepancy found - SCORM says completed but Progress doesn't
                        issue = {
                            'type': 'scorm_progress_mismatch',
                            'student_id': scorm_data.student.id,
                            'lesson_id': scorm_data.sco.package.lesson.id,
                            'scorm_status': scorm_data.lesson_status,
                            'progress_completed': False,
                            'action': 'attempted_fix',
                            'timestamp': timezone.now().isoformat()
                        }
                        
                        # Attempt to fix
                        result = self.sync_scorm_to_progress(scorm_data)
                        if result:
                            issue['fixed'] = True
                            logger.info(f"Fixed SCORM/Progress discrepancy: {issue}")
                        else:
                            issue['fixed'] = False
                            logger.error(f"Failed to fix SCORM/Progress discrepancy: {issue}")
                        
                        issues.append(issue)
                        
                except Progress.DoesNotExist:
                    # Progress record doesn't exist - create it
                    issue = {
                        'type': 'missing_progress',
                        'student_id': scorm_data.student.id,
                        'lesson_id': scorm_data.sco.package.lesson.id,
                        'action': 'created_progress',
                        'timestamp': timezone.now().isoformat()
                    }
                    
                    result = self.sync_scorm_to_progress(scorm_data)
                    issue['fixed'] = result is not None
                    issues.append(issue)
            
            # Find xAPI completion statements without corresponding Progress
            completed_statements = XAPIStatement.objects.filter(
                verb_id='http://adlnet.gov/expapi/verbs/completed',
                lesson__isnull=False,
                user__isnull=False
            ).select_related('lesson', 'user')
            
            for statement in completed_statements:
                try:
                    progress = Progress.objects.get(
                        student=statement.user,
                        lesson=statement.lesson
                    )
                    
                    if not progress.completed:
                        # Discrepancy found
                        issue = {
                            'type': 'xapi_progress_mismatch',
                            'student_id': statement.user.id,
                            'lesson_id': statement.lesson.id,
                            'statement_id': str(statement.statement_id),
                            'progress_completed': False,
                            'action': 'attempted_fix',
                            'timestamp': timezone.now().isoformat()
                        }
                        
                        result = self.sync_xapi_to_progress(statement)
                        issue['fixed'] = result is not None
                        issues.append(issue)
                        
                except Progress.DoesNotExist:
                    # Progress record doesn't exist
                    issue = {
                        'type': 'missing_progress_from_xapi',
                        'student_id': statement.user.id,
                        'lesson_id': statement.lesson.id,
                        'statement_id': str(statement.statement_id),
                        'action': 'created_progress',
                        'timestamp': timezone.now().isoformat()
                    }
                    
                    result = self.sync_xapi_to_progress(statement)
                    issue['fixed'] = result is not None
                    issues.append(issue)
            
            logger.info(f"Reconciliation complete. Found {len(issues)} issues.")
            
        except Exception as e:
            logger.error(f"Error during reconciliation: {e}", exc_info=True)
            issues.append({
                'type': 'reconciliation_error',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            })
        
        return issues
    
    def calculate_course_progress_from_xapi(
        self,
        student,
        course
    ) -> Decimal:
        """
        Calculate course progress percentage from xAPI statements.
        
        This method calculates progress based on xAPI completion statements
        for comparison with the Progress model calculation.
        
        Args:
            student: User instance (student)
            course: Course instance
            
        Returns:
            Progress percentage as Decimal (0-100)
            
        Validates: Requirements 8.4
        """
        try:
            # Get all lessons in the course
            total_lessons = course.lessons.count()
            if total_lessons == 0:
                return Decimal('0.00')
            
            # Count completed lessons based on xAPI statements
            completed_lessons = XAPIStatement.objects.filter(
                user=student,
                lesson__course=course,
                verb_id='http://adlnet.gov/expapi/verbs/completed',
                voided=False
            ).values('lesson').distinct().count()
            
            # Calculate percentage
            percentage = (Decimal(completed_lessons) / Decimal(total_lessons)) * 100
            return percentage.quantize(Decimal('0.01'))
            
        except Exception as e:
            logger.error(
                f"Failed to calculate course progress from xAPI: {e}",
                exc_info=True
            )
            return Decimal('0.00')
    
    def calculate_course_progress_from_model(
        self,
        student,
        course
    ) -> Decimal:
        """
        Calculate course progress percentage from Progress model.
        
        Args:
            student: User instance (student)
            course: Course instance
            
        Returns:
            Progress percentage as Decimal (0-100)
        """
        try:
            # Get all lessons in the course
            total_lessons = course.lessons.count()
            if total_lessons == 0:
                return Decimal('0.00')
            
            # Count completed lessons based on Progress model
            completed_lessons = Progress.objects.filter(
                student=student,
                lesson__course=course,
                completed=True
            ).count()
            
            # Calculate percentage
            percentage = (Decimal(completed_lessons) / Decimal(total_lessons)) * 100
            return percentage.quantize(Decimal('0.01'))
            
        except Exception as e:
            logger.error(
                f"Failed to calculate course progress from model: {e}",
                exc_info=True
            )
            return Decimal('0.00')
    
    def verify_progress_consistency(
        self,
        student,
        course
    ) -> Dict[str, Any]:
        """
        Verify that progress calculations are consistent across systems.
        
        Args:
            student: User instance (student)
            course: Course instance
            
        Returns:
            Dictionary with consistency check results
            
        Validates: Requirements 8.4
        """
        xapi_progress = self.calculate_course_progress_from_xapi(student, course)
        model_progress = self.calculate_course_progress_from_model(student, course)
        
        # Allow for small rounding differences
        is_consistent = abs(xapi_progress - model_progress) < Decimal('0.01')
        
        result = {
            'student_id': student.id,
            'course_id': course.id,
            'xapi_progress': float(xapi_progress),
            'model_progress': float(model_progress),
            'is_consistent': is_consistent,
            'difference': float(abs(xapi_progress - model_progress)),
            'timestamp': timezone.now().isoformat()
        }
        
        if not is_consistent:
            logger.warning(
                f"Progress inconsistency detected: "
                f"student={student.username}, "
                f"course={course.title}, "
                f"xapi={xapi_progress}%, "
                f"model={model_progress}%"
            )
        
        return result
