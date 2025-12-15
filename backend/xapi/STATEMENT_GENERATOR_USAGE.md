# XAPIStatementGenerator Usage Guide

The `XAPIStatementGenerator` class automatically generates xAPI statements for learning activities in the LMS.

## Overview

The statement generator creates properly formatted xAPI statements that comply with the xAPI specification. Each statement includes:
- **Actor**: The student performing the action
- **Verb**: The action being performed (completed, passed, failed, registered, played, etc.)
- **Object**: The learning activity (lesson, quiz, course, video)
- **Result**: Optional outcome data (scores, completion status, duration)
- **Context**: Contextual information (parent course, related activities)

## Basic Usage

```python
from xapi.statement_generator import XAPIStatementGenerator

# Create a generator instance
generator = XAPIStatementGenerator(base_url="http://yourlms.com")

# Or use default base URL from settings
generator = XAPIStatementGenerator()
```

## Generating Statements

### 1. Lesson Completion

Generate a statement when a student completes a lesson:

```python
from courses.models import Lesson
from django.contrib.auth import get_user_model

User = get_user_model()
student = User.objects.get(username="john_doe")
lesson = Lesson.objects.get(id=1)

# Generate statement
statement = generator.generate_lesson_completed(
    student=student,
    lesson=lesson,
    duration="PT15M30S"  # Optional: ISO 8601 duration (15 minutes 30 seconds)
)

# Statement is automatically saved to the database
print(f"Statement ID: {statement.statement_id}")
```

### 2. Quiz Passed

Generate a statement when a student passes a quiz:

```python
from quizzes.models import Quiz

quiz = Quiz.objects.get(id=1)

statement = generator.generate_quiz_passed(
    student=student,
    quiz=quiz,
    score=85,
    max_score=100,
    duration="PT10M"  # Optional: 10 minutes
)
```

### 3. Quiz Failed

Generate a statement when a student fails a quiz:

```python
statement = generator.generate_quiz_failed(
    student=student,
    quiz=quiz,
    score=45,
    max_score=100,
    duration="PT8M"  # Optional: 8 minutes
)
```

### 4. Course Registration

Generate a statement when a student enrolls in a course:

```python
from courses.models import Course

course = Course.objects.get(id=1)

statement = generator.generate_course_registered(
    student=student,
    course=course
)
```

### 5. Video Interactions

Generate statements for video player interactions:

```python
# Video played
statement = generator.generate_video_interaction(
    student=student,
    lesson=lesson,
    action='played'
)

# Video paused at 2 minutes
statement = generator.generate_video_interaction(
    student=student,
    lesson=lesson,
    action='paused',
    position=120  # Position in seconds
)

# Video seeked to 5 minutes
statement = generator.generate_video_interaction(
    student=student,
    lesson=lesson,
    action='seeked',
    position=300
)

# Video completed
statement = generator.generate_video_interaction(
    student=student,
    lesson=lesson,
    action='completed',
    duration="PT10M30S"  # Total watch time
)
```

## Integration with Django Signals

You can automatically generate statements using Django signals:

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from courses.models import Progress, Enrollment
from quizzes.models import QuizAttempt
from xapi.statement_generator import XAPIStatementGenerator

generator = XAPIStatementGenerator()

@receiver(post_save, sender=Progress)
def generate_lesson_completion_statement(sender, instance, created, **kwargs):
    """Generate xAPI statement when lesson is completed"""
    if instance.completed:
        generator.generate_lesson_completed(
            student=instance.student,
            lesson=instance.lesson
        )

@receiver(post_save, sender=QuizAttempt)
def generate_quiz_statement(sender, instance, created, **kwargs):
    """Generate xAPI statement when quiz is completed"""
    if instance.completed_at:
        if instance.passed:
            generator.generate_quiz_passed(
                student=instance.student,
                quiz=instance.quiz,
                score=instance.score,
                max_score=instance.max_score
            )
        else:
            generator.generate_quiz_failed(
                student=instance.student,
                quiz=instance.quiz,
                score=instance.score,
                max_score=instance.max_score
            )

