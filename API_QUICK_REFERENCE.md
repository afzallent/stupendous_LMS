# CourseCompass LMS API - Quick Reference

## Base URL
```
Development: http://localhost:8000
Production: https://api.coursecompass.com
```

## Authentication
```
Authorization: Bearer {access_token}
```

---

## Quick Links
- **Full Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **OpenAPI Spec:** [openapi_v2.yaml](./openapi_v2.yaml)
- **Postman Collection:** Import `openapi_v2.yaml` into Postman

---

## Common Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register/` | Register new user | No |
| POST | `/api/auth/login/` | Login user | No |
| POST | `/api/auth/token/refresh/` | Refresh access token | No |
| POST | `/api/auth/logout/` | Logout user | Yes |
| POST | `/api/auth/request-password-reset/` | Request password reset | No |
| POST | `/api/auth/reset-password/` | Reset password with token | No |

### User Profile
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/me/` | Get current user profile | Yes |
| PATCH | `/api/user/me/` | Update user profile | Yes |
| POST | `/api/user/change-password/` | Change password | Yes |
| POST | `/api/user/upload-avatar/` | Upload profile picture | Yes |

### Courses
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/courses/` | List all courses | No |
| GET | `/api/courses/{id}/` | Get course details | No |
| GET | `/api/courses/{id}/with-progress/` | Get course with progress | Yes |
| POST | `/api/courses/` | Create course | Yes (Instructor) |
| PUT | `/api/courses/{id}/` | Update course | Yes (Owner) |
| DELETE | `/api/courses/{id}/` | Delete course | Yes (Owner) |
| POST | `/api/courses/{id}/publish/` | Publish course | Yes (Owner) |
| POST | `/api/courses/{id}/unpublish/` | Unpublish course | Yes (Owner) |

### Lessons
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/lessons/?course_id={id}` | List course lessons | Yes |
| POST | `/api/lessons/` | Create lesson | Yes (Instructor) |
| PUT | `/api/lessons/{id}/` | Update lesson | Yes (Owner) |
| DELETE | `/api/lessons/{id}/` | Delete lesson | Yes (Owner) |
| POST | `/api/lessons/{id}/mark-complete/` | Mark lesson complete | Yes (Student) |

### Enrollments
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/enrollments/` | Enroll in course | Yes |
| GET | `/api/enrollments/check/?courseId={id}` | Check enrollment | Yes |
| GET | `/api/enrollments/my-enrollments/` | Get my enrollments | Yes |

### Dashboard
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/student/dashboard/` | Student dashboard | Yes (Student) |
| GET | `/api/instructor/analytics/` | Instructor analytics | Yes (Instructor) |

---

## Request Examples

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "is_student": true
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123"
  }'
```

### Get Courses
```bash
curl -X GET "http://localhost:8000/api/courses/?page=1&page_size=10"
```

### Get Course with Progress
```bash
curl -X GET http://localhost:8000/api/courses/5/with-progress/ \
  -H "Authorization: Bearer {access_token}"
```

### Enroll in Course
```bash
curl -X POST http://localhost:8000/api/enrollments/ \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 5
  }'
```

### Mark Lesson Complete
```bash
curl -X POST http://localhost:8000/api/lessons/1/mark-complete/ \
  -H "Authorization: Bearer {access_token}"
```

### Request Password Reset
```bash
curl -X POST http://localhost:8000/api/auth/request-password-reset/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

## Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

---

## Common Response Formats

### Success Response
```json
{
  "id": 1,
  "title": "Course Title",
  "description": "Course description",
  ...
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

### Validation Error
```json
{
  "field_name": ["Error message 1", "Error message 2"]
}
```

### Paginated Response
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/courses/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Testing with Postman

1. Import `openapi_v2.yaml` into Postman
2. Set environment variable `baseUrl` to `http://localhost:8000`
3. After login, set `accessToken` variable with the returned token
4. Postman will automatically add `Authorization: Bearer {{accessToken}}` header

---

## Testing with cURL

### Set Token Variable
```bash
export ACCESS_TOKEN="your_access_token_here"
```

### Use in Requests
```bash
curl -X GET http://localhost:8000/api/user/me/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Rate Limits

- **Anonymous:** 100 requests/hour
- **Authenticated:** 1000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638835200
```

---

## Pagination

Query parameters:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)

Example:
```
GET /api/courses/?page=2&page_size=20
```

---

## Filtering & Search

### Courses
```
GET /api/courses/?search=python&category=1&instructorId=2
```

### Lessons
```
GET /api/lessons/?course_id=5
```

---

## Mobile App Integration

### Recommended Flow

1. **Authentication**
   - Register/Login → Store tokens securely
   - Use refresh token to get new access token when expired

2. **Course Browsing**
   - List courses → Show in grid/list
   - Get course details → Show course page
   - Check enrollment → Show "Enroll" or "Continue Learning" button

3. **Learning**
   - Get course with progress → Show progress bar
   - Mark lesson complete → Update UI
   - Track progress → Show completion percentage

4. **Profile**
   - Get user profile → Show profile page
   - Update profile → Allow editing
   - Upload avatar → Image picker

### Token Management
```javascript
// Store tokens
localStorage.setItem('access_token', response.access);
localStorage.setItem('refresh_token', response.refresh);

// Refresh token when expired
if (error.status === 401) {
  const newToken = await refreshAccessToken();
  // Retry original request
}
```

---

## Support

- **Email:** api-support@coursecompass.com
- **Documentation:** https://docs.coursecompass.com
- **Issues:** https://github.com/coursecompass/lms/issues
