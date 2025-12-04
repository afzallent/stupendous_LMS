# Django REST API Endpoints Reference

## Base URL
```
http://localhost:8000/api/
```

---

## Authentication Endpoints

### Login
```
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "is_student": true,
    "is_instructor": false,
    "is_staff": false
  }
}
```

### Register
```
POST /api/auth/register/
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe",
  "is_student": true,
  "is_instructor": false
}

Response (201):
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { ... }
}
```

### Refresh Token
```
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response (200):
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```
GET /api/auth/me/
Authorization: Bearer <access_token>

Response (200):
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "is_student": true,
  "is_instructor": false,
  "is_staff": false
}
```

---

## Course Endpoints

### List Courses
```
GET /api/courses/
Authorization: Bearer <access_token> (optional)

Query Parameters:
- search: string (search in title/description)
- category: integer (filter by category ID)
- level: string (BEGINNER, INTERMEDIATE, ADVANCED)
- featured: boolean (true/false)
- ordering: string (-enrolled_count, -rating, -created_at, price, -price)
- limit: integer (default 10)
- offset: integer (default 0)

Response (200):
{
  "count": 42,
  "next": "http://localhost:8000/api/courses/?offset=10",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Python Basics",
      "description": "Learn Python from scratch",
      "instructor": {
        "id": 2,
        "name": "John Smith",
        "email": "john@example.com"
      },
      "category": {
        "id": 1,
        "name": "Programming"
      },
      "level": "BEGINNER",
      "price": "29.99",
      "rating": 4.5,
      "enrolled_count": 150,
      "lesson_count": 12,
      "featured": true,
      "published": true,
      "is_enrolled": false,
      "duration": "10h 30m",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### Get Course Detail
```
GET /api/courses/{id}/
Authorization: Bearer <access_token> (optional)

Response (200):
{
  "id": 1,
  "title": "Python Basics",
  "description": "Learn Python from scratch",
  "instructor": { ... },
  "category": { ... },
  "level": "BEGINNER",
  "price": "29.99",
  "rating": 4.5,
  "enrolled_count": 150,
  "lesson_count": 12,
  "featured": true,
  "published": true,
  "is_enrolled": false,
  "lessons": [
    {
      "id": 1,
      "title": "Introduction",
      "description": "Course introduction",
      "video_url": "https://example.com/video1.mp4",
      "order": 1,
      "duration": 15
    }
  ]
}
```

### Create Course (Instructor Only)
```
POST /api/courses/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Advanced Python",
  "description": "Advanced Python concepts",
  "category": 1,
  "level": "ADVANCED",
  "price": "49.99",
  "featured": false,
  "published": false
}

Response (201):
{ ... course object ... }
```

### Update Course (Instructor Only)
```
PUT /api/courses/{id}/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Advanced Python",
  "description": "Updated description",
  "published": true
}

Response (200):
{ ... updated course object ... }
```

### Delete Course (Instructor Only)
```
DELETE /api/courses/{id}/
Authorization: Bearer <access_token>

Response (204): No Content
```

---

## Category Endpoints

### List Categories
```
GET /api/categories/
Authorization: Bearer <access_token> (optional)

Response (200):
{
  "count": 6,
  "results": [
    {
      "id": 1,
      "name": "Programming",
      "icon": "💻",
      "course_count": 15
    },
    {
      "id": 2,
      "name": "Design",
      "icon": "🎨",
      "course_count": 8
    }
  ]
}
```

---

## Lesson Endpoints

### List Lessons
```
GET /api/lessons/
Authorization: Bearer <access_token>

Query Parameters:
- course: integer (filter by course ID)

Response (200):
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "course": 1,
      "title": "Introduction",
      "description": "Course introduction",
      "video_url": "https://example.com/video1.mp4",
      "order": 1,
      "duration": 15,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Lesson Detail
```
GET /api/lessons/{id}/
Authorization: Bearer <access_token>

Response (200):
{ ... lesson object ... }
```

### Create Lesson (Instructor Only)
```
POST /api/lessons/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course": 1,
  "title": "Advanced Topics",
  "description": "Advanced topics in Python",
  "video_url": "https://example.com/video.mp4",
  "order": 2,
  "duration": 30
}

Response (201):
{ ... lesson object ... }
```

---

## Enrollment Endpoints

### List Enrollments
```
GET /api/enrollments/
Authorization: Bearer <access_token>

Response (200):
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "course": {
        "id": 1,
        "title": "Python Basics"
      },
      "status": "ACTIVE",
      "enrolled_at": "2024-01-15T10:30:00Z",
      "progress_percentage": 45,
      "completed_lessons": 5,
      "total_lessons": 12
    }
  ]
}
```

### Enroll in Course
```
POST /api/enrollments/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course": 1
}

Response (201):
{ ... enrollment object ... }
```

### Get Enrollment Detail
```
GET /api/enrollments/{id}/
Authorization: Bearer <access_token>

Response (200):
{ ... enrollment object ... }
```

---

## Progress Endpoints

### List Progress
```
GET /api/progress/
Authorization: Bearer <access_token>

Query Parameters:
- lesson: integer (filter by lesson ID)
- course: integer (filter by course ID)

Response (200):
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "student": 1,
      "lesson": 1,
      "course": 1,
      "completed": true,
      "watch_time": 900,
      "completed_at": "2024-01-20T15:45:00Z"
    }
  ]
}
```

### Mark Lesson Complete
```
POST /api/progress/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "lesson": 1,
  "completed": true,
  "watch_time": 900
}

