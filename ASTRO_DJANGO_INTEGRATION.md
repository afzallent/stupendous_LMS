# Astro Frontend + Django Backend Integration

## Overview

The Astro frontend (`frontend-astro/`) has been successfully configured to work with the Django REST Framework backend (`backend/`). The integration replaces the previous PHP backend and Clerk authentication with Django JWT authentication.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│   Astro Frontend    │         │   Django Backend     │
│   (Port 4321)       │◄───────►│   (Port 8000)        │
│                     │  HTTP   │                      │
│  - Pages/Routes     │  REST   │  - API Endpoints     │
│  - Components       │  API    │  - JWT Auth          │
│  - Client Scripts   │         │  - Database (PostgreSQL) │
└─────────────────────┘         └──────────────────────┘
```

## Key Components

### Frontend (Astro)
- **Framework**: Astro 5.7.2 with React components
- **Authentication**: JWT tokens (access + refresh)
- **API Client**: Custom Django API configuration
- **Port**: 4321 (development)

### Backend (Django)
- **Framework**: Django 5.2.8 + Django REST Framework
- **Authentication**: Simple JWT
- **Database**: PostgreSQL (production), SQLite (dev)
- **Port**: 8000

## Authentication Flow

```
1. User submits credentials
   ↓
2. POST /api/auth/login/
   ↓
3. Django validates & returns JWT tokens
   ↓
4. Frontend stores tokens (localStorage + cookie)
   ↓
5. Subsequent requests include Bearer token
   ↓
6. Token auto-refreshes on expiration
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login and get tokens
- `POST /api/auth/logout/` - Logout (blacklist refresh token)
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/auth/request-password-reset/` - Request password reset
- `POST /api/auth/reset-password/` - Reset password with token

### User Management
- `GET /api/user/me/` - Get current user profile
- `PATCH /api/user/me/` - Update user profile
- `POST /api/user/change-password/` - Change password
- `POST /api/user/upload-avatar/` - Upload profile picture

### Courses
- `GET /api/courses/` - List all published courses
- `POST /api/courses/` - Create course (instructors only)
- `GET /api/courses/{id}/` - Get course details
- `GET /api/courses/{id}/with-progress/` - Get course with student progress
- `POST /api/courses/{id}/publish/` - Publish course

### Lessons
- `GET /api/lessons/?course_id={id}` - List lessons for a course
- `POST /api/lessons/` - Create lesson (instructor only)
- `POST /api/lessons/{id}/mark-complete/` - Mark lesson as completed

### Enrollments
- `POST /api/enrollments/` - Enroll in course
- `GET /api/enrollments/check/?courseId={id}` - Check enrollment status

### Dashboards
- `GET /api/student/dashboard/` - Student dashboard data
- `GET /api/instructor/analytics/` - Instructor analytics

## File Structure

```
project-root/
├── backend/                          # Django backend
│   ├── lms_project/
│   │   ├── settings.py              # CORS configured for Astro
│   │   └── urls.py
│   ├── core/                        # User authentication
│   ├── courses/                     # Course management
│   └── manage.py
│
├── frontend-astro/                  # Astro frontend
│   ├── src/
│   │   ├── config/
│   │   │   └── django-api.config.ts # API configuration
│   │   ├── utils/
│   │   │   ├── django-api-client.js # Client-side utilities
│   │   │   └── django-api-server.ts # Server-side utilities
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   │   ├── student.astro
│   │   │   │   └── trainer.astro
│   │   │   ├── dashboard/
│   │   │   │   └── student/
│   │   │   └── courses.astro
│   │   └── middleware.ts            # JWT authentication
│   ├── .env                         # Environment config
│   ├── QUICK_START.md              # Quick start guide
│   ├── DJANGO_MIGRATION_GUIDE.md   # Detailed migration guide
│   └── MIGRATION_SUMMARY.md        # Migration summary
│
└── ASTRO_DJANGO_INTEGRATION.md     # This file
```

## Configuration

### Backend Configuration

**`backend/.env`**:
```bash
# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=your_host
DB_PORT=5432

# Django
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS - Include Astro frontend
CORS_ALLOWED_ORIGINS=http://localhost:4321,http://127.0.0.1:4321
```

**`backend/lms_project/settings.py`**:
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:4321',
    'http://127.0.0.1:4321',
]
CORS_ALLOW_CREDENTIALS = True
```

### Frontend Configuration

**`frontend-astro/.env`**:
```bash
PUBLIC_API_URL=http://localhost:8000/api
PUBLIC_FRONTEND_URL=http://localhost:4321
```

## Development Workflow

### Starting Both Servers

**Terminal 1 - Django Backend**:
```bash
cd backend
python manage.py runserver
# Runs on http://localhost:8000
```

**Terminal 2 - Astro Frontend**:
```bash
cd frontend-astro
npm run dev
# Runs on http://localhost:4321
```

### Creating Test Data

