# CourseCompass LMS API Documentation

**Version:** 2.0.0  
**Base URL:** `http://localhost:8000` (Development) | `https://api.coursecompass.com` (Production)

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Course Management](#course-management)
4. [Lesson Management](#lesson-management)
5. [Enrollment & Progress](#enrollment--progress)
6. [Password Reset](#password-reset)
7. [Error Handling](#error-handling)

---

## Authentication

All authenticated endpoints require a JWT Bearer token in the Authorization header:
```
Authorization: Bearer {access_token}
```

### Register User
**POST** `/api/auth/register/`

Register a new user account.

**Request Body:**
```json
{
  "username": "string (required, unique)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "is_student": "boolean (optional, default: true)",
  "is_instructor": "boolean (optional, default: false)"
}
```

**Success Response (201 Created):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "is_student": true,
    "is_instructor": false
  }
}
```

**Error Responses:**
- **400 Bad Request:** Validation errors
  ```json
  {
    "username": ["This field is required."],
    "email": ["Enter a valid email address."],
    "password": ["This password is too short."]
  }
  ```

---

### Login
**POST** `/api/auth/login/`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "is_student": true,
    "is_instructor": false,
    "avatar": "http://localhost:8000/media/avatars/user.jpg"
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Invalid credentials
  ```json
  {
    "detail": "No active account found with the given credentials"
  }
  ```

---

### Refresh Token
**POST** `/api/auth/token/refresh/`

Refresh an expired access token.

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Success Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### Logout
**POST** `/api/auth/logout/`

Invalidate refresh token (requires authentication).

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Success Response (200 OK):**
```json
{
  "detail": "Successfully logged out."
}
```

---

## Password Reset

### Request Password Reset
**POST** `/api/auth/request-password-reset/`

Request a password reset email with token.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "detail": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- For security, always returns 200 even if email doesn't exist
- Email contains reset link: `{FRONTEND_URL}/auth/reset-password?uid={uid}&token={token}`
- Token expires in 24 hours

---

### Reset Password
**POST** `/api/auth/reset-password/`

Reset password using token from email.

**Request Body:**
```json
{
  "uid": "string (required, from email link)",
  "token": "string (required, from email link)",
  "new_password": "string (required, min 8 chars)"
}
```

**Success Response (200 OK):**
```json
{
  "detail": "Password has been reset successfully."
}
```

**Error Responses:**
- **400 Bad Request:** Invalid or expired token
  ```json
  {
    "detail": "Invalid or expired reset link."
  }
  ```
- **400 Bad Request:** Weak password
  ```json
  {
    "new_password": ["Password must be at least 8 characters long."]
  }
  ```

---

## User Management

### Get Current User Profile
**GET** `/api/user/me/`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_student": true,
  "is_instructor": false,
  "avatar": "http://localhost:8000/media/avatars/user.jpg",
  "bio": "Passionate learner",
  "phone": "+1234567890",
  "location": "New York, USA",
  "website": "https://johndoe.com",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-12-06T15:45:00Z"
}
```

---

### Update User Profile
**PATCH** `/api/user/me/`

Update authenticated user's profile.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body (all fields optional):**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Updated bio",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com"
}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

---

### Change Password
**POST** `/api/user/change-password/`

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "old_password": "string (required)",
  "new_password": "string (required, min 8 chars)"
}
```

**Success Response (200 OK):**
```json
{
  "detail": "Password changed successfully."
}
```

**Error Responses:**
- **400 Bad Request:** Incorrect old password
  ```json
  {
    "old_password": ["Current password is incorrect."]
  }
  ```

---

### Upload Avatar
**POST** `/api/user/upload-avatar/`

Upload user profile picture.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
avatar: File (required, max 5MB, image formats only)
```

**Success Response (200 OK):**
```json
{
  "detail": "Avatar uploaded successfully.",
  "avatar_url": "http://localhost:8000/media/avatars/user_123.jpg"
}
```

**Error Responses:**
- **400 Bad Request:** File too large
  ```json
  {
    "avatar": ["File size must be less than 5MB."]
  }
  ```
- **400 Bad Request:** Invalid file type
  ```json
  {
    "avatar": ["File must be an image (JPEG, PNG, GIF, or WebP)."]
  }
  ```

---

## Course Management

### List Courses
**GET** `/api/courses/`

Get list of published courses (or all courses for instructors).

**Query Parameters:**
- `search` (string): Search in title and description
- `category` (integer): Filter by category ID
- `instructorId` (integer): Filter by instructor ID
- `page` (integer): Page number for pagination
- `page_size` (integer): Items per page (default: 10)

**Success Response (200 OK):**
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/courses/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Python for Beginners",
      "description": "Learn Python from scratch",
      "instructor": {
        "id": 2,
        "username": "instructor",
        "email": "instructor@example.com"
      },
      "category": {
        "id": 1,
        "name": "Programming",
        "slug": "programming"
      },
      "thumbnail": "http://localhost:8000/media/course_thumbnails/python.jpg",
      "price": "99.99",
      "original_price": "149.99",
      "is_free": false,
      "status": "published",
      "total_lessons": 24,
      "total_enrollments": 150,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-12-06T15:45:00Z"
    }
  ]
}
```

---

### Get Course Detail
**GET** `/api/courses/{id}/`

Get detailed information about a specific course.

**Success Response (200 OK):**
```json
{
  "id": 1,
  "title": "Python for Beginners",
  "description": "Comprehensive Python course...",
  "instructor": {
    "id": 2,
    "username": "instructor",
    "email": "instructor@example.com",
    "avatar": "http://localhost:8000/media/avatars/instructor.jpg"
  },
  "category": {
    "id": 1,
    "name": "Programming",
    "slug": "programming"
  },
  "thumbnail": "http://localhost:8000/media/course_thumbnails/python.jpg",
  "price": "99.99",
  "original_price": "149.99",
  "is_free": false,
  "status": "published",
  "lessons": [
    {
      "id": 1,
      "title": "Introduction to Python",
      "order": 1,
      "video_url": "https://youtube.com/watch?v=...",
      "video_file": null,
      "content": "Welcome to Python..."
    }
  ],
  "total_lessons": 24,
  "total_enrollments": 150,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-12-06T15:45:00Z",
  "published_at": "2024-01-20T09:00:00Z"
}
```

**Error Responses:**
- **404 Not Found:** Course doesn't exist or not published
  ```json
  {
    "detail": "This course is not available."
  }
  ```

---

### Get Course with Progress
**GET** `/api/courses/{id}/with-progress/`

Get course details with student progress (requires authentication).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `studentId` (integer, optional): View specific student's progress (instructors only)

**Success Response (200 OK):**
```json
{
  "id": 5,
  "title": "Introduction to Machine Learning",
  "description": "Learn ML fundamentals...",
  "instructor": {
    "id": 1,
    "name": "instructor",
    "email": "instructor@example.com"
  },
  "thumbnail": "http://localhost:8000/media/course_thumbnails/ml.jpg",
  "price": 99.99,
  "total_lessons": 5,
  "enrolled_at": "2025-12-06T10:21:56.790441Z",
  "progress_percentage": 60,
  "completed_lessons": 3,
  "next_lesson": {
    "id": "4",
    "title": "Clustering and Dimensionality Reduction"
  },
  "lessons": [
    {
      "id": "1",
      "title": "ML Concepts and Terminology",
      "order": 1,
      "duration": "0:00",
      "completed": true,
      "completed_at": "2025-12-06T11:30:00Z",
      "video_url": null,
      "video_file": null,
      "content": "Introduction to ML..."
    },
    {
      "id": "4",
      "title": "Clustering and Dimensionality Reduction",
      "order": 4,
      "duration": "0:00",
      "completed": false,
      "completed_at": null,
      "video_url": null,
      "video_file": null,
      "content": "Learn clustering..."
    }
  ],
  "status": "published",
  "created_at": "2024-11-15T08:00:00Z",
  "updated_at": "2024-12-01T14:30:00Z",
  "is_instructor_view": false,
  "viewing_student": null
}
```

**Error Responses:**
- **403 Forbidden:** Not enrolled
  ```json
  {
    "detail": "You are not enrolled in this course."
  }
  ```

---

### Create Course
**POST** `/api/courses/`

Create a new course (instructors only).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "category": "integer (optional, category ID)",
  "price": "decimal (optional, default: 0.00)",
  "original_price": "decimal (optional)",
  "is_free": "boolean (optional, default: false)",
  "status": "string (optional: draft|published|archived, default: draft)"
}
```