Response (201):
{ ... progress object ... }
```

---

## Student Dashboard Endpoint

### Get Student Dashboard
```
GET /api/student/dashboard/
Authorization: Bearer <access_token>

Response (200):
{
  "total_enrolled": 5,
  "total_completed": 2,
  "total_hours": 45,
  "current_streak": 12,
  "enrollments": [
    {
      "id": 1,
      "course": {
        "id": 1,
        "title": "Python Basics",
        "instructor": { ... },
        "lesson_count": 12
      },
      "progress_percentage": 45,
      "completed_lessons": 5,
      "next_lesson": {
        "id": 6,
        "title": "Functions"
      }
    }
  ],
  "achievements": [
    {
      "id": 1,
      "title": "First Course Enrolled",
      "description": "Enrolled in your first course",
      "icon": "🎓",
      "earned_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Instructor Analytics Endpoints

### Get Instructor Analytics
```
GET /api/instructor/analytics/
Authorization: Bearer <access_token>

Response (200):
{
  "total_courses": 5,
  "total_students": 150,
  "total_revenue": 4500.00,
  "average_rating": 4.5,
  "courses": [
    {
      "id": 1,
      "title": "Python Basics",
      "students": 50,
      "revenue": 1500.00,
      "rating": 4.7,
      "completion_rate": 65
    }
  ]
}
```

### Get Instructor Activity
```
GET /api/instructor/activity/
Authorization: Bearer <access_token>

Response (200):
{
  "recent_enrollments": [
    {
      "id": 1,
      "student": { ... },
      "course": { ... },
      "enrolled_at": "2024-01-20T15:45:00Z"
    }
  ],
  "recent_completions": [
    {
      "id": 1,
      "student": { ... },
      "course": { ... },
      "completed_at": "2024-01-20T16:00:00Z"
    }
  ]
}
```

### Get Instructor Students
```
GET /api/instructor/students/
Authorization: Bearer <access_token>

Query Parameters:
- course: integer (filter by course ID)

Response (200):
{
  "count": 150,
  "results": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "enrolled_courses": 3,
      "completed_courses": 1,
      "total_hours": 45,
      "last_activity": "2024-01-20T15:45:00Z"
    }
  ]
}
```

---

## File Upload Endpoints

### Upload Thumbnail
```
POST /api/files/thumbnail/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- file: <image file> (JPEG, PNG, GIF, WebP, max 5MB)
- course_id: integer

Response (201):
{
  "id": 1,
  "file": "https://example.com/media/thumbnails/course_1.jpg",
  "file_type": "thumbnail",
  "file_size": 102400,
  "mime_type": "image/jpeg",
  "uploaded_by": 2,
  "course": 1,
  "created_at": "2024-01-20T15:45:00Z"
}
```

### Upload Video
```
POST /api/files/video/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- file: <video file> (MP4, WebM, OGG, QuickTime, max 500MB)
- lesson_id: integer

Response (201):
{ ... file object ... }
```

### Upload Avatar
```
POST /api/files/avatar/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

Form Data:
- file: <image file> (JPEG, PNG, GIF, WebP, max 2MB)

Response (201):
{ ... file object ... }
```

---

## Activity Tracking Endpoints

### Get User Activity
```
GET /api/activity/user-activity/
Authorization: Bearer <access_token>

Query Parameters:
- action: string (filter by action type)
- date_from: date (YYYY-MM-DD)
- date_to: date (YYYY-MM-DD)

Response (200):
{
  "count": 100,
  "results": [
    {
      "id": 1,
      "user": 1,
      "action": "course_viewed",
      "resource_type": "course",
      "resource_id": 1,
      "timestamp": "2024-01-20T15:45:00Z",
      "details": { ... }
    }
  ]
}
```

### Get User Dashboard
```
GET /api/activity/user-dashboard/
Authorization: Bearer <access_token>

Response (200):
{
  "total_activities": 150,
  "activities_today": 12,
  "activities_this_week": 45,
  "most_active_day": "Monday",
  "average_daily_activities": 21,
  "activity_breakdown": {
    "course_viewed": 50,
    "lesson_completed": 30,
    "quiz_submitted": 20
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters",
  "errors": {
    "field_name": ["Error message"]
  }
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
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Usage Examples

### Example 1: Get Featured Courses
```bash
curl -X GET "http://localhost:8000/api/courses/?featured=true&limit=6" \
  -H "Content-Type: application/json"
```

### Example 2: Search Courses
```bash
curl -X GET "http://localhost:8000/api/courses/?search=python&category=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3: Enroll in Course
```bash
curl -X POST "http://localhost:8000/api/enrollments/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course": 1}'
```

### Example 4: Get Student Dashboard
```bash
curl -X GET "http://localhost:8000/api/student/dashboard/" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5: Upload Course Thumbnail
```bash
curl -X POST "http://localhost:8000/api/files/thumbnail/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@thumbnail.jpg" \
  -F "course_id=1"
```

---

## Notes

- All endpoints require authentication except `/api/courses/` (list only) and `/api/categories/`
- JWT tokens expire after 1 hour (access token)
- Use refresh token to get new access token
- All timestamps are in UTC (ISO 8601 format)
- Pagination uses limit/offset (default limit: 10)
- Filtering is case-insensitive for text fields
