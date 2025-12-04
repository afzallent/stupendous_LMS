# Frontend-Django Integration Plan

## Problem Statement
The Next.js frontend is currently using:
- Next.js API routes (`/api/*`) with Prisma ORM
- Local SQLite database via Prisma
- Completely bypassing the Django REST API backend

The Django backend has:
- Django REST Framework endpoints (`/api/courses/`, `/api/student/dashboard/`, etc.)
- SQLite database via Django ORM
- JWT authentication with djangorestframework-simplejwt

## Solution Overview
Replace Next.js API routes with direct calls to Django REST API endpoints.

## Implementation Steps

### 1. Create Django API Client
**File**: `frontend/src/lib/django-api-client.ts`
- Centralized API client for all Django backend calls
- Handle JWT token management (access + refresh)
- Automatic token refresh on 401 errors
- Base URL configuration for Django backend

### 2. Update Authentication Flow
**Files**: 
- `frontend/src/lib/auth.tsx` - Update to use Django JWT endpoints
- `frontend/src/app/auth/login/page.tsx` - Call Django login API
- `frontend/src/app/auth/register/page.tsx` - Call Django register API

**Django Endpoints**:
- POST `/api/auth/login/` - Returns JWT tokens
- POST `/api/auth/register/` - Creates user account
- POST `/api/auth/token/refresh/` - Refreshes access token
- GET `/api/auth/me/` - Get current user profile

### 3. Update Home Page
**File**: `frontend/src/app/page.tsx`

**Replace**:
- `/api/featured-courses` → `/api/courses/?featured=true`
- `/api/categories` → `/api/categories/`
- `/api/stats` → `/api/courses/stats/`

### 4. Update Courses Page
**File**: `frontend/src/app/courses/page.tsx`

**Replace**:
- `/api/courses?search=...` → `/api/courses/?search=...&category=...&level=...`

### 5. Update Student Dashboard
**File**: `frontend/src/app/learn/page.tsx`

**Replace**:
- `/api/student/dashboard?userId=...` → `/api/student/dashboard/`
  (Django will get user from JWT token)

### 6. Update Instructor Dashboard
**File**: `frontend/src/app/instructor/page.tsx`

**Replace**:
- Next.js API routes → Django instructor endpoints
- `/api/instructor/analytics/`
- `/api/instructor/activity/`
- `/api/instructor/students/`

### 7. Remove Next.js API Routes
**Delete**:
- `frontend/src/app/api/` directory (all Next.js API routes)
- `frontend/prisma/` directory (Prisma schema and migrations)
- `frontend/src/lib/db.ts` (Prisma client)

### 8. Environment Configuration
**File**: `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Django Backend Endpoints (Already Implemented)

### Authentication
- POST `/api/auth/login/` - Login with email/password
- POST `/api/auth/register/` - Register new user
- POST `/api/auth/token/refresh/` - Refresh JWT token
- GET `/api/auth/me/` - Get current user

### Courses
- GET `/api/courses/` - List courses (with filters)
- GET `/api/courses/{id}/` - Course detail
- POST `/api/courses/` - Create course (instructor only)
- PUT `/api/courses/{id}/` - Update course
- DELETE `/api/courses/{id}/` - Delete course

### Enrollments
- GET `/api/enrollments/` - List user enrollments
- POST `/api/enrollments/` - Enroll in course
- GET `/api/enrollments/{id}/` - Enrollment detail

### Student
- GET `/api/student/dashboard/` - Student dashboard data

### Instructor
- GET `/api/instructor/analytics/` - Instructor analytics
- GET `/api/instructor/activity/` - Recent activity
- GET `/api/instructor/students/` - Student list

### Categories
- GET `/api/categories/` - List categories

## Data Model Mapping

### User (Django) → User (Frontend)
```typescript
{
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'TRAINER' | 'ADMIN'
  // Maps from Django: is_student, is_instructor, is_staff
}
```

### Course (Django) → Course (Frontend)
```typescript
{
  id: string
  title: string
  description: string
  instructor: string
  rating: number
  students: number
  price: number
  level: string
  category: string
  featured: boolean
}
```

## Testing Plan

1. **Authentication Flow**
   - Register new user
   - Login with credentials
   - Token refresh on expiry
   - Logout

2. **Home Page**
   - Featured courses display
   - Categories display
   - Stats display

3. **Courses Page**
   - Course listing
   - Search functionality
   - Filters (category, level, price)
   - Sorting

4. **Student Dashboard**
   - Enrolled courses
   - Progress tracking
   - Continue learning

5. **Instructor Dashboard**
   - Course management
   - Student analytics
   - Activity tracking

## Migration Strategy

1. **Phase 1**: Create Django API client
2. **Phase 2**: Update authentication
3. **Phase 3**: Update home page
4. **Phase 4**: Update courses page
5. **Phase 5**: Update student dashboard
6. **Phase 6**: Update instructor dashboard
7. **Phase 7**: Remove Next.js API routes and Prisma
8. **Phase 8**: End-to-end testing

## Benefits

1. **Single Source of Truth**: Django database is the only database
2. **Consistent API**: All features use Django REST API
3. **Proper Authentication**: JWT tokens managed by Django
4. **Activity Tracking**: All API calls go through Django middleware
5. **Simplified Architecture**: No duplicate database/ORM logic
