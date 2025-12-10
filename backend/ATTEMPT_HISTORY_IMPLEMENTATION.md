# Quiz Attempt History Endpoint Implementation

## Overview
Implemented the `attempt_history` endpoint for the Quiz API that allows trainers to view detailed attempt history for specific students.

## Endpoint Details

### URL Pattern
```
GET /api/quizzes/{quiz_id}/attempts/{student_id}/
```

### Authentication
- Requires authentication
- Only the course instructor can access this endpoint
- Returns 403 Forbidden if accessed by non-owner instructor

### Response Format
```json
{
  "student_id": 123,
  "student_name": "John Doe",
  "quiz_id": 456,
  "quiz_title": "Python Basics Quiz",
  "attempts": [
    {
      "attempt_id": 789,
      "attempt_number": 1,
      "started_at": "2025-12-10T08:00:00Z",
      "completed_at": "2025-12-10T08:15:00Z",
      "time_taken": 900,
      "score": 15.0,
      "max_score": 20,
      "percentage": 75.0,
      "passed": true,
      "questions": [
        {
          "question_id": 1,
          "question_text": "What is 2 + 2?",
          "question_type": "multiple_choice",
          "points_possible": 10,
          "points_earned": 10,
          "student_answer": "4",
          "correct_answer": "4",
          "is_correct": true,
          "explanation": "Basic arithmetic"
        },
        {
          "question_id": 2,
          "question_text": "What is 3 + 3?",
          "question_type": "multiple_choice",
          "points_possible": 10,
          "points_earned": 5,
          "student_answer": "5",
          "correct_answer": "6",
          "is_correct": false,
          "explanation": "More arithmetic"
        }
      ]
    }
  ]
}
```

## Features

### 1. Chronological Ordering
- Attempts are returned in chronological order (oldest first)
- Uses `order_by('started_at')` to ensure consistent ordering

### 2. Question-by-Question Breakdown
Each attempt includes detailed information for every question:
- Question text and type
- Points possible and points earned
- Student's answer
- Correct answer(s)
- Whether the answer was correct
- Explanation (if provided)

### 3. Performance Optimization
- Uses `prefetch_related()` to optimize database queries
- Reduces N+1 query problems by prefetching:
  - `answers__question__options`
  - `answers__selected_option`

### 4. Error Handling
- Returns 403 Forbidden if non-owner instructor tries to access
- Returns 404 Not Found if student doesn't exist
- Returns 404 Not Found if no attempts found for the student

## Implementation Details

### Location
- File: `backend/quizzes/views.py`
- Class: `QuizViewSet`
- Method: `attempt_history()`

### Key Code Sections

#### Permission Check
```python
if quiz.course.instructor != request.user:
    return Response(
        {'detail': 'Only the course instructor can view attempt history.'},
        status=status.HTTP_403_FORBIDDEN
    )
```

#### Query Optimization
```python
attempts = QuizAttempt.objects.filter(
    quiz=quiz,
    student=student
).prefetch_related(
    'answers__question__options',
    'answers__selected_option'
).order_by('started_at')
```

#### Answer Extraction
```python
# Get correct answer(s)
correct_options = question.options.filter(is_correct=True)
correct_answer = ', '.join([opt.option_text for opt in correct_options])

# Get student's answer
if answer.selected_option:
    student_answer = answer.selected_option.option_text
elif answer.text_answer:
    student_answer = answer.text_answer
else:
    student_answer = 'No answer'
```

## Tests

### Test Coverage
Created comprehensive tests in `backend/quizzes/tests.py`:

1. **test_attempt_history_endpoint**
   - Tests successful retrieval of attempt history
   - Verifies chronological ordering
   - Validates question-by-question breakdown
   - Checks all data fields are present and correct

2. **test_attempt_history_wrong_instructor_fails**
   - Ensures non-owner instructors cannot access the endpoint

3. **test_attempt_history_nonexistent_student**
   - Validates proper error handling for invalid student IDs

4. **test_attempt_history_no_attempts**
   - Tests behavior when student has no attempts

### Test Results
All tests pass successfully:
```
Ran 24 tests in 88.737s
OK
```

## Requirements Validation

### Requirement 10.2
✅ "WHEN a trainer views attempt history THEN the System SHALL return all attempts for a specific student and assessment in chronological order"
- Implemented with `.order_by('started_at')`
- Verified through tests

### Requirement 10.3
✅ "WHEN displaying attempt details THEN the System SHALL show question-by-question breakdown with student answer, correct answer, and points earned"
- All required fields included in response
- Verified through comprehensive test

## Usage Example

```python
from rest_framework.test import APIClient

client = APIClient()
client.force_authenticate(user=instructor)

# Get attempt history for student ID 123 on quiz ID 456
response = client.get('/api/quizzes/456/attempts/123/')

# Response includes all attempts with detailed breakdowns
for attempt in response.data['attempts']:
    print(f"Attempt {attempt['attempt_number']}: {attempt['percentage']}%")
    for question in attempt['questions']:
        print(f"  Q: {question['question_text']}")
        print(f"  Student: {question['student_answer']}")
        print(f"  Correct: {question['correct_answer']}")
        print(f"  Points: {question['points_earned']}/{question['points_possible']}")
```

## Related Files
- Implementation: `backend/quizzes/views.py`
- Tests: `backend/quizzes/tests.py`
- Models: `backend/quizzes/models.py`
- Serializers: `backend/quizzes/serializers.py`
- URL Configuration: `backend/quizzes/api_urls.py`

## Next Steps
This endpoint is now ready for integration with the Astro frontend trainer dashboard. The frontend can use this endpoint to display detailed student progress and identify areas where students need additional support.
