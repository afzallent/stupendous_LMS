# Analytics API

## Overview

The Analytics API provides comprehensive statistics and metrics for trainers to monitor course performance, student engagement, and enrollment trends.

## Authentication

All endpoints require authentication and the user must have `is_instructor=True`.

## Endpoints

### 1. Trainer Dashboard Analytics

**GET** `/api/analytics/dashboard/`

Returns comprehensive dashboard analytics for the authenticated trainer.

**Response:**
```json
{
  "total_courses": 5,
  "total_students": 150,
  "total_enrollments": 200,
  "total_lessons": 50,
  "courses": [
    {
      "id": 1,
      "title": "Introduction to Python",
      "enrollment_count": 50,
      "lesson_count": 10,
      "avg_progress": 65.5
    }
  ]
}
```

**Caching:** Results are cached for 5 minutes.

---

### 2. Course Statistics

**GET** `/api/analytics/course/{id}/`

Returns detailed statistics for a specific course.

**Parameters:**
- `id` (path): Course ID

**Response:**
```json
{
  "course_id": 1,
  "course_title": "Introduction to Python",
  "enrollments": 50,
  "active_students": 25,
  "completion_rate": 45.0,
  "avg_progress": 68.5,
  "total_lessons": 10,
  "completed_students": 23
}
```

**Notes:**
- `active_students`: Students with activity in the last 30 days
- `completion_rate`: Percentage of students who completed all lessons
- `avg_progress`: Average progress percentage across all enrolled students

---

### 3. Course Lesson Statistics

**GET** `/api/analytics/course/{id}/lessons/`

Returns lesson-level statistics for a course.

**Parameters:**
- `id` (path): Course ID

**Response:**
```json
[
  {
    "lesson_id": 1,
    "lesson_title": "Getting Started",
    "chapter": "Introduction",
    "order": 1,
    "completion_count": 45,
    "avg_time_minutes": 15.5
  }
]
```

---

### 4. Course Assessment Statistics

**GET** `/api/analytics/course/{id}/assessments/`

Returns assessment statistics for a course.

**Parameters:**
- `id` (path): Course ID

**Response:**
```json
[
  {
    "assessment_id": 1,
    "assessment_title": "Python Basics Quiz",
    "total_attempts": 50,
    "avg_score": 82.5,
    "pass_rate": 90.0,
    "passing_score": 70
  }
]
```

---

### 5. Enrollment Trends

**GET** `/api/analytics/enrollment_trends/`

Returns enrollment trend data grouped by time period.

**Query Parameters:**
- `period` (optional): `daily`, `weekly`, or `monthly` (default: `daily`)

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 10
  },
  {
    "date": "2024-01-02",
    "count": 15
  }
]
```

---

### 6. Completion Rates

**GET** `/api/analytics/completion_rates/`

Returns completion rate for each of the trainer's courses.

**Response:**
```json
[
  {
    "course_id": 1,
    "course_title": "Introduction to Python",
    "total_enrolled": 50,
    "total_completed": 23,
    "completion_rate": 46.0
  }
]
```

**Notes:** Results are sorted by completion rate descending.

---

### 7. Student Engagement

**GET** `/api/analytics/engagement/`

Returns student engagement metrics.

**Query Parameters:**
- `course_id` (optional): Filter by specific course
- `days` (optional): Number of days to look back (default: 30)

**Response:**
```json
{
  "total_active_students": 50,
  "new_enrollments": 10,
  "lessons_completed": 100,
  "avg_engagement_score": 75.5,
  "top_performers": [
    {
      "student_id": 1,
      "student_name": "John Doe",
      "course_id": 1,
      "course_title": "Introduction to Python",
      "completion_rate": 95.0
    }
  ],
  "at_risk_students": [
    {
      "student_id": 2,
      "student_name": "Jane Smith",
      "course_id": 1,
      "course_title": "Introduction to Python",
      "completion_rate": 15.0,
      "enrolled_date": "2024-01-01"
    }
  ]
}
```

## Optimization

The analytics API uses several optimization techniques:

1. **Django ORM Aggregation**: Uses `Count`, `Avg`, and other aggregation functions
2. **Query Optimization**: Uses `select_related` and `prefetch_related` to reduce queries
3. **Caching**: Dashboard analytics are cached for 5 minutes
4. **Database Indexes**: Utilizes existing indexes on frequently queried fields

## Requirements

The implementation satisfies the following requirements from the specification:

- **Requirement 1.1**: Returns total course count, student count, enrollment count, lesson count
- **Requirement 1.2**: Returns per-course enrollment count and average progress
- **Requirement 1.3**: Calculates average progress as mean of all enrolled students
- **Requirement 1.4**: Returns enrollment data grouped by time period
- **Requirement 1.5**: Returns completion rate percentage per course
- **Requirement 8.1**: Returns enrollment count, active students, completion rate, avg progress
- **Requirement 8.2**: Counts active students based on last 30 days activity
- **Requirement 8.3**: Calculates completion rate as completed/total enrolled

## Permissions

- `IsAuthenticated`: User must be logged in
- `IsInstructor`: User must have `is_instructor=True`
- Course ownership verification: Views verify the trainer owns the course

## Error Responses

**401 Unauthorized:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**404 Not Found:**
```json
{
  "error": "Course not found or access denied"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid period. Must be one of: daily, weekly, monthly"
}
```
