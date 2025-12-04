# API Cleanup Guide - Removing Next.js API Interference

## Problem Summary
The frontend has many fetch calls to `/api/*` routes (old Next.js API pattern), but:
- No Next.js API route handlers exist in `frontend/src/app/api/`
- These calls fail with 404 errors
- Should use Django backend directly via `django-api-client.ts`

## Solution Applied

### ✅ Fixed Files

1. **frontend/src/app/auth/signup/page.tsx**
   - ❌ Old: `fetch('/api/auth/signup')`
   - ✅ New: Uses `useAuth().signup()` → `djangoApi.register()`

2. **frontend/src/app/instructor/page.tsx**
   - ❌ Old: `fetch('/api/auth/logout')`
   - ✅ New: Uses `useAuth().logout()` → `djangoApi.logout()`

3. **frontend/src/app/learn/page.tsx**
   - ❌ Old: `fetch('/api/auth/logout')`
   - ✅ New: Uses `useAuth().logout()` → `djangoApi.logout()`

### 🔧 Files That Need Fixing

#### High Priority (Breaks Core Functionality)

1. **frontend/src/app/auth/login/page.tsx**
   - Line 73: `fetch('/api/admin/sso-providers')` → Remove SSO loading (not implemented in Django)
   - Line 209: `fetch('/api/auth/signup')` → Use `useAuth().signup()`

2. **frontend/src/app/instructor/create-course/page.tsx**
   - Line 272: `fetch('/api/upload/thumbnail')` → Use `djangoApi.upload('/api/courses/upload-thumbnail/', formData)`
   - Line 327: `fetch('/api/upload/video')` → Use `djangoApi.upload('/api/lessons/upload-video/', formData)`
   - Line 391: `fetch('/api/courses/draft')` → Use `djangoApi.post('/api/courses/', data)`
   - Line 461: `fetch('/api/courses/create')` → Use `djangoApi.post('/api/courses/', data)`
   - Line 473: `fetch('/api/courses/publish')` → Use `djangoApi.patch('/api/courses/{id}/', {status: 'published'})`

3. **frontend/src/app/profile/page.tsx**
   - Line 100: `fetch('/api/profile/update')` → Use `djangoApi.patch('/api/auth/me/', data)`
   - Line 149: `fetch('/api/profile/change-password')` → Use `djangoApi.post('/api/auth/change-password/', data)`
   - Line 187: `fetch('/api/profile/notifications')` → Use `djangoApi.patch('/api/auth/me/', {notifications: data})`
   - Line 238: `fetch('/api/upload/avatar')` → Use `djangoApi.upload('/api/auth/upload-avatar/', formData)`

4. **frontend/src/app/learn/[courseId]/[lessonId]/page.tsx**
   - Line 236: `fetch('/api/student/progress')` → Use `djangoApi.post('/api/lessons/{id}/mark-complete/')`

5. **frontend/src/app/learn/[courseId]/page.tsx**
   - Line 295: `fetch('/api/certificates')` → Use `djangoApi.post('/api/certificates/', data)`

#### Medium Priority (Advanced Features)

6. **frontend/src/app/checkout/stripe/page.tsx**
   - Line 56: `fetch('/api/checkout/stripe')` → Not implemented in Django yet

7. **frontend/src/app/checkout/upi/page.tsx**
   - Line 85: `fetch('/api/checkout/upi')` → Not implemented in Django yet

8. **frontend/src/app/checkout/success/page.tsx**
   - Line 107: `fetch('/api/enrollments/create')` → Use `djangoApi.post('/api/courses/{id}/enroll/')`

9. **frontend/src/app/instructor/quiz/create/page.tsx**
   - Line 226: `fetch('/api/instructor/quiz/create')` → Not implemented in Django yet

10. **frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx**
    - Line 177: `fetch('/api/student/quiz/submit')` → Not implemented in Django yet

11. **frontend/src/app/instructor/question-bank/page.tsx**
    - Line 152: `fetch('/api/instructor/courses')` → Use `djangoApi.get('/api/courses/')`
    - Line 185: `fetch('/api/instructor/quiz/bank')` → Not implemented in Django yet

#### Low Priority (Admin Features - Not in Django)

12. **frontend/src/app/admin/page.tsx**
    - Multiple `/api/admin/*` calls → Not implemented in Django yet

13. **frontend/src/app/admin/payment-settings/page.tsx**
    - Multiple `/api/admin/payment-gateways` calls → Not implemented in Django yet

14. **frontend/src/app/admin/sso-settings/page.tsx**
    - Multiple `/api/admin/sso-providers` calls → Not implemented in Django yet

## Django API Endpoints Available

From `backend/` Django project:

### Authentication
- `POST /api/auth/login/` - Login with username/password
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/me/` - Get current user profile

### Courses
- `GET /api/courses/` - List courses (with filters)
- `POST /api/courses/` - Create course (instructor only)
- `GET /api/courses/{id}/` - Get course details
- `PUT /api/courses/{id}/` - Update course
- `DELETE /api/courses/{id}/` - Delete course
- `POST /api/courses/{id}/enroll/` - Enroll in course
- `GET /api/courses/{id}/lessons/` - List course lessons
- `POST /api/courses/{id}/lessons/` - Create lesson

### Lessons
- `GET /api/lessons/{id}/` - Get lesson details
- `PUT /api/lessons/{id}/` - Update lesson
- `DELETE /api/lessons/{id}/` - Delete lesson
- `POST /api/lessons/{id}/mark-complete/` - Mark lesson complete

### Dashboards
- `GET /api/student/dashboard/` - Student dashboard data
- `GET /api/instructor/dashboard/` - Instructor dashboard data

### Categories
- `GET /api/categories/` - List categories

## Next Steps

1. ✅ Fix auth flows (login/signup/logout) - DONE
2. 🔧 Fix course creation and file uploads - IN PROGRESS
3. 🔧 Fix progress tracking
4. 🔧 Fix enrollment flow
5. ⏳ Stub out unimplemented features (quizzes, payments, admin)

## Testing Checklist

- [ ] Login works
- [ ] Signup works
- [ ] Logout works
- [ ] Course browsing works
- [ ] Course creation works (instructor)
- [ ] File uploads work
- [ ] Enrollment works
- [ ] Progress tracking works
- [ ] Student dashboard loads
- [ ] Instructor dashboard loads