@receiver(post_save, sender=Enrollment)
def generate_enrollment_statement(sender, instance, created, **kwargs):
    """Generate xAPI statement when student enrolls in course"""
    if created:
        generator.generate_course_registered(
            student=instance.student,
            course=instance.course
        )
```

## Statement Structure

All generated statements follow the xAPI specification and include:

### Actor Object
```json
{
  "objectType": "Agent",
  "name": "John Doe",
  "mbox": "mailto:john@example.com",
  "account": {
    "name": "123",
    "homePage": "http://yourlms.com"
  }
}
```

### Verb Object
```json
{
  "id": "http://adlnet.gov/expapi/verbs/completed",
  "display": {
    "en-US": "completed"
  }
}
```

### Activity Object
```json
{
  "objectType": "Activity",
  "id": "http://yourlms.com/courses/1/lessons/5",
  "definition": {
    "name": {
      "en-US": "Introduction to Python"
    },
    "type": "http://adlnet.gov/expapi/activities/lesson"
  }
}
```

### Result Object (for quizzes)
```json
{
  "score": {
    "raw": 85,
    "min": 0,
    "max": 100,
    "scaled": 0.85
  },
  "success": true,
  "completion": true
}
```

### Context Object
```json
{
  "contextActivities": {
    "parent": [{
      "objectType": "Activity",
      "id": "http://yourlms.com/courses/1",
      "definition": {
        "name": {
          "en-US": "Python Programming Course"
        },
        "type": "http://adlnet.gov/expapi/activities/course"
      }
    }]
  }
}
```

## Standard Verb IRIs

The generator uses standard xAPI verb IRIs:

- `http://adlnet.gov/expapi/verbs/completed` - Completed an activity
- `http://adlnet.gov/expapi/verbs/passed` - Passed an assessment
- `http://adlnet.gov/expapi/verbs/failed` - Failed an assessment
- `http://adlnet.gov/expapi/verbs/registered` - Registered for a course
- `http://adlnet.gov/expapi/verbs/played` - Played a video
- `http://adlnet.gov/expapi/verbs/paused` - Paused a video
- `http://adlnet.gov/expapi/verbs/seeked` - Seeked in a video

## Standard Activity Type IRIs

The generator uses standard xAPI activity type IRIs:

- `http://adlnet.gov/expapi/activities/lesson` - A lesson
- `http://adlnet.gov/expapi/activities/course` - A course
- `http://adlnet.gov/expapi/activities/assessment` - A quiz/assessment
- `http://adlnet.gov/expapi/activities/media` - Video content

## ISO 8601 Duration Format

Durations should be provided in ISO 8601 format:

- `PT5M` - 5 minutes
- `PT1H30M` - 1 hour 30 minutes
- `PT45S` - 45 seconds
- `PT2H15M30S` - 2 hours 15 minutes 30 seconds

## Database Storage

All generated statements are automatically saved to the `XAPIStatement` model with:
- Unique UUID identifier
- Timestamp of when the activity occurred
- Stored timestamp of when the statement was saved
- Links to related models (user, course, lesson, quiz) for synchronization
- Full statement JSON for complete xAPI compliance

## Querying Statements

```python
from xapi.models import XAPIStatement

# Get all statements for a student
statements = XAPIStatement.objects.filter(user=student)

# Get all lesson completion statements
statements = XAPIStatement.objects.filter(
    verb_id="http://adlnet.gov/expapi/verbs/completed",
    lesson__isnull=False
)

# Get all quiz statements for a course
statements = XAPIStatement.objects.filter(
    course=course,
    quiz__isnull=False
)

# Get statements by date range
from django.utils import timezone
from datetime import timedelta

last_week = timezone.now() - timedelta(days=7)
statements = XAPIStatement.objects.filter(
    timestamp__gte=last_week
)
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.1**: Generates "completed" statements for lesson completions
- **Requirement 4.2**: Generates "passed" statements for quiz passes with scores
- **Requirement 4.3**: Generates "failed" statements for quiz failures with scores
- **Requirement 4.4**: Generates "registered" statements for course enrollments
- **Requirement 4.5**: Generates video interaction statements (played, paused, seeked, completed)

All statements are xAPI 1.0.3 compliant and include proper actor, verb, object, result, and context information.