**Success Response (201 Created):**
```json
{
  "id": 10,
  "title": "New Course",
  "description": "Course description",
  "instructor": {
    "id": 2,
    "username": "instructor"
  },
  "status": "draft",
  ...
}
```

---

### Publish Course
**POST** `/api/courses/{id}/publish/`

Publish a draft course (instructor only).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": 10,
  "title": "New Course",
  "status": "published",
  "published_at": "2024-12-06T16:00:00Z",
  ...
}
```

**Error Responses:**
- **403 Forbidden:** Not the course instructor
  ```json
  {
    "detail": "Only the course instructor can publish."
  }
  ```
- **400 Bad Request:** Already published
  ```json
  {
    "detail": "Course is already published."
  }
  ```

---

## Lesson Management

### List Lessons
**GET** `/api/lessons/`

Get list of lessons (filtered by course).

**Query Parameters:**
- `course_id` (integer, required): Filter by course ID

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "course": 1,
    "title": "Introduction to Python",
    "order": 1,
    "video_url": "https://youtube.com/watch?v=...",
    "video_file": null,
    "content": "Welcome to Python programming..."
  }
]
```

---

### Create Lesson
**POST** `/api/lessons/`

Create a new lesson (course instructor only).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "course": "integer (required, course ID)",
  "title": "string (required)",
  "order": "integer (required)",
  "video_url": "string (optional, URL)",
  "content": "string (optional)"
}
```

**Success Response (201 Created):**
```json
{
  "id": 25,
  "course": 1,
  "title": "New Lesson",
  "order": 25,
  "video_url": null,
  "video_file": null,
  "content": "Lesson content..."
}
```

---

### Mark Lesson Complete
**POST** `/api/lessons/{id}/mark-complete/`

Mark a lesson as completed (enrolled students only).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "detail": "Lesson marked as complete.",
  "progress": {
    "completed": true,
    "completed_at": "2024-12-06T16:30:00Z"
  },
  "course_progress": {
    "completed_lessons": 4,
    "total_lessons": 5,
    "percentage": 80,
    "course_completed": false
  }
}
```

