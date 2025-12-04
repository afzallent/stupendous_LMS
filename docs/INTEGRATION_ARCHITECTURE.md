# Frontend-Backend Integration Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                      │
│                         (Next.js + Django)                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                             │
│                      (http://localhost:3000)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Home Page   │  │ Courses Page │  │ Learn Page   │             │
│  │  page.tsx    │  │  page.tsx    │  │  page.tsx    │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                      │
│                            │                                         │
│                            ▼                                         │
│  ┌─────────────────────────────────────────────────────┐            │
│  │         Django API Client                           │            │
│  │         (django-api-client.ts)                      │            │
│  │  • JWT Token Management                             │            │
│  │  • Automatic Token Refresh                          │            │
│  │  • HTTP Methods (GET, POST, PUT, DELETE)            │            │
│  │  • Error Handling                                   │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                        │                                             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         │ Authorization: Bearer <JWT>
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Django Backend                               │
│                      (http://localhost:8000)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────┐            │
│  │         Django REST Framework                       │            │
│  │         (API Endpoints)                             │            │
│  ├─────────────────────────────────────────────────────┤            │
│  │  Authentication                                     │            │
│  │  • POST /api/auth/register/                         │            │
│  │  • POST /api/auth/login/                            │            │
│  │  • POST /api/auth/token/refresh/                    │            │
│  │  • GET  /api/auth/me/                               │            │
│  ├─────────────────────────────────────────────────────┤            │
│  │  Courses                                            │            │
│  │  • GET  /api/courses/                               │            │
│  │  • GET  /api/courses/{id}/                          │            │
│  │  • POST /api/courses/                               │            │
│  ├─────────────────────────────────────────────────────┤            │
│  │  Student                                            │            │
│  │  • GET  /api/student/dashboard/                     │            │
│  ├─────────────────────────────────────────────────────┤            │
│  │  Instructor                                         │            │
│  │  • GET  /api/instructor/analytics/                  │            │
│  │  • GET  /api/instructor/activity/                   │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                        │                                             │
│                        ▼                                             │
│  ┌─────────────────────────────────────────────────────┐            │
│  │         Activity Tracking Middleware                │            │
│  │  • Intercepts all API requests                      │            │
│  │  • Records user actions                             │            │
│  │  • Stores in Activity model                         │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                        │                                             │
│                        ▼                                             │
│  ┌─────────────────────────────────────────────────────┐            │
│  │         Django ORM                                  │            │
│  │  • User Model                                       │            │
│  │  • Course Model                                     │            │
│  │  • Enrollment Model                                 │            │
│  │  • Progress Model                                   │            │
│  │  • Activity Model                                   │            │
│  └─────────────────────┬───────────────────────────────┘            │
│                        │                                             │
│                        ▼                                             │
│  ┌─────────────────────────────────────────────────────┐            │
│  │         SQLite Database                             │            │
│  │         (db.sqlite3)                                │            │
│  │  • Users                                            │            │
│  │  • Courses                                          │            │
│  │  • Lessons                                          │            │
│  │  • Enrollments                                      │            │
│  │  • Progress                                         │            │
│  │  • Activities                                       │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Example

### Example: Student Views Dashboard

```
1. User navigates to /learn
   ↓
2. Frontend checks localStorage for JWT token
   ↓
3. Frontend calls Django API:
   GET http://localhost:8000/api/student/dashboard/
   Headers: {
     Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
   }
   ↓
4. Django receives request
   ↓
5. JWT middleware validates token
   ↓
6. Activity middleware records "view_dashboard" action
   ↓
7. View function queries database:
   - Get user from token
   - Get enrolled courses
   - Calculate progress
   ↓
8. Django returns JSON response:
   {
     enrolled_courses: [...],
     total_courses: 3,
     completed_courses: 1,
     ...
   }
   ↓
9. Frontend receives response
   ↓
10. Frontend maps Django data to UI format
   ↓
11. UI displays dashboard with enrolled courses
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Login Flow                                   │
└─────────────────────────────────────────────────────────────────────┘

1. User enters email/password
   ↓
2. Frontend calls djangoApi.login(email, password)
   ↓
3. Django API Client sends:
   POST /api/auth/login/
   Body: { email, password }
   ↓
4. Django validates credentials
   ↓
5. Django generates JWT tokens:
   - Access Token (15 min lifetime)
   - Refresh Token (7 days lifetime)
   ↓
6. Django returns:
   {
     access: "eyJ0eXAiOiJKV1QiLCJhbGc...",
     refresh: "eyJ0eXAiOiJKV1QiLCJhbGc...",
     user: { id, email, name, is_student, is_instructor }
   }
   ↓
7. Django API Client stores tokens in localStorage:
   - access_token
   - refresh_token
   - user
   ↓
8. Frontend redirects to dashboard
```

---

## Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Automatic Token Refresh                           │
└─────────────────────────────────────────────────────────────────────┘

1. Frontend makes API request with expired access token
   ↓
2. Django returns 401 Unauthorized
   ↓
3. Django API Client detects 401
   ↓
4. Django API Client automatically calls:
   POST /api/auth/token/refresh/
   Body: { refresh: "eyJ0eXAiOiJKV1QiLCJhbGc..." }
   ↓
5. Django validates refresh token
   ↓
6. Django returns new access token:
   { access: "eyJ0eXAiOiJKV1QiLCJhbGc..." }
   ↓
7. Django API Client updates localStorage
   ↓
8. Django API Client retries original request with new token
   ↓
9. Request succeeds
   ↓
10. User never notices the token refresh
```

---

## Activity Tracking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Activity Tracking                                 │
└─────────────────────────────────────────────────────────────────────┘

1. User performs action (e.g., views course)
   ↓
2. Frontend calls Django API:
   GET /api/courses/123/
   ↓
3. Request passes through Activity Middleware
   ↓
4. Middleware extracts:
   - User (from JWT token)
   - Action type (from URL pattern)
   - Timestamp
   - IP address
   - User agent
   ↓
5. Middleware creates Activity record:
   Activity.objects.create(
     user=user,
     action_type='view_course',
     course_id=123,
     timestamp=now(),
     ip_address='127.0.0.1',
     user_agent='Mozilla/5.0...'
   )
   ↓
6. Request continues to view function
   ↓
7. View returns course data
   ↓
8. Activity is now recorded in database
   ↓
9. Can be used for analytics:
   - User engagement metrics
   - Learning patterns
   - Course popularity
   - Student progress tracking
```

---

## Data Mapping

### Django Course → Frontend Course

```typescript
// Django Response
{
  id: 1,
  title: "Python for Beginners",
  description: "Learn Python from scratch",
  instructor: {
    id: 1,
    username: "instructor1",
    email: "instructor@test.com"
  },
  category: {
    id: 1,
    name: "Programming",
    slug: "programming"
  },
  enrolled_count: 25,
  lesson_count: 10,
  created_at: "2024-12-04T10:00:00Z"
}

// Frontend Format
{
  id: "1",
  title: "Python for Beginners",
  description: "Learn Python from scratch",
  instructor: "instructor1",
  category: "Programming",
  students: 25,
  lectures: 10,
  rating: 4.5,  // Default (not in Django yet)
  price: 49.99, // Default (not in Django yet)
  level: "Beginner" // Default (not in Django yet)
}
```

---

## Environment Configuration

### Development
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (settings.py)
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']
```

### Production (Future)
```bash
# Frontend (.env.production)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Backend (settings.py)
DEBUG = False
ALLOWED_HOSTS = ['api.yourdomain.com']
CORS_ALLOWED_ORIGINS = ['https://yourdomain.com']
```

---

## Security Features

### 1. JWT Authentication
- ✅ Access tokens expire after 15 minutes
- ✅ Refresh tokens expire after 7 days
- ✅ Tokens stored in localStorage (client-side)
- ✅ Automatic token refresh on expiry

### 2. CORS Protection
- ✅ Only allows requests from Next.js origin
- ✅ Configured in Django settings
- ✅ Prevents unauthorized API access

### 3. Authorization
- ✅ JWT token required for protected endpoints
- ✅ User role checked for instructor-only actions
- ✅ User ID extracted from token (can't be spoofed)

### 4. Activity Tracking
- ✅ All API calls logged
- ✅ IP address and user agent recorded
- ✅ Can detect suspicious activity

---

## Performance Considerations

### 1. Token Management
- Access tokens cached in localStorage
- Refresh only when needed (on 401)
- No unnecessary API calls

### 2. Data Fetching
- Pagination supported by Django API
- Filters applied server-side
- Only fetch what's needed

### 3. Caching (Future Enhancement)
- Add Redis for API response caching
- Cache frequently accessed data
- Reduce database queries

---

## Monitoring & Debugging

### Frontend Debugging
```javascript
// Browser Console
localStorage.getItem('access_token')  // Check JWT token
localStorage.getItem('user')          // Check user data

// Network Tab
// Filter by: localhost:8000
// Check request headers for Authorization
```

### Backend Debugging
```bash
# Django Shell
python manage.py shell

# Check activities
from activity.models import Activity
Activity.objects.all()

# Check users
from core.models import User
User.objects.all()

# Check courses
from courses.models import Course
Course.objects.all()
```

---

## Scalability Path

### Current (Development)
- SQLite database
- Single Django server
- Single Next.js server

### Future (Production)
- PostgreSQL database
- Multiple Django servers (load balanced)
- CDN for Next.js static assets
- Redis for caching
- Celery for background tasks

---

**Last Updated**: December 4, 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
