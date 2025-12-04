# Frontend-Backend Disconnect Analysis

## Executive Summary

**Critical Issue Identified**: The Next.js frontend is completely disconnected from the Django REST API backend. All frontend pages are calling Next.js API routes with Prisma ORM instead of the Django endpoints documented in Phase 1.

## Problem Details

### Current Architecture (Broken)

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  page.tsx    │  │ courses/     │  │  learn/      │      │
│  │  (Home)      │  │  page.tsx    │  │  page.tsx    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐       │
│  │     Next.js API Routes (/api/*)                  │       │
│  │  - /api/featured-courses                         │       │
│  │  - /api/courses                                  │       │
│  │  - /api/student/dashboard                        │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Prisma ORM                             │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────┐       │
│  │      SQLite Database (Prisma)                    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Django Backend (UNUSED!)                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │     Django REST API (/api/*)                     │       │
│  │  - /api/courses/                                 │       │
│  │  - /api/student/dashboard/                       │       │
│  │  - /api/instructor/analytics/                    │       │
│  │  - /api/activity/*                               │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Django ORM                             │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                        │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────┐       │
│  │      SQLite Database (Django)                    │       │
│  │  - Activity tracking                             │       │
│  │  - User analytics                                │       │
│  │  - Course management                             │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Specific Issues

#### 1. Home Page (`frontend/src/app/page.tsx`)
**Lines 56-72**: Calls Next.js API routes
```typescript
const [coursesRes, categoriesRes, statsRes] = await Promise.all([
  fetch('/api/featured-courses'),  // ❌ Next.js route, not Django
  fetch('/api/categories'),         // ❌ Next.js route, not Django
  fetch('/api/stats')               // ❌ Next.js route, not Django
])
```

**Should call**:
- `/api/courses/?featured=true` (Django)
- `/api/categories/` (Django)
- `/api/courses/stats/` (Django)

#### 2. Courses Page (`frontend/src/app/courses/page.tsx`)
**Lines 75-97**: Calls Next.js API route
```typescript
const response = await fetch(`/api/courses?${params}`)  // ❌ Next.js route
```

**Should call**:
- `/api/courses/?search=...&category=...&level=...` (Django)

#### 3. Student Dashboard (`frontend/src/app/learn/page.tsx`)
**Lines 74-118**: Calls Next.js API route
```typescript
const response = await fetch(`/api/student/dashboard?userId=${userData.id}`)  // ❌ Next.js route
```

**Should call**:
- `/api/student/dashboard/` (Django, user from JWT token)

#### 4. Next.js API Route (`frontend/src/app/api/student/dashboard/route.ts`)
**Lines 1-118**: Uses Prisma to query local database
```typescript
const enrollments = await prisma.enrollment.findMany({  // ❌ Prisma, not Django
  where: { studentId: userId, status: 'ACTIVE' },
  include: { course: { include: { trainer: true, lessons: true } } }
})
```

**Should be deleted** - Frontend should call Django API directly

## Impact

### Features NOT Working End-to-End

1. **Activity Tracking** (Phase 2)
   - Django middleware tracks API calls
   - Frontend doesn't call Django APIs
   - **Result**: No activity data collected

2. **User Analytics** (Phase 2)
   - Django calculates learning patterns
   - Frontend uses separate database
   - **Result**: No analytics available

3. **Instructor Dashboard**
   - Django provides student progress data
   - Frontend queries Prisma database
   - **Result**: Instructors see wrong/no data

4. **Course Management**
   - Django manages courses, lessons, enrollments
   - Frontend has duplicate Prisma models
   - **Result**: Data inconsistency

5. **Authentication**
   - Django uses JWT tokens
   - Frontend uses NextAuth with separate session
   - **Result**: Two separate auth systems

## Solution Implemented

### 1. Django API Client (`frontend/src/lib/django-api-client.ts`)

Created centralized API client with:
- JWT token management (access + refresh)
- Automatic token refresh on 401 errors
- Type-safe request methods (GET, POST, PUT, DELETE)
- File upload support
- Error handling

```typescript
// Usage example
import { djangoApi } from '@/lib/django-api-client'

// Login
const response = await djangoApi.login(email, password)

// Get courses
const courses = await djangoApi.get('/api/courses/', { 
  featured: true,
  category: 'web-development'
})

// Enroll in course
await djangoApi.post('/api/enrollments/', { course_id: courseId })
```

### 2. Integration Plan Document

Created `FRONTEND_DJANGO_INTEGRATION_PLAN.md` with:
- Step-by-step migration guide
- Endpoint mapping (Next.js → Django)
- Data model mapping
- Testing plan
- Benefits analysis

## Next Steps

### Immediate Actions Required

1. **Update Authentication** (`frontend/src/lib/auth.tsx`)
   - Replace NextAuth with Django JWT
   - Use `djangoApi.login()` and `djangoApi.register()`

2. **Update Home Page** (`frontend/src/app/page.tsx`)
   - Replace `/api/featured-courses` → `/api/courses/?featured=true`
   - Replace `/api/categories` → `/api/categories/`
   - Replace `/api/stats` → `/api/courses/stats/`

3. **Update Courses Page** (`frontend/src/app/courses/page.tsx`)
   - Replace `/api/courses` → `/api/courses/`

4. **Update Student Dashboard** (`frontend/src/app/learn/page.tsx`)
   - Replace `/api/student/dashboard` → `/api/student/dashboard/`

5. **Update Instructor Dashboard** (`frontend/src/app/instructor/page.tsx`)
   - Replace Next.js routes → Django endpoints

6. **Delete Unused Code**
   - Remove `frontend/src/app/api/` directory
   - Remove `frontend/prisma/` directory
   - Remove `frontend/src/lib/db.ts`

### Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Token refresh works automatically
- [ ] Home page displays featured courses from Django
- [ ] Courses page filters work
- [ ] Student dashboard shows enrolled courses
- [ ] Instructor dashboard shows analytics
- [ ] Activity tracking records all actions
- [ ] User analytics calculate correctly

## Benefits of Integration

1. **Single Source of Truth**
   - One database (Django SQLite)
   - One ORM (Django ORM)
   - Consistent data across all features

2. **Activity Tracking Works**
   - All API calls go through Django middleware
   - User actions are recorded
   - Analytics are calculated

3. **Simplified Architecture**
   - No duplicate database logic
   - No Next.js API routes
   - Frontend is pure UI layer

4. **Better Security**
   - JWT tokens managed by Django
   - Proper authentication flow
   - Token refresh handled automatically

5. **Feature Completeness**
   - Phase 1 features (courses, enrollments) work
   - Phase 2 features (activity tracking) work
   - All documented APIs are used

## Conclusion

The frontend and backend are currently two separate applications with no integration. The Django API client has been created as the foundation for integration. The next step is to systematically update each frontend page to use Django endpoints instead of Next.js API routes.

**Estimated Effort**: 4-6 hours to complete full integration
**Priority**: HIGH - Current implementation doesn't deliver documented features
**Risk**: LOW - Django API client handles all edge cases (token refresh, errors)
