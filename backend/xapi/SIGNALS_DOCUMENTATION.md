# xAPI Signals Documentation

## Overview

This document describes the Django signals implementation for automatic xAPI statement generation. The signals automatically create xAPI statements when learning activities occur, ensuring that all student interactions are tracked according to the xAPI specification.

## Implementation

### Files Created

1. **`backend/xapi/signals.py`** - Contains all signal handlers for automatic statement generation
2. **`backend/xapi/test_signals.py`** - Comprehensive test suite for signal functionality

### Files Modified

1. **`backend/xapi/apps.py`** - Updated to load signals when the app is ready

## Signal Handlers

### 1. Lesson Completion Signal

**Signal:** `post_save` on `courses.Progress`  
**Trigger:** When `Progress.completed` is set to `True` and `completed_at` is set  
**Statement Generated:** "completed" verb for the lesson  
**Requirements:** 4.1

**Behavior:**
- Only generates statement when lesson is marked as completed
- Checks for existing statements to prevent duplicates
- Links statement to student, lesson, and course
- Includes course context in the statement

**Example:**
```python
# When a student completes a lesson
progress = Progress.objects.create(
    student=student,
    lesson=lesson,
    completed=True
)
# Automatically generates: "student completed lesson" xAPI statement
```

### 2. Quiz Result Signal

**Signal:** `post_save` on `quizzes.QuizAttempt`  
**Trigger:** When `QuizAttempt.completed_at` is set  
**Statements Generated:**
- "passed" verb if `passed=True`
- "failed" verb if `passed=False`

**Requirements:** 4.2, 4.3

**Behavior:**
- Only generates statement when quiz attempt is completed
- Includes score information (raw, max, scaled)
- Includes duration in ISO 8601 format if `time_taken` is available
- Links statement to student, quiz, and course
- Includes course context in the statement

**Example:**
```python
# When a student completes a quiz
attempt = QuizAttempt.objects.create(
    quiz=quiz,
    student=student,
    score=85,
    max_score=100,
    percentage=85,
    passed=True,
    completed_at=timezone.now(),
    time_taken=300  # 5 minutes
)
# Automatically generates: "student passed quiz" xAPI statement with score
```

### 3. Course Enrollment Signal

**Signal:** `post_save` on `courses.Enrollment`  
**Trigger:** When a new `Enrollment` is created  
**Statement Generated:** "registered" verb for the course  
**Requirements:** 4.4

**Behavior:**
- Only generates statement for new enrollments (created=True)
- Links statement to student and course
- No duplicate statements on enrollment updates

**Example:**
```python
# When a student enrolls in a course
enrollment = Enrollment.objects.create(
    student=student,
    course=course
)
# Automatically generates: "student registered course" xAPI statement
```

## Duplicate Prevention

All signal handlers include logic to prevent duplicate statement generation:

1. **Lesson Completion:** Checks if a "completed" statement already exists for the student-lesson pair
2. **Quiz Attempts:** Only generates statements when `completed_at` is first set
3. **Enrollments:** Only generates statements when `created=True`

## Error Handling

All signal handlers include try-except blocks to catch and log errors without preventing the save operation. This ensures that:

- Database operations complete successfully even if statement generation fails
- Errors are logged for debugging
- The system remains resilient to xAPI-related issues

## Testing

The test suite (`test_signals.py`) includes:

### Lesson Completion Tests
- ✅ Statement generated on lesson completion
- ✅ No statement on incomplete lesson
- ✅ No duplicate statements on update

### Quiz Attempt Tests
- ✅ Passed statement generated on quiz pass
- ✅ Failed statement generated on quiz fail
- ✅ No statement on incomplete quiz

### Enrollment Tests
- ✅ Statement generated on enrollment
- ✅ No duplicate statements on enrollment update

### Integration Tests
- ✅ Complete learning journey (enrollment → lesson → quiz)

## Usage

The signals are automatically loaded when the Django app starts. No manual configuration is required.

### Verifying Signals Are Active

To verify that signals are working:

```python
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Progress
from xapi.models import XAPIStatement

User = get_user_model()

# Create test data
student = User.objects.get(username='test_student')
lesson = Lesson.objects.get(id=1)

# Complete a lesson
progress = Progress.objects.create(
    student=student,
    lesson=lesson,
    completed=True
)

# Check that statement was created
statements = XAPIStatement.objects.filter(
    user=student,
    lesson=lesson,
    verb_id="http://adlnet.gov/expapi/verbs/completed"
)
print(f"Statements created: {statements.count()}")  # Should be 1
```

## Statement Format

All generated statements follow the xAPI specification:

```json
{
    "actor": {
        "objectType": "Agent",
        "name": "student_name",
        "mbox": "mailto:student@example.com",
        "account": {
            "name": "student_id",
            "homePage": "http://localhost:8000"
        }
    },
    "verb": {
        "id": "http://adlnet.gov/expapi/verbs/completed",
        "display": {"en-US": "completed"}
    },
    "object": {
        "objectType": "Activity",
        "id": "http://localhost:8000/courses/1/lessons/1",
        "definition": {
            "name": {"en-US": "Lesson Title"},
            "type": "http://adlnet.gov/expapi/activities/lesson"
        }
    },
    "result": {
        "completion": true
    },
    "context": {
        "contextActivities": {
            "parent": [{
                "objectType": "Activity",
                "id": "http://localhost:8000/courses/1",
                "definition": {
                    "name": {"en-US": "Course Title"},
                    "type": "http://adlnet.gov/expapi/activities/course"
                }
            }]
        }
    },
    "timestamp": "2025-12-15T10:30:00Z"
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Duration Tracking:** Implement actual time tracking for lessons to provide accurate duration data
2. **Video Interactions:** Add signals for video play, pause, seek events (currently handled separately)
3. **Batch Processing:** Consider batching statement generation for high-volume scenarios
4. **Retry Logic:** Add retry mechanism for failed statement generation
5. **Statement Validation:** Add pre-save validation to ensure statement quality

## Related Documentation

- [Statement Generator Usage](./STATEMENT_GENERATOR_USAGE.md)
- [xAPI Authentication](./AUTHENTICATION.md)
- [Requirements Document](../../.kiro/specs/scorm-xapi-compliance/requirements.md)
- [Design Document](../../.kiro/specs/scorm-xapi-compliance/design.md)
