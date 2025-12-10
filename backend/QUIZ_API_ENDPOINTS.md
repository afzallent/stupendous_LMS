# Quiz API Endpoints Documentation

This document provides comprehensive documentation for all Quiz API endpoints implemented in the Django backend.

## Base URL

All endpoints are prefixed with `/api/`

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <your_token>
```

Or use session authentication by logging in first.

## Endpoints Overview

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/quizzes/` | List all quizzes | Any authenticated user |
| POST | `/api/quizzes/` | Create a new quiz | Instructor only |
| GET | `/api/quizzes/{id}/` | Get quiz details | Any authenticated user |
| PUT | `/api/quizzes/{id}/` | Update quiz | Quiz owner only |
| DELETE | `/api/quizzes/{id}/` | Delete quiz | Quiz owner only |
| POST | `/api/quizzes/{id}/publish/` | Publish quiz | Quiz owner only |
| POST | `/api/quizzes/{id}/submit/` | Submit quiz answers | Enrolled students |
| GET | `/api/quizzes/{id}/attempts/` | Get all attempts | Quiz owner only |
| GET | `/api/quizzes/{id}/my-attempts/` | Get student's own attempts | Enrolled students |
| GET | `/api/quizzes/{id}/attempts/{student_id}/` | Get attempt history for student | Quiz owner only |
| POST | `/api/quizzes/{id}/questions/` | Add question to quiz | Quiz owner only |
| PUT | `/api/quizzes/{id}/questions/{q_id}/` | Update question | Quiz owner only |
| DELETE | `/api/quizzes/{id}/questions/{q_id}/` | Delete question | Quiz owner only |

---

## Detailed Endpoint Documentation

### 1. List Quizzes

**GET** `/api/quizzes/`

List all quizzes. Can be filtered by course.

**Query Parameters:**
- `course_id` (optional): Filter quizzes by course ID

**Response:**
```json
[
  {
    "id": 1,
    "title": "Python Basics Quiz",
    "description": "Test your Python knowledge",
    "course": 1,
    "passing_score": 70,
    "time_limit": 30,
    "max_attempts": 3,
    "is_active": true
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/api/quizzes/?course_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Create Quiz

**POST** `/api/quizzes/`

Create a new quiz for a course.

**Request Body:**
```json
{
  "course": 1,
  "title": "Python Basics Quiz",
  "description": "Test your Python knowledge",
  "passing_score": 70,
  "time_limit": 30,
  "max_attempts": 3
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "title": "Python Basics Quiz",
  "description": "Test your Python knowledge",
  "course": 1,
  "passing_score": 70,
  "time_limit": 30,
  "max_attempts": 3,
  "is_active": false
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/quizzes/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course": 1,
    "title": "Python Basics Quiz",
    "description": "Test your Python knowledge",
    "passing_score": 70,
    "time_limit": 30,
    "max_attempts": 3
  }'
