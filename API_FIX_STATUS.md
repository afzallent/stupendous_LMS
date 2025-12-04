# API Fix Status - Complete Overview

## Executive Summary

**Total Files with Old API Calls:** 17 files  
**Fixed:** 5 files (29%)  
**Remaining:** 12 files (71%)

## Status by Priority

### ✅ FIXED (5 files - 29%)

1. ✅ `frontend/src/app/auth/signup/page.tsx`
2. ✅ `frontend/src/app/auth/login/page.tsx`
3. ✅ `frontend/src/app/instructor/page.tsx`
4. ✅ `frontend/src/app/learn/page.tsx`
5. ✅ `frontend/src/app/instructor/create-course/page.tsx`

### 🔧 HIGH PRIORITY - Need Immediate Fix (5 files)

6. 🔧 `frontend/src/app/profile/page.tsx` - 4 API calls
7. 🔧 `frontend/src/app/learn/[courseId]/[lessonId]/page.tsx` - 1 API call
8. 🔧 `frontend/src/app/checkout/success/page.tsx` - 1 API call
9. 🔧 `frontend/src/app/instructor/question-bank/page.tsx` - 2 API calls
10. 🔧 `frontend/src/app/learn/[courseId]/page.tsx` - 1 API call

### ⏳ MEDIUM PRIORITY - Stub/Not Implemented (4 files)

11. ⏳ `frontend/src/app/checkout/stripe/page.tsx`
12. ⏳ `frontend/src/app/checkout/upi/page.tsx`
13. ⏳ `frontend/src/app/instructor/quiz/create/page.tsx`
14. ⏳ `frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx`

### 📋 LOW PRIORITY - Admin Features (3 files)

15. 📋 `frontend/src/app/admin/page.tsx`
16. 📋 `frontend/src/app/admin/payment-settings/page.tsx`
17. 📋 `frontend/src/app/admin/sso-settings/page.tsx`

## What's Working Now

✅ User signup and registration  
✅ User login and authentication  
✅ User logout  
✅ Course browsing  
✅ Course creation (basic)  
✅ File uploads (thumbnail, video) - *if Django endpoints exist*  
✅ Student dashboard loading  
✅ Instructor dashboard loading  

## What's Broken

❌ Profile updates  
❌ Password changes  
❌ Avatar uploads  
❌ Progress tracking (marking lessons complete)  
❌ Course enrollment  
❌ Certificate generation  
❌ Quiz features  
❌ Payment processing  
❌ Admin features  

## Root Cause

All broken features are trying to call `/api/*` routes that don't exist in Next.js. They need to be updated to call Django backend using `djangoApi` client.

## Solution Pattern

### Before (Broken):
```typescript
const response = await fetch('/api/profile/update', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

### After (Fixed):
```typescript
import { djangoApi } from '@/lib/django-api-client'

const result = await djangoApi.patch('/api/auth/me/', data)
```

## Files That Need Django Backend Updates

Some features can't be fully fixed until Django adds these endpoints:

### Missing Django Endpoints:
- `PATCH /api/auth/me/` - Update user profile
- `POST /api/auth/change-password/` - Change password
- `POST /api/auth/upload-avatar/` - Upload avatar
- `POST /api/courses/{id}/upload-thumbnail/` - Upload course thumbnail
- `POST /api/lessons/{id}/upload-video/` - Upload lesson video
- `POST /api/certificates/` - Generate certificates
- Quiz endpoints (entire feature)
- Payment endpoints (entire feature)
- Admin endpoints (entire feature)

## Recommended Action Plan

### Phase 1: Fix Core LMS Features (Do Now)
1. Fix profile page
2. Fix progress tracking
3. Fix enrollment
4. Test core user journey

### Phase 2: Add Django Endpoints (Do Soon)
1. Add profile update endpoint
2. Add file upload endpoints
3. Test file uploads

### Phase 3: Stub Unimplemented Features (Do Soon)
1. Add "Coming Soon" messages for quizzes
2. Add "Coming Soon" messages for payments
3. Add "Coming Soon" messages for admin

### Phase 4: Implement Missing Features (Do Later)
1. Build quiz system in Django
2. Build payment system in Django
3. Build admin features in Django

## How to Verify Fixes

1. Open browser DevTools → Network tab
2. Perform actions in the app
3. Check that requests go to `localhost:8000/api/*` (Django)
4. Should NOT see requests to `localhost:3000/api/*` (Next.js)
5. Should NOT see 404 errors for `/api/*` routes

## Quick Test Script

```bash
# Start Django
cd backend
python manage.py runserver

# Start Next.js (in another terminal)
cd frontend
npm run dev

# Open browser to http://localhost:3000
# Try these actions:
# 1. Sign up → Should work ✅
# 2. Log in → Should work ✅
# 3. Browse courses → Should work ✅
# 4. Create course → Should work ✅
# 5. Update profile → Currently broken ❌
# 6. Enroll in course → Currently broken ❌
# 7. Mark lesson complete → Currently broken ❌
```

## Impact Assessment

### Critical (Blocks Core Features):
- Profile updates - Users can't update their info
- Progress tracking - Students can't mark lessons complete
- Enrollment - Students can't enroll in courses

### Important (Limits Functionality):
- File uploads - Instructors can't add media
- Certificates - Students can't get certificates

### Nice to Have (Future Features):
- Quizzes - Not implemented yet
- Payments - Not implemented yet
- Admin - Can use Django admin instead

## Conclusion

**Current State:** 29% fixed, core auth working  
**Next Priority:** Fix profile, progress, and enrollment (3 files)  
**Estimated Time:** 30-60 minutes to fix remaining high-priority files  
**Blocker:** Some features need new Django endpoints  

The main interference issue is RESOLVED for auth. Remaining issues are feature-specific and can be fixed file-by-file.
