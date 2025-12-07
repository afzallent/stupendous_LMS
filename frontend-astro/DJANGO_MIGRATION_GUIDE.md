# Django API Migration Guide for Astro Frontend

This guide explains how the Astro frontend has been migrated from PHP/Clerk authentication to Django REST Framework with JWT authentication.

## Overview

The Astro frontend now communicates with the Django backend using:
- **Django REST Framework** for API endpoints
- **JWT (JSON Web Tokens)** for authentication
- **Django CORS Headers** for cross-origin requests

## Key Changes

### 1. Authentication System
- **Removed**: Clerk authentication
- **Added**: Django JWT authentication with access/refresh tokens
- **Token Storage**: LocalStorage for tokens, cookies for middleware

### 2. API Configuration

#### New Files Created:
- `src/config/django-api.config.ts` - Main API configuration with TypeScript
- `src/utils/django-api-client.js` - Client-side API utilities
- `src/utils/django-api-server.ts` - Server-side API utilities

#### API Endpoints Structure:
```typescript
API_ENDPOINTS = {
  auth: {
    register: '/auth/register/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    refreshToken: '/auth/token/refresh/',
  },
  user: {
    me: '/user/me/',
    changePassword: '/user/change-password/',
    uploadAvatar: '/user/upload-avatar/',
  },
  courses: {
    list: '/courses/',
    detail: (id) => `/courses/${id}/`,
    withProgress: (id) => `/courses/${id}/with-progress/`,
  },
  lessons: {
    list: '/lessons/',
    markComplete: (id) => `/lessons/${id}/mark-complete/',
  },
  enrollments: {
    create: '/enrollments/',
    check: '/enrollments/check/',
  },
  dashboard: {
    student: '/student/dashboard/',
    instructor: '/instructor/analytics/',
  },
}
```

### 3. Environment Variables

#### Old (.env):
```bash
PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
PUBLIC_API_URL=http://localhost/backend/api
```

#### New (.env):
```bash
PUBLIC_API_URL=http://localhost:8000/api
PUBLIC_FRONTEND_URL=http://localhost:4321
```

### 4. Authentication Flow

#### Login Process:
1. User submits credentials to `/api/auth/login/`
2. Django returns `access` and `refresh` tokens + user info
3. Tokens stored in LocalStorage
4. Access token also stored in cookie for middleware
5. User redirected to appropriate dashboard

#### Token Refresh:
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Automatic token refresh on 401 responses
- If refresh fails, user redirected to login

### 5. Updated Pages

#### Login Pages:
- `/login/student.astro` - Student login with Django JWT
- `/login/trainer.astro` - Instructor login with Django JWT

#### Dashboard:
- `/dashboard/student/index.astro` - Fetches data from Django API
- Stats loaded from `/api/student/dashboard/`
- Courses loaded with progress tracking

#### Courses:
- `/courses.astro` - Fetches from `/api/courses/`
- Displays Django course model fields

### 6. Middleware Changes

#### Old (Clerk):
```typescript
import { clerkMiddleware } from '@clerk/astro/server';
```

#### New (Django JWT):
```typescript
import { defineMiddleware } from 'astro:middleware';
// Checks for access_token cookie
// Redirects to login if missing
```

## Usage Examples

### Making API Calls

#### Client-Side (in Astro components with `<script>`):
```typescript
import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';

// GET request
const response = await djangoApi.get(API_ENDPOINTS.courses.list);

// POST request
const loginResponse = await djangoApi.post(API_ENDPOINTS.auth.login, {
  username: 'user',
  password: 'pass'
});

// Store tokens
if (loginResponse.success) {
  TokenManager.setTokens(loginResponse.access, loginResponse.refresh);
  TokenManager.setUser(loginResponse.user);
}
```

#### Server-Side (in Astro frontmatter):
```typescript
---
import { djangoApiServer, API_ENDPOINTS } from '../utils/django-api-server';

const courses = await djangoApiServer.get(API_ENDPOINTS.courses.list);
---
```

### Checking Authentication

```typescript
import { TokenManager } from '../config/django-api.config';

const user = TokenManager.getUser();
if (user) {
  console.log(`Logged in as: ${user.username}`);
  console.log(`Is student: ${user.is_student}`);
  console.log(`Is instructor: ${user.is_instructor}`);
}
```

### Logout

```typescript
import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';

const refreshToken = TokenManager.getRefreshToken();
await djangoApi.post(API_ENDPOINTS.auth.logout, { refresh: refreshToken });
TokenManager.clearTokens();
window.location.href = '/';
```

## Django Backend Configuration

### CORS Settings
The Django backend must allow requests from the Astro frontend:

```python
# backend/lms_project/settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4321',  # Astro dev server
    'http://127.0.0.1:4321',
]
CORS_ALLOW_CREDENTIALS = True
```

### JWT Settings
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

## Development Workflow

### Starting the Development Servers

1. **Django Backend** (Terminal 1):
```bash
cd backend
python manage.py runserver
# Runs on http://localhost:8000
```

2. **Astro Frontend** (Terminal 2):
```bash
cd frontend-astro
npm run dev
# Runs on http://localhost:4321
```

### Testing Authentication

1. Create a test user in Django:
```bash
cd backend
python manage.py createsuperuser
```

2. Or register through the API:
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "is_student": true
  }'
```

3. Login through Astro frontend:
- Navigate to http://localhost:4321/login/student
- Enter credentials
- Should redirect to dashboard

## API Response Format

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  ...
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error description"
}
```

### Django Paginated Response:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/courses/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

## Troubleshooting

### CORS Errors
- Check Django CORS_ALLOWED_ORIGINS includes Astro URL
- Verify CORS_ALLOW_CREDENTIALS = True
- Check browser console for specific CORS error

### Authentication Errors
- Check tokens in LocalStorage (DevTools > Application > Local Storage)
- Verify token hasn't expired
- Check Django logs for authentication errors
- Ensure user has correct role (is_student or is_instructor)

### API Connection Errors
- Verify Django server is running on port 8000
- Check PUBLIC_API_URL in .env matches Django URL
- Test API directly: `curl http://localhost:8000/api/courses/`

## Migration Checklist

- [x] Remove Clerk dependencies
- [x] Create Django API configuration files
- [x] Update environment variables
- [x] Create login pages for students and instructors
- [x] Update middleware for JWT authentication
- [x] Update courses page to use Django API
- [x] Update student dashboard to fetch from Django
- [ ] Update instructor dashboard
- [ ] Update course detail pages
- [ ] Update course player
- [ ] Add registration pages
- [ ] Add password reset flow
- [ ] Update all remaining pages

## Next Steps

1. **Complete Page Migrations**: Update remaining pages to use Django API
2. **Add Error Handling**: Improve error messages and user feedback
3. **Add Loading States**: Show loading indicators during API calls
4. **Implement Caching**: Cache course data to reduce API calls
5. **Add Tests**: Write tests for API integration
6. **Production Setup**: Configure for production deployment

## Resources

- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [Simple JWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Astro Documentation](https://docs.astro.build/)
- [API Documentation](../API_DOCUMENTATION.md)
