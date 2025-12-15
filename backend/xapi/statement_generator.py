"""
xAPI Statement Generator
Automatically generates xAPI statements for learning activities
"""
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from .models import XAPIStatement


class XAPIStatementGenerator:
    """
    Generate xAPI statements from learning events
    
    This class creates properly formatted xAPI statements for various
    learning activities including lesson completions, quiz attempts,
    course enrollments, and video interactions.
    """
    
    # Standard xAPI verb IRIs
    VERB_COMPLETED = "http://adlnet.gov/expapi/verbs/completed"
    VERB_PASSED = "http://adlnet.gov/expapi/verbs/passed"
    VERB_FAILED = "http://adlnet.gov/expapi/verbs/failed"
    VERB_REGISTERED = "http://adlnet.gov/expapi/verbs/registered"
    VERB_PLAYED = "http://adlnet.gov/expapi/verbs/played"
    VERB_PAUSED = "http://adlnet.gov/expapi/verbs/paused"
    VERB_SEEKED = "http://adlnet.gov/expapi/verbs/seeked"
    
    # Standard xAPI activity types
    ACTIVITY_TYPE_LESSON = "http://adlnet.gov/expapi/activities/lesson"
    ACTIVITY_TYPE_COURSE = "http://adlnet.gov/expapi/activities/course"
    ACTIVITY_TYPE_ASSESSMENT = "http://adlnet.gov/expapi/activities/assessment"
    ACTIVITY_TYPE_VIDEO = "http://adlnet.gov/expapi/activities/media"
    
    def __init__(self, base_url=None):
        """
        Initialize the statement generator
        
        Args:
            base_url: Base URL for activity IRIs (defaults to settings.BASE_URL or localhost)
        """
        self.base_url = base_url or getattr(settings, 'BASE_URL', 'http://localhost:8000')
        # Remove trailing slash if present
        self.base_url = self.base_url.rstrip('/')
    
    def _create_actor(self, student):
        """
        Create an actor object for a student
        
        Args:
            student: User model instance
            
        Returns:
            dict: Actor object in xAPI format
        """
        return {
            "objectType": "Agent",
            "name": student.get_full_name() or student.username,
            "mbox": f"mailto:{student.email}" if student.email else None,
            "account": {
                "name": str(student.id),
                "homePage": self.base_url
            }
        }
    
    def _create_verb(self, verb_id, display_text):
        """
        Create a verb object
        
        Args:
            verb_id: IRI for the verb
            display_text: Human-readable verb text
            
        Returns:
            dict: Verb object in xAPI format
        """
        return {
            "id": verb_id,
            "display": {
                "en-US": display_text
            }
        }
    
    def _create_activity(self, activity_id, name, activity_type, description=None):
        """
        Create an activity object
        
        Args:
            activity_id: IRI for the activity
            name: Human-readable name
            activity_type: IRI for the activity type
            description: Optional description
            
        Returns:
            dict: Activity object in xAPI format
        """
        activity = {
            "objectType": "Activity",
            "id": activity_id,
            "definition": {
                "name": {
                    "en-US": name
                },
                "type": activity_type
            }
        }
        
        if description:
            activity["definition"]["description"] = {
                "en-US": description
            }
        
        return activity
    
    def _create_result(self, score=None, success=None, completion=None, duration=None):
        """
        Create a result object
        
        Args:
            score: Dict with score information (raw, min, max, scaled)
            success: Boolean indicating success
            completion: Boolean indicating completion
            duration: ISO 8601 duration string
            
        Returns:
            dict: Result object in xAPI format, or None if no result data
        """
        result = {}
        
        if score is not None:
            result["score"] = {}
            if "raw" in score:
                result["score"]["raw"] = float(score["raw"])
            if "min" in score:
                result["score"]["min"] = float(score["min"])
            if "max" in score:
                result["score"]["max"] = float(score["max"])
            if "scaled" in score:
                result["score"]["scaled"] = float(score["scaled"])
        
        if success is not None:
            result["success"] = success
        
        if completion is not None:
            result["completion"] = completion
        
        if duration:
            result["duration"] = duration
        
        return result if result else None
    
    def _save_statement(self, actor, verb, obj, result=None, context=None, timestamp=None):
        """
        Save an xAPI statement to the database
        
        Args:
            actor: Actor object
            verb: Verb object
            obj: Object (activity) object
            result: Optional result object
            context: Optional context object
            timestamp: Optional timestamp (defaults to now)
            
        Returns:
            XAPIStatement: The saved statement instance
        """
        if timestamp is None:
            timestamp = timezone.now()
        
        # Build the complete statement JSON
        statement_json = {
            "actor": actor,
            "verb": verb,
            "object": obj
        }
        
        if result:
            statement_json["result"] = result
        
        if context:
            statement_json["context"] = context
        
        statement_json["timestamp"] = timestamp.isoformat()
        
        # Extract fields for database columns
        statement_data = {
            "actor_type": actor.get("objectType", "Agent"),
            "actor_name": actor.get("name", ""),
            "actor_mbox": actor.get("mbox", "").replace("mailto:", "") if actor.get("mbox") else None,
            "actor_account_name": actor.get("account", {}).get("name") if actor.get("account") else None,
            "actor_account_homepage": actor.get("account", {}).get("homePage") if actor.get("account") else None,
            "actor_json": actor,
            "verb_id": verb["id"],
            "verb_display": verb["display"],
            "object_type": obj.get("objectType", "Activity"),
            "object_id": obj["id"],
            "object_json": obj,
            "timestamp": timestamp,
            "statement_json": statement_json,
            "context_json": context
        }
        
        # Add result fields if present
        if result:
            statement_data["result_json"] = result
            if "score" in result:
                score = result["score"]
                statement_data["result_score_raw"] = Decimal(str(score.get("raw"))) if "raw" in score else None
                statement_data["result_score_min"] = Decimal(str(score.get("min"))) if "min" in score else None
                statement_data["result_score_max"] = Decimal(str(score.get("max"))) if "max" in score else None
                statement_data["result_score_scaled"] = Decimal(str(score.get("scaled"))) if "scaled" in score else None
            if "success" in result:
                statement_data["result_success"] = result["success"]
            if "completion" in result:
                statement_data["result_completion"] = result["completion"]
            if "duration" in result:
                statement_data["result_duration"] = result["duration"]
        
        # Create and save the statement
        statement = XAPIStatement(**statement_data)
        statement.save()
        
        return statement
    
    def generate_lesson_completed(self, student, lesson, duration=None):
        """
        Generate xAPI statement for lesson completion
        
        Args:
            student: User model instance
            lesson: Lesson model instance
            duration: Optional ISO 8601 duration string
            
        Returns:
            XAPIStatement: The generated statement
        """
        actor = self._create_actor(student)
        verb = self._create_verb(self.VERB_COMPLETED, "completed")
        
        activity_id = f"{self.base_url}/courses/{lesson.course.id}/lessons/{lesson.id}"
        activity = self._create_activity(
            activity_id=activity_id,
            name=lesson.title,
            activity_type=self.ACTIVITY_TYPE_LESSON,
            description=lesson.content[:200] if lesson.content else None
        )
        
        result = self._create_result(
            completion=True,
            duration=duration
        )
        
        # Add context with course information
        context = {
            "contextActivities": {
                "parent": [{
                    "objectType": "Activity",
                    "id": f"{self.base_url}/courses/{lesson.course.id}",
                    "definition": {
                        "name": {
                            "en-US": lesson.course.title
                        },
                        "type": self.ACTIVITY_TYPE_COURSE
                    }
                }]
            }
        }
        
        statement = self._save_statement(actor, verb, activity, result, context)
        
        # Link to existing models for synchronization
        statement.user = student
        statement.course = lesson.course
        statement.lesson = lesson
        statement.save()
        
        return statement
    
    def generate_quiz_passed(self, student, quiz, score, max_score, duration=None):
        """
        Generate xAPI statement for passing a quiz
        
        Args:
            student: User model instance
            quiz: Quiz model instance
            score: Raw score achieved
            max_score: Maximum possible score
            duration: Optional ISO 8601 duration string
            
        Returns:
            XAPIStatement: The generated statement
        """
        actor = self._create_actor(student)
        verb = self._create_verb(self.VERB_PASSED, "passed")
        
        activity_id = f"{self.base_url}/courses/{quiz.course.id}/quizzes/{quiz.id}"
        activity = self._create_activity(
            activity_id=activity_id,
            name=quiz.title,
            activity_type=self.ACTIVITY_TYPE_ASSESSMENT,
            description=quiz.description
        )
        
        # Calculate scaled score (0-1 range)
        scaled_score = float(score) / float(max_score) if max_score > 0 else 0.0
        
        result = self._create_result(
            score={
                "raw": score,
                "min": 0,
                "max": max_score,
                "scaled": scaled_score
            },
            success=True,
            completion=True,
            duration=duration
        )
        
        # Add context with course information
        context = {
            "contextActivities": {
                "parent": [{
                    "objectType": "Activity",
                    "id": f"{self.base_url}/courses/{quiz.course.id}",
                    "definition": {
                        "name": {
                            "en-US": quiz.course.title
                        },
                        "type": self.ACTIVITY_TYPE_COURSE
                    }
                }]
            }
        }
        
        statement = self._save_statement(actor, verb, activity, result, context)
        
        # Link to existing models for synchronization
        statement.user = student
        statement.course = quiz.course
        statement.quiz = quiz
        statement.save()
        
        return statement
    
    def generate_quiz_failed(self, student, quiz, score, max_score, duration=None):
        """
        Generate xAPI statement for failing a quiz
        
        Args:
            student: User model instance
            quiz: Quiz model instance
            score: Raw score achieved
            max_score: Maximum possible score
            duration: Optional ISO 8601 duration string
            
        Returns:
            XAPIStatement: The generated statement
        """
        actor = self._create_actor(student)
        verb = self._create_verb(self.VERB_FAILED, "failed")
        
        activity_id = f"{self.base_url}/courses/{quiz.course.id}/quizzes/{quiz.id}"
        activity = self._create_activity(
            activity_id=activity_id,
            name=quiz.title,
            activity_type=self.ACTIVITY_TYPE_ASSESSMENT,
            description=quiz.description
        )
        
        # Calculate scaled score (0-1 range)
        scaled_score = float(score) / float(max_score) if max_score > 0 else 0.0
        
        result = self._create_result(
            score={
                "raw": score,
                "min": 0,
                "max": max_score,
                "scaled": scaled_score
            },
            success=False,
            completion=True,
            duration=duration
        )
        
        # Add context with course information
        context = {
            "contextActivities": {
                "parent": [{
                    "objectType": "Activity",
                    "id": f"{self.base_url}/courses/{quiz.course.id}",
                    "definition": {
                        "name": {
                            "en-US": quiz.course.title
                        },
                        "type": self.ACTIVITY_TYPE_COURSE
                    }
                }]
            }
        }
        
        statement = self._save_statement(actor, verb, activity, result, context)
        
        # Link to existing models for synchronization
        statement.user = student
        statement.course = quiz.course
        statement.quiz = quiz
        statement.save()
        
        return statement
    
    def generate_course_registered(self, student, course):
        """
        Generate xAPI statement for course enrollment/registration
        
        Args:
            student: User model instance
            course: Course model instance
            
        Returns:
            XAPIStatement: The generated statement
        """
        actor = self._create_actor(student)
        verb = self._create_verb(self.VERB_REGISTERED, "registered")
        
        activity_id = f"{self.base_url}/courses/{course.id}"
        activity = self._create_activity(
            activity_id=activity_id,
            name=course.title,
            activity_type=self.ACTIVITY_TYPE_COURSE,
            description=course.description
        )
        
        statement = self._save_statement(actor, verb, activity)
        
        # Link to existing models for synchronization
        statement.user = student
        statement.course = course
        statement.save()
        
        return statement
    
    def generate_video_interaction(self, student, lesson, action, position=None, duration=None):
        """
        Generate xAPI statement for video interaction
        
        Args:
            student: User model instance
            lesson: Lesson model instance (must be a video lesson)
            action: Action type ('played', 'paused', 'seeked', 'completed')
            position: Video position in seconds (for seeked action)
            duration: Optional ISO 8601 duration string (for completed action)
            
        Returns:
            XAPIStatement: The generated statement
        """
        actor = self._create_actor(student)
        
        # Map action to verb
        verb_map = {
            'played': (self.VERB_PLAYED, "played"),
            'paused': (self.VERB_PAUSED, "paused"),
            'seeked': (self.VERB_SEEKED, "seeked"),
            'completed': (self.VERB_COMPLETED, "completed")
        }
        
        if action not in verb_map:
            raise ValueError(f"Invalid video action: {action}. Must be one of {list(verb_map.keys())}")
        
        verb_id, verb_display = verb_map[action]
        verb = self._create_verb(verb_id, verb_display)
        
        activity_id = f"{self.base_url}/courses/{lesson.course.id}/lessons/{lesson.id}/video"
        activity = self._create_activity(
            activity_id=activity_id,
            name=f"{lesson.title} (Video)",
            activity_type=self.ACTIVITY_TYPE_VIDEO,
            description=lesson.content[:200] if lesson.content else None
        )
        
        # Create result with position information
        result_data = {}
        
        if position is not None:
            # Add position as an extension
            result_data["extensions"] = {
                "http://id.tincanapi.com/extension/position": position
            }
        
        if action == 'completed':
            result_data["completion"] = True
            if duration:
                result_data["duration"] = duration
        
        result = result_data if result_data else None
        
        # Add context with course information
        context = {
            "contextActivities": {
                "parent": [{
                    "objectType": "Activity",
                    "id": f"{self.base_url}/courses/{lesson.course.id}/lessons/{lesson.id}",
                    "definition": {
                        "name": {
                            "en-US": lesson.title
                        },
                        "type": self.ACTIVITY_TYPE_LESSON
                    }
                }],
                "grouping": [{
                    "objectType": "Activity",
                    "id": f"{self.base_url}/courses/{lesson.course.id}",
                    "definition": {
                        "name": {
                            "en-US": lesson.course.title
                        },
                        "type": self.ACTIVITY_TYPE_COURSE
                    }
                }]
            }
        }
        
        statement = self._save_statement(actor, verb, activity, result, context)
        
        # Link to existing models for synchronization
        statement.user = student
        statement.course = lesson.course
        statement.lesson = lesson
        statement.save()
        
        return statement