```

---

### 3. Get Quiz Details

**GET** `/api/quizzes/{id}/`

Get detailed information about a specific quiz, including all questions.

**Response:**
```json
{
  "id": 1,
  "title": "Python Basics Quiz",
  "description": "Test your Python knowledge",
  "course": 1,
  "passing_score": 70,
  "time_limit": 30,
  "max_attempts": 3,
  "is_active": true,
  "questions": [
    {
      "id": 1,
      "question_text": "What is 2+2?",
      "question_type": "multiple_choice",
      "points": 10,
      "order": 1,
      "explanation": "Basic math",
      "options": [
        {
          "id": 1,
          "option_text": "3",
          "is_correct": false,
          "order": 0
        },
        {
          "id": 2,
          "option_text": "4",
          "is_correct": true,
          "order": 1
        }
      ]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/api/quizzes/1/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Quiz

**PUT** `/api/quizzes/{id}/`

Update an existing quiz.

**Request Body:**
```json
{
  "course": 1,
  "title": "Updated Python Quiz",
  "description": "Updated description",
  "passing_score": 75,
  "time_limit": 45,
  "max_attempts": 5
}
```

**Response:** (200 OK)
```json
{
  "id": 1,
  "title": "Updated Python Quiz",
  "description": "Updated description",
  "course": 1,
  "passing_score": 75,
  "time_limit": 45,
  "max_attempts": 5,
  "is_active": true
}
```

**cURL Example:**
```bash
curl -X PUT "http://localhost:8000/api/quizzes/1/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course": 1,
    "title": "Updated Python Quiz",
    "description": "Updated description",
    "passing_score": 75,
    "time_limit": 45,
    "max_attempts": 5
  }'
```

---

### 5. Delete Quiz

**DELETE** `/api/quizzes/{id}/`

Delete a quiz.

**Response:** (204 No Content)

**cURL Example:**
```bash
curl -X DELETE "http://localhost:8000/api/quizzes/1/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Publish Quiz

**POST** `/api/quizzes/{id}/publish/`

Publish a quiz (set is_active=True). Quiz must have at least one question.

**Response:** (200 OK)
```json
{
  "id": 1,
  "title": "Python Basics Quiz",
  "is_active": true,
  ...
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/quizzes/1/publish/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Add Question to Quiz

**POST** `/api/quizzes/{id}/questions/`

Add a new question to a quiz.

**Request Body:**
```json
{
  "question_text": "What is 2+2?",
  "question_type": "multiple_choice",
  "points": 10,
  "explanation": "Basic math",
  "options": [
    {
      "option_text": "3",
      "is_correct": false,
      "order": 0
    },
    {
      "option_text": "4",
      "is_correct": true,
      "order": 1
    },
    {
      "option_text": "5",
      "is_correct": false,
      "order": 2
    }
  ]
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "question_text": "What is 2+2?",
  "question_type": "multiple_choice",
  "points": 10,
  "order": 1,
  "explanation": "Basic math",
  "options": [...]
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/quizzes/1/questions/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "What is 2+2?",
    "question_type": "multiple_choice",
    "points": 10,
    "explanation": "Basic math",
    "options": [
      {"option_text": "3", "is_correct": false, "order": 0},
      {"option_text": "4", "is_correct": true, "order": 1},
      {"option_text": "5", "is_correct": false, "order": 2}
    ]
  }'
```

---

### 8. Update Question

**PUT** `/api/quizzes/{id}/questions/{q_id}/`

Update an existing question.

**Request Body:**
```json
{
  "question_text": "What is 2+2? (Updated)",
  "points": 15,
  "options": [
    {
      "option_text": "3",
      "is_correct": false,
      "order": 0
    },
    {
      "option_text": "4",
      "is_correct": true,
      "order": 1
    }
  ]
}
```

**Response:** (200 OK)

**cURL Example:**
```bash
curl -X PUT "http://localhost:8000/api/quizzes/1/questions/1/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "What is 2+2? (Updated)",
    "points": 15,
    "options": [
      {"option_text": "3", "is_correct": false, "order": 0},
      {"option_text": "4", "is_correct": true, "order": 1}
    ]
  }'
```

---

### 9. Delete Question

**DELETE** `/api/quizzes/{id}/questions/{q_id}/`

Delete a question from a quiz.

**Response:** (204 No Content)

**cURL Example:**
```bash
curl -X DELETE "http://localhost:8000/api/quizzes/1/questions/1/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 10. Submit Quiz

**POST** `/api/quizzes/{id}/submit/`

Submit answers for a quiz. Student must be enrolled in the course.

**Request Body:**
```json
{
  "answers": [
    {
      "question_id": 1,
      "selected_option_id": 2
    },
    {
      "question_id": 2,
      "text_answer": "Python is a programming language"
    }
  ]
}
```

**Response:** (201 Created)
```json
{
  "id": 1,
  "quiz": 1,
  "student": 2,
  "attempt_number": 1,
  "score": 15,
  "max_score": 20,
  "percentage": 75.0,
  "passed": true,
  "started_at": "2024-01-01T10:00:00Z",
  "completed_at": "2024-01-01T10:25:00Z",
  "time_taken": 1500,
  "answers": [...]
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:8000/api/quizzes/1/submit/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": 1, "selected_option_id": 2},
      {"question_id": 2, "text_answer": "Python is a programming language"}
    ]
  }'
```

---

### 11. Get My Attempts

**GET** `/api/quizzes/{id}/my-attempts/`

Get all attempts for the current user on a specific quiz.

**Response:**
```json
[
  {
    "id": 1,
    "quiz": 1,
    "student": 2,
    "attempt_number": 1,
    "score": 15,
    "max_score": 20,
    "percentage": 75.0,
    "passed": true,
    "started_at": "2024-01-01T10:00:00Z",
    "completed_at": "2024-01-01T10:25:00Z",
    "time_taken": 1500
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/api/quizzes/1/my-attempts/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 12. Get All Attempts (Instructor)

**GET** `/api/quizzes/{id}/attempts/`

Get all attempts for a quiz (instructor only).

**Response:**
```json
[
  {
    "id": 1,
    "quiz": 1,
    "student": 2,
    "attempt_number": 1,
    "score": 15,
    "max_score": 20,
    "percentage": 75.0,
    "passed": true,
    "started_at": "2024-01-01T10:00:00Z",
    "completed_at": "2024-01-01T10:25:00Z",
    "time_taken": 1500
  }
]
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/api/quizzes/1/attempts/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 13. Get Attempt History (Instructor)

**GET** `/api/quizzes/{id}/attempts/{student_id}/`

Get detailed attempt history for a specific student, including question-by-question breakdown.

**Response:**
```json
{
  "student_id": 2,
  "student_name": "John Doe",
  "quiz_id": 1,
  "quiz_title": "Python Basics Quiz",
  "attempts": [
    {
      "attempt_id": 1,
      "attempt_number": 1,
      "started_at": "2024-01-01T10:00:00Z",
      "completed_at": "2024-01-01T10:25:00Z",
      "time_taken": 1500,
      "score": 15.0,
      "max_score": 20,
      "percentage": 75.0,
      "passed": true,
      "questions": [
        {
          "question_id": 1,
          "question_text": "What is 2+2?",
          "question_type": "multiple_choice",
          "points_possible": 10,
          "points_earned": 10,
          "student_answer": "4",
          "correct_answer": "4",
          "is_correct": true,
          "explanation": "Basic math"
        },
        {
          "question_id": 2,
          "question_text": "What is Python?",
          "question_type": "short_answer",
          "points_possible": 10,
          "points_earned": 5,
          "student_answer": "A language",
          "correct_answer": "N/A",
          "is_correct": false,
          "explanation": "Python is a high-level programming language"
        }
      ]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "http://localhost:8000/api/quizzes/1/attempts/2/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing with Postman

1. **Import Collection**: Create a new Postman collection and add all the endpoints above
2. **Set Environment Variables**:
   - `base_url`: `http://localhost:8000`
   - `token`: Your authentication token
3. **Configure Authorization**: Use Bearer Token with `{{token}}`
4. **Test Workflow**:
   - Create a quiz
   - Add questions
   - Publish the quiz
   - Submit as a student
   - View attempts as instructor

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Cannot publish quiz without questions."
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You can only create quizzes for your own courses."
}
```

### 404 Not Found
```json
{
  "detail": "Quiz not found."
}
```

---

## Requirements Validation

This implementation satisfies the following requirements from the specification:

- **4.1**: Create and store assessments with all required fields ✓
- **4.2**: Support multiple choice and true/false questions ✓
- **4.3**: Store question options with correct answers ✓
- **4.4**: (Not applicable - covered by 4.2)
- **4.5**: Filter quizzes by course ✓
- **4.6**: Submit quiz and calculate score ✓
- **4.7**: Calculate score by summing correct answers ✓
- **4.8**: Display all student submissions with scores ✓
- **10.1**: Store submission with timestamp, answers, score ✓
- **10.2**: Return attempts in chronological order ✓
- **10.3**: Show question-by-question breakdown ✓

---

## Test Results

All endpoints have been tested and verified:

```
✓ GET /api/quizzes/ - List quizzes
✓ POST /api/quizzes/ - Create quiz
✓ GET /api/quizzes/{id}/ - Get quiz details
✓ PUT /api/quizzes/{id}/ - Update quiz
✓ POST /api/quizzes/{id}/questions/ - Add question
✓ PUT /api/quizzes/{id}/questions/{q_id}/ - Update question
✓ POST /api/quizzes/{id}/publish/ - Publish quiz
✓ POST /api/quizzes/{id}/submit/ - Submit quiz
✓ GET /api/quizzes/{id}/my-attempts/ - Get my attempts
✓ GET /api/quizzes/{id}/attempts/ - Get all attempts
✓ GET /api/quizzes/{id}/attempts/{student_id}/ - Get attempt history
✓ DELETE /api/quizzes/{id}/questions/{q_id}/ - Delete question
✓ DELETE /api/quizzes/{id}/ - Delete quiz
```

All tests passed successfully!
