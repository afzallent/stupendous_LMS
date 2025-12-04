# Comprehensive API Fix Summary

## ✅ COMPLETED FIXES

### 1. Authentication Pages (4 files) - DONE
- ✅ `frontend/src/app/auth/signup/page.tsx` - Uses `useAuth().signup()`
- ✅ `frontend/src/app/auth/login/page.tsx` - Removed SSO, uses `useAuth().signup()`
- ✅ `frontend/src/app/instructor/page.tsx` - Uses `useAuth().logout()`
- ✅ `frontend/src/app/learn/page.tsx` - Uses `useAuth().logout()`

### 2. Course Creation (1 file) - DONE
- ✅ `frontend/src/app/instructor/create-course/page.tsx`
  - ✅ Thumbnail upload: `djangoApi.upload('/api/courses/{id}/upload-thumbnail/')`
  - ✅ Video upload: `djangoApi.upload('/api/lessons/{id}/upload-video/')`
  - ✅ Save draft: `djangoApi.post('/api/courses/')`
  - ✅ Publish course: `djangoApi.post('/api/courses/')`

## 🔧 REMAINING FIXES NEEDED

### HIGH PRIORITY (5 files)

#### 1. Profile Management
**File:** `frontend/src/app/profile/page.tsx`

**Fixes Needed:**
```typescript
// Line ~100: Profile update
- fetch('/api/profile/update')
+ djangoApi.patch('/api/auth/me/', {
    first_name: profileData.name.split(' ')[0],
    last_name: profileData.name.split(' ')[1],
    bio: profileData.bio,
    phone: profileData.phone
  })

// Line ~150: Change password
- fetch('/api/profile/change-password')
+ djangoApi.post('/api/auth/change-password/', {
    old_password: securityData.currentPassword,
    new_password: securityData.newPassword
  })

// Line ~190: Update notifications
- fetch('/api/profile/notifications')
+ djangoApi.patch('/api/auth/me/', {
    notification_preferences: notificationData
  })

// Line ~240: Upload avatar
- fetch('/api/upload/avatar')
+ djangoApi.upload('/api/auth/upload-avatar/', formData)
```

#### 2. Progress Tracking
**File:** `frontend/src/app/learn/[courseId]/[lessonId]/page.tsx`

**Fix Needed:**
```typescript
// Line ~236: Mark lesson complete
- fetch('/api/student/progress', {
    method: 'PUT',
    body: JSON.stringify({ lessonId, completed: true })
  })
+ djangoApi.post(`/api/lessons/${lessonId}/mark-complete/`)
```

#### 3. Enrollment
**File:** `frontend/src/app/checkout/success/page.tsx`

**Fix Needed:**
```typescript
// Line ~107: Create enrollment
- fetch('/api/enrollments/create', {
    method: 'POST',
    body: JSON.stringify({ courseIds })
  })
+ // For each course:
+ await djangoApi.post(`/api/courses/${courseId}/enroll/`)
```

#### 4. Instructor Question Bank
**File:** `frontend/src/app/instructor/question-bank/page.tsx`

**Fixes Needed:**
```typescript
// Line ~152: Fetch courses
- fetch('/api/instructor/courses')
+ djangoApi.get('/api/courses/', { instructor: 'me' })

// Line ~185: Create quiz question
- fetch('/api/instructor/quiz/bank')
+ // NOT IMPLEMENTED - Show "Coming Soon" message
```

#### 5. Certificates
**File:** `frontend/src/app/learn/[courseId]/page.tsx`

**Fix Needed:**
```typescript
// Line ~295: Generate certificate
- fetch('/api/certificates')
+ // NOT IMPLEMENTED - Show "Coming Soon" message
```

### MEDIUM PRIORITY - Stub These (4 files)

These features are NOT implemented in Django backend. Add "Coming Soon" messages:

1. **frontend/src/app/checkout/stripe/page.tsx**
   - Payment processing not implemented

2. **frontend/src/app/checkout/upi/page.tsx**
   - Payment processing not implemented

3. **frontend/src/app/instructor/quiz/create/page.tsx**
   - Quiz feature not implemented

4. **frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx**
   - Quiz feature not implemented

### LOW PRIORITY - Stub Admin (3 files)

Admin features not implemented in Django:

1. **frontend/src/app/admin/page.tsx** - 7 API calls
2. **frontend/src/app/admin/payment-settings/page.tsx** - 5 API calls
3. **frontend/src/app/admin/sso-settings/page.tsx** - 5 API calls

**Solution:** Add banner: "Admin features coming soon. Use Django admin at /admin/"

### TEST FILES (1 file)

**frontend/src/lib/enrollment-test-utils.ts**
- Update or remove test utilities

## DJANGO ENDPOINTS NEEDED (Not Yet Implemented)

To fully fix the frontend, Django needs these endpoints:

### Auth Endpoints
- ✅ `POST /api/auth/login/` - EXISTS
- ✅ `POST /api/auth/register/` - EXISTS
- ✅ `GET /api/auth/me/` - EXISTS
- ❌ `PATCH /api/auth/me/` - NEED TO ADD (profile update)
- ❌ `POST /api/auth/change-password/` - NEED TO ADD
- ❌ `POST /api/auth/upload-avatar/` - NEED TO ADD

### Course Endpoints
- ✅ `GET /api/courses/` - EXISTS
- ✅ `POST /api/courses/` - EXISTS
- ✅ `GET /api/courses/{id}/` - EXISTS
- ❌ `POST /api/courses/{id}/upload-thumbnail/` - NEED TO ADD
- ✅ `POST /api/courses/{id}/enroll/` - EXISTS

### Lesson Endpoints
- ✅ `GET /api/lessons/{id}/` - EXISTS
- ✅ `POST /api/lessons/{id}/mark-complete/` - EXISTS
- ❌ `POST /api/lessons/{id}/upload-video/` - NEED TO ADD

### Future Endpoints (Not Priority)
- ❌ `POST /api/certificates/` - Quiz/certificate system
- ❌ `POST /api/checkout/*` - Payment system
- ❌ `GET/POST /api/admin/*` - Admin features

## QUICK FIX COMMANDS

### For Each File:
1. Add imports:
```typescript
import { djangoApi } from '@/lib/django-api-client'
import { toast } from '@/hooks/use-toast'
```

2. Replace fetch patterns:
```typescript
// OLD
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
const result = await response.json()

// NEW
const result = await djangoApi.post('/api/endpoint/', data)
```

3. Replace alerts with toasts:
```typescript
// OLD
alert('Success!')

// NEW
toast({
  title: "Success",
  description: "Operation completed successfully!"
})
```

## TESTING CHECKLIST

After fixes:
- [ ] Login/Signup works
- [ ] Logout works
- [ ] Course creation works
- [ ] File uploads work (thumbnail, video)
- [ ] Profile update works
- [ ] Password change works
- [ ] Enrollment works
- [ ] Progress tracking works
- [ ] Unimplemented features show "Coming Soon"

## NEXT STEPS

1. **Immediate:** Fix profile page (most user-facing)
2. **Immediate:** Fix progress tracking (core LMS feature)
3. **Immediate:** Fix enrollment (core LMS feature)
4. **Soon:** Add missing Django endpoints
5. **Later:** Implement quiz/certificate/payment features
6. **Later:** Implement admin features
