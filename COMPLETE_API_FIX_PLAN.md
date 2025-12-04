# Complete API Fix Plan - All Files

## Files Found with Old API Calls

### ✅ Already Fixed (4 files)
1. frontend/src/app/auth/signup/page.tsx
2. frontend/src/app/auth/login/page.tsx
3. frontend/src/app/instructor/page.tsx
4. frontend/src/app/learn/page.tsx

### 🔧 Need to Fix (17 files)

#### HIGH PRIORITY - Core Features (6 files)

1. **frontend/src/app/instructor/create-course/page.tsx** (5 calls)
   - `/api/upload/thumbnail` → Django file upload
   - `/api/upload/video` → Django file upload
   - `/api/courses/draft` → `/api/courses/` POST
   - `/api/courses/create` → `/api/courses/` POST
   - `/api/courses/publish` → `/api/courses/{id}/` PATCH

2. **frontend/src/app/profile/page.tsx** (4 calls)
   - `/api/profile/update` → `/api/auth/me/` PATCH
   - `/api/profile/change-password` → `/api/auth/change-password/` POST
   - `/api/profile/notifications` → `/api/auth/me/` PATCH
   - `/api/upload/avatar` → Django file upload

3. **frontend/src/app/learn/[courseId]/[lessonId]/page.tsx** (1 call)
   - `/api/student/progress` → `/api/lessons/{id}/mark-complete/` POST

4. **frontend/src/app/checkout/success/page.tsx** (1 call)
   - `/api/enrollments/create` → `/api/courses/{id}/enroll/` POST

5. **frontend/src/app/instructor/question-bank/page.tsx** (2 calls)
   - `/api/instructor/courses` → `/api/courses/` GET
   - `/api/instructor/quiz/bank` → NOT IMPLEMENTED (stub)

6. **frontend/src/app/learn/[courseId]/page.tsx** (1 call)
   - `/api/certificates` → NOT IMPLEMENTED (stub)

#### MEDIUM PRIORITY - Advanced Features (4 files)

7. **frontend/src/app/checkout/stripe/page.tsx** (1 call)
   - `/api/checkout/stripe` → NOT IMPLEMENTED (stub)

8. **frontend/src/app/checkout/upi/page.tsx** (1 call)
   - `/api/checkout/upi` → NOT IMPLEMENTED (stub)

9. **frontend/src/app/instructor/quiz/create/page.tsx** (1 call)
   - `/api/instructor/quiz/create` → NOT IMPLEMENTED (stub)

10. **frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx** (1 call)
    - `/api/student/quiz/submit` → NOT IMPLEMENTED (stub)

#### LOW PRIORITY - Admin Features (3 files)

11. **frontend/src/app/admin/page.tsx** (7 calls)
    - All `/api/admin/*` → NOT IMPLEMENTED (stub entire page)

12. **frontend/src/app/admin/payment-settings/page.tsx** (5 calls)
    - All `/api/admin/payment-gateways` → NOT IMPLEMENTED (stub)

13. **frontend/src/app/admin/sso-settings/page.tsx** (5 calls)
    - All `/api/admin/sso-providers` → NOT IMPLEMENTED (stub)

#### TEST UTILITIES (1 file)

14. **frontend/src/lib/enrollment-test-utils.ts** (2 calls)
    - Test file - can be updated or removed

## Fix Strategy

### Phase 1: Core Features (Do Now)
Fix files 1-6 to restore core LMS functionality

### Phase 2: Stub Unimplemented (Do Now)
Add "Coming Soon" messages for files 7-13

### Phase 3: Implement Missing Features (Later)
Actually implement quizzes, payments, admin in Django

## Execution Order

1. ✅ Auth pages (DONE)
2. 🔧 Course creation (HIGH)
3. 🔧 Profile management (HIGH)
4. 🔧 Progress tracking (HIGH)
5. 🔧 Enrollment (HIGH)
6. 🔧 Question bank (HIGH)
7. 🔧 Certificates (MEDIUM - stub)
8. 🔧 Payments (MEDIUM - stub)
9. 🔧 Quizzes (MEDIUM - stub)
10. 🔧 Admin (LOW - stub)