**Error Responses:**
- **403 Forbidden:** Not enrolled
  ```json
  {
    "detail": "You must be enrolled in this course to mark lessons as complete."
  }
  ```

---

## Enrollment & Progress

### Enroll in Course
**POST** `/api/enrollments/`

Enroll current user in a course.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "course_id": "integer (required)"
}
```

**Success Response (201 Created):**
```json
{
  "id": 50,
  "student": 3,
  "course": 1,
  "enrolled_at": "2024-12-06T16:45:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Already enrolled
  ```json
  {
    "detail": "You are already enrolled in this course."
  }
  ```

---

### Check Enrollment
**GET** `/api/enrollments/check/`

Check if user is enrolled in a course.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `courseId` (integer, required): Course ID to check

**Success Response (200 OK):**
```json
{
  "is_enrolled": true
}
```

---

### Get Student Dashboard
**GET** `/api/student/dashboard/`

Get student's enrolled courses with progress.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "enrolled_courses": [
    {
      "id": 1,
      "title": "Python for Beginners",
      "description": "Learn Python...",
      "instructor": "instructor",
      "enrolled_at": "2024-11-15T10:00:00Z",
      "total_lessons": 24,
      "completed_lessons": 16,
      "progress_percentage": 67
    }
  ],
  "total_courses": 3,
  "completed_courses": 1,
  "in_progress_courses": 2,
  "total_lessons_completed": 45
}
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "detail": "Error message"
}
```

Or for validation errors:

```json
{
  "field_name": ["Error message 1", "Error message 2"]
}
```

### HTTP Status Codes

- **200 OK:** Request successful
- **201 Created:** Resource created successfully
- **400 Bad Request:** Invalid request data
- **401 Unauthorized:** Authentication required or invalid token
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **500 Internal Server Error:** Server error

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Anonymous users:** 100 requests/hour
- **Authenticated users:** 1000 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638835200
```

---

## Pagination

List endpoints support pagination with these query parameters:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)

Paginated responses include:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/courses/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Webhooks (Coming Soon)

Webhook events for:
- User registration
- Course enrollment
- Lesson completion
- Course completion
- Certificate generation

---

## Support

For API support, contact:
- **Email:** api-support@coursecompass.com
- **Documentation:** https://docs.coursecompass.com
- **Status Page:** https://status.coursecompass.com
