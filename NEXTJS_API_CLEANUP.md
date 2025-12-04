# Next.js API Cleanup - Fixing Frontend/Backend Interference

## Problem Identified
The frontend has many fetch calls to `/api/*` routes (old Next.js API routes), but:
1. No Next.js API route handlers exist in `frontend/src/app/api/`
2. These calls should go directly to Django backend
3. Some pages use `django-api-client.ts` correctly, others don't

## Files with Old API Calls

### Critical Files (Need Immediate Fix):
1. `frontend/src/app/profile/page.tsx` - Uses `/api/profile/*` and `/api/upload/avatar`
2. `frontend/src/app/instructor/create-course/page.tsx` - Uses `/api/upload/*` and `/api/courses/*`
3. `frontend/src/app/instructor/page.tsx` - Uses `/api/auth/logout`
4. `frontend/src/app/learn/[courseId]/[lessonId]/page.tsx` - Uses `/api/student/progress`
5. `frontend/src/app/instructor/quiz/create/page.tsx` - Uses `/api/instructor/quiz/create`
6. `frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx` - Uses `/api/student/quiz/submit`
7. `frontend/src/app/instructor/question-bank/page.tsx` - Uses `/api/instructor/*`
8. `frontend/src/app/learn/[courseId]/page.tsx` - Uses `/api/certificates`
9. `frontend/src/app/checkout/*.tsx` - Uses `/api/checkout/*` and `/api/enrollments/*`
10. `frontend/src/app/auth/signup/page.tsx` - Uses `/api/auth/signup`
11. `frontend/src/app/auth/login/page.tsx` - Uses `/api/admin/sso-providers` and `/api/auth/signup`
12. `frontend/src/app/admin/*.tsx` - Uses various `/api/admin/*` endpoints

## Solution Strategy

### Phase 1: Update Auth-Related Files
- Remove `/api/auth/*` calls
- Use `djangoApi.login()`, `djangoApi.register()`, `djangoApi.logout()`

### Phase 2: Update Upload Endpoints
- Change `/api/upload/*` to Django's file upload endpoints
- Use `djangoApi.upload()` method with proper FormData

### Phase 3: Update Course Management
- Change `/api/courses/*` to `/api/courses/` (Django REST endpoints)
- Use `djangoApi.post()`, `djangoApi.put()`, etc.

### Phase 4: Update Student/Instructor Endpoints
- Map to Django's actual API structure
- Use proper authentication headers

### Phase 5: Remove/Stub Admin & Payment Features
- These features don't exist in Django yet
- Either remove or show "Coming Soon" messages

## Implementation Plan

1. **Immediate**: Fix auth flows (login/signup/logout)
2. **High Priority**: Fix course creation and enrollment
3. **Medium Priority**: Fix profile and progress tracking
4. **Low Priority**: Stub out admin/payment features

## Django API Endpoints Available

Based on `openapi_specification.yaml`:
- `/api/auth/login/` - POST
- `/api/auth/register/` - POST
- `/api/auth/token/refresh/` - POST
- `/api/courses/` - GET, POST
- `/api/courses/{id}/` - GET, PUT, PATCH, DELETE
- `/api/courses/{id}/enroll/` - POST
- `/api/courses/{id}/lessons/` - GET, POST
- `/api/lessons/{id}/` - GET, PUT, PATCH, DELETE
- `/api/lessons/{id}/mark-complete/` - POST
- `/api/student/dashboard/` - GET
- `/api/instructor/dashboard/` - GET
- `/api/categories/` - GET

## Next Steps

Run the cleanup script to:
1. Remove all `/api/*` fetch calls
2. Replace with `djangoApi` client calls
3. Update to match Django's actual API structure
4. Add proper error handling