```bash
cd backend

# Create superuser
python manage.py createsuperuser

# Or create users programmatically
python manage.py shell
>>> from core.models import User
>>> student = User.objects.create_user(
...     username='student1',
...     email='student@example.com',
...     password='testpass123',
...     is_student=True
... )
>>> instructor = User.objects.create_user(
...     username='instructor1',
...     email='instructor@example.com',
...     password='testpass123',
...     is_instructor=True
... )
```

## Usage Examples

### Making API Calls (Client-Side)

```typescript
// In Astro component <script> tag
import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';

// Login
const loginResponse = await djangoApi.post(API_ENDPOINTS.auth.login, {
  username: 'student1',
  password: 'testpass123'
});

if (loginResponse.success) {
  TokenManager.setTokens(loginResponse.access, loginResponse.refresh);
  TokenManager.setUser(loginResponse.user);
  window.location.href = '/dashboard/student';
}

// Fetch courses
const coursesResponse = await djangoApi.get(API_ENDPOINTS.courses.list);
if (coursesResponse.success) {
  const courses = coursesResponse.results || coursesResponse.data;
  console.log(courses);
}

// Enroll in course
const enrollResponse = await djangoApi.post(API_ENDPOINTS.enrollments.create, {
  course_id: 1
});
```

### Making API Calls (Server-Side)

```typescript
---
// In Astro frontmatter
import { djangoApiServer, API_ENDPOINTS } from '../utils/django-api-server';

const coursesResponse = await djangoApiServer.get(API_ENDPOINTS.courses.list);
const courses = coursesResponse.results || coursesResponse.data || [];
---

<div>
  {courses.map(course => (
    <div>{course.title}</div>
  ))}
</div>
```

## Security Considerations

### Token Management
- **Access tokens**: 15-minute lifetime, stored in localStorage and cookie
- **Refresh tokens**: 7-day lifetime, stored in localStorage only
- **Auto-refresh**: Automatic token refresh on 401 responses
- **Logout**: Blacklists refresh token on Django backend

### CORS
- Only allows requests from configured origins
- Credentials (cookies) allowed for authentication
- Preflight requests handled automatically

### CSRF
- Not needed for JWT authentication
- Django CSRF disabled for API endpoints
- JWT tokens provide authentication

## Testing

### Manual Testing

1. **Test Course Listing**:
   - Visit http://localhost:4321/courses
   - Should see courses from Django database

2. **Test Student Login**:
   - Visit http://localhost:4321/login/student
   - Login with student credentials
   - Should redirect to dashboard

3. **Test API Directly**:
   ```bash
   # Get courses
   curl http://localhost:8000/api/courses/
   
   # Login
   curl -X POST http://localhost:8000/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"username":"student1","password":"testpass123"}'
   ```

### Automated Testing
```bash
# Django backend tests
cd backend
python manage.py test

# Frontend tests (if configured)
cd frontend-astro
npm test
```

## Troubleshooting

### Common Issues

1. **CORS Error**
   - Check `CORS_ALLOWED_ORIGINS` in Django settings
   - Restart Django server after changes
   - Clear browser cache

2. **Authentication Error**
   - Check tokens in localStorage (DevTools → Application)
   - Verify token hasn't expired
   - Try logging in again

3. **Connection Refused**
   - Verify Django is running on port 8000
   - Check firewall settings
   - Test with curl: `curl http://localhost:8000/api/courses/`

4. **Module Not Found**
   - Run `npm install` in frontend-astro
   - Check import paths are correct
   - Restart Astro dev server

## Migration Status

### ✅ Completed
- Django API configuration files
- JWT authentication system
- Student and instructor login pages
- Course listing page
- Student dashboard (partial)
- Middleware for route protection
- CORS configuration
- Documentation

### 🚧 In Progress
- Student dashboard (full functionality)
- Course detail pages
- Course player

### ⏳ Pending
- Instructor dashboard
- Registration pages
- Password reset flow
- Course enrollment flow
- Lesson completion tracking
- Profile management
- Remove Clerk dependencies completely

## Next Steps

1. **Remove Clerk**: `npm uninstall @clerk/astro @clerk/clerk-react`
2. **Update remaining pages**: Course detail, player, instructor dashboard
3. **Add registration**: Student and instructor registration pages
4. **Test thoroughly**: All authentication and API flows
5. **Deploy**: Configure for production environment

## Resources

- **Quick Start**: `frontend-astro/QUICK_START.md`
- **Migration Guide**: `frontend-astro/DJANGO_MIGRATION_GUIDE.md`
- **API Documentation**: `API_DOCUMENTATION.md`
- **Django Docs**: https://docs.djangoproject.com/
- **DRF Docs**: https://www.django-rest-framework.org/
- **Astro Docs**: https://docs.astro.build/

## Support

For issues or questions:
1. Check Django logs: `backend/logs/lms.log`
2. Check browser console for errors
3. Review Network tab in DevTools
4. Test API endpoints directly with curl
5. Verify environment variables are set correctly
