# Frontend-Backend API Mapping Analysis

## Overview
This document maps all frontend API calls to their required Django backend endpoints and identifies missing implementations.

## Status Legend
- ✅ **Implemented** - Endpoint exists and works
- ⚠️ **Partial** - Endpoint exists but needs enhancement
- ❌ **Missing** - Endpoint needs to be created

---

## 1. Authentication Endpoints

### Frontend Calls (api-client.ts)
| Frontend Call | Expected Endpoint | Status | Backend Location |
|--------------|-------------------|--------|------------------|
| `POST /auth/login/` | `/api/auth/login/` | ✅ | `core.views.AuthViewSet.login` |
| `POST /auth/register/` | `/api/auth/register/` | ✅ | `core.views.AuthViewSet.register` |
| `POST /auth/token/refresh/` | `/api/auth/token/refresh/` | ✅ | `rest_framework_simplejwt` |
| `GET /auth/user/` | `/api/auth/user/` or `/api/user/me/` | ⚠️ | `core.views.UserProfileViewSet.me` |
| `POST /auth/logout/` | `/api/auth/logout/` | ✅ | `core.views.AuthViewSet.logout` |

### Additional Frontend Auth Calls (from components)
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `GET /api/auth/me` | `/api/auth/me/` | ❌ | Needs alias to `/api/user/me/` |
| `POST /api/auth/signup` | `/api/auth/signup/` | ❌ | Needs alias to `/api/auth/register/` |

---

## 2. Course Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Backend Location |
|--------------|-------------------|--------|------------------|
| `GET /api/courses/` | `/courses/api/courses/` | ✅ | `courses.views.CourseViewSet.list` |
| `GET /api/courses/:id/` | `/courses/api/courses/:id/` | ✅ | `courses.views.CourseViewSet.retrieve` |
| `POST /api/courses/` | `/courses/api/courses/` | ✅ | `courses.views.CourseViewSet.create` |
| `PATCH /api/courses/:id/` | `/courses/api/courses/:id/` | ✅ | `courses.views.CourseViewSet.partial_update` |
| `DELETE /api/courses/:id/` | `/courses/api/courses/:id/` | ✅ | `courses.views.CourseViewSet.destroy` |
| `GET /api/featured-courses` | `/api/courses/featured/` | ✅ | `courses.views.CourseViewSet.featured` |
| `GET /api/courses?search=...` | `/api/courses/?search=...` | ✅ | `courses.views.CourseViewSet` with SearchFilter |
| `POST /api/courses/draft` | `/api/courses/` | ✅ | Use existing create (status='draft' by default) |
| `POST /api/courses/create` | `/api/courses/` | ✅ | Use existing create |
| `POST /api/courses/:id/publish/` | `/api/courses/:id/publish/` | ✅ | `courses.views.CourseViewSet.publish` |
| `POST /api/courses/:id/unpublish/` | `/api/courses/:id/unpublish/` | ✅ | `courses.views.CourseViewSet.unpublish` |

---

## 3. Enrollment Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Backend Location |
|--------------|-------------------|--------|------------------|
| `POST /api/enrollments/` | `/courses/api/enrollments/` | ✅ | `courses.views.EnrollmentViewSet.create` |
| `GET /api/enrollments/` | `/courses/api/enrollments/` | ✅ | `courses.views.EnrollmentViewSet.list` |
| `POST /api/enrollments/create` | `/api/enrollments/create/` | ❌ | Use existing POST |
| `GET /api/student/enrollment?courseId=...&userId=...` | `/api/enrollments/check/` | ✅ | `courses.views.EnrollmentViewSet.check` |

---

## 4. Progress Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Backend Location |
|--------------|-------------------|--------|------------------|
| `POST /api/progress/` | `/courses/api/progress/` | ✅ | `courses.views.ProgressViewSet.create` |
| `GET /api/progress/?lesson=...` | `/courses/api/progress/?lesson=...` | ✅ | `courses.views.ProgressViewSet.list` |
| `PUT /api/student/progress` | `/api/progress/:id/` | ⚠️ | Needs update endpoint |

---

## 5. Student Dashboard Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `GET /api/student/dashboard?userId=...` | `/api/student/dashboard/` | ✅ | `courses.views.StudentDashboardView` |
| `GET /api/student/certificates?userId=...` | `/api/student/certificates/` | ❌ | Needs certificates app |

---

## 6. Instructor Dashboard Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `GET /api/instructor/courses?instructorId=...` | `/api/courses/my_courses/` | ✅ | Exists as action |
| `GET /api/instructor/courses/:id?instructorId=...` | `/api/courses/:id/` | ✅ | Use existing |
| `GET /api/instructor/analytics?instructorId=...` | `/api/instructor/analytics/` | ✅ | `courses.views.InstructorAnalyticsView` |
| `GET /api/instructor/activity?instructorId=...&limit=...` | `/api/instructor/activity/` | ✅ | `courses.views.InstructorActivityView` |
| `GET /api/instructor/revenue?instructorId=...&timeRange=...` | `/api/instructor/revenue/` | ❌ | Needs payment integration |
| `GET /api/instructor/engagement?instructorId=...&timeRange=...` | `/api/instructor/engagement/` | ⚠️ | Use analytics endpoint |
| `GET /api/instructor/students?instructorId=...&limit=...` | `/api/instructor/students/` | ✅ | `courses.views.InstructorStudentsView` |

---

## 7. Quiz Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `GET /api/student/quiz/:id` | `/api/quizzes/:id/` | ✅ | `quizzes.views.QuizViewSet.retrieve` |
| `POST /api/student/quiz/submit` | `/api/quizzes/:id/submit/` | ✅ | `quizzes.views.QuizViewSet.submit` |
| `POST /api/instructor/quiz/create` | `/api/quizzes/` | ✅ | `quizzes.views.QuizViewSet.create` |
| `GET /api/instructor/quiz/:id/results` | `/api/quizzes/:id/results/` | ✅ | `quizzes.views.QuizViewSet.results` |
| `GET /api/instructor/quiz/bank` | `/api/quiz-bank/` | ✅ | `quizzes.views.QuestionBankViewSet.list` |
| `POST /api/instructor/quiz/bank` | `/api/quiz-bank/` | ✅ | `quizzes.views.QuestionBankViewSet.create` |
| `DELETE /api/instructor/quiz/bank?questionId=...` | `/api/quiz-bank/:id/` | ✅ | `quizzes.views.QuestionBankViewSet.destroy` |
| `GET /api/instructor/quizzes?courseId=...` | `/api/quizzes/?course=...` | ✅ | `quizzes.views.QuizViewSet.list` |

---

## 8. Certificate Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `POST /api/certificates` | `/api/certificates/` | ✅ | `certificates.views.CertificateViewSet.create` |
| `GET /api/certificates/verify?certificateId=...` | `/api/certificates/verify/` | ✅ | `certificates.views.CertificateViewSet.verify` |
| `GET /api/student/certificates?userId=...` | `/api/certificates/?userId=...` | ✅ | `certificates.views.CertificateViewSet.list` |

---

## 9. File Upload Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `POST /api/files/upload/` | `/api/files/upload/` | ✅ | `files.views.FileUploadViewSet.upload_file` |
| `POST /api/files/thumbnail/` | `/api/files/thumbnail/` | ✅ | `files.views.FileUploadViewSet.upload_thumbnail` |
| `POST /api/files/video/` | `/api/files/video/` | ✅ | `files.views.FileUploadViewSet.upload_video` |
| `POST /api/files/avatar/` | `/api/files/avatar/` | ✅ | `files.views.FileUploadViewSet.upload_avatar` |
| `DELETE /api/files/avatar/?userId=...` | `/api/files/avatar/` | ✅ | `files.views.FileUploadViewSet.delete_avatar` |

---

## 10. Profile Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `PUT /api/profile/update` | `/api/user/me/` | ⚠️ | Use existing update_profile |
| `PUT /api/profile/change-password` | `/api/user/change-password/` | ✅ | `core.views.UserProfileViewSet.change_password` |
| `PUT /api/profile/notifications` | `/api/user/notifications/` | ❌ | Needs notification settings |

---

## 11. Miscellaneous Endpoints

### Frontend Calls
| Frontend Call | Expected Endpoint | Status | Notes |
|--------------|-------------------|--------|-------|
| `GET /api/categories` | `/api/categories/` | ✅ | `courses.views.CategoryViewSet.list` |
| `GET /api/stats` | `/api/stats/` | ❌ | Needs stats endpoint |
| `GET /api/admin/sso-providers` | `/api/admin/sso-providers/` | ❌ | Needs SSO config |
| `POST /api/checkout/stripe` | `/api/checkout/stripe/` | ❌ | Needs payment app |
| `POST /api/checkout/upi` | `/api/checkout/upi/` | ❌ | Needs payment app |
| `GET /api/checkout/upi?paymentId=...` | `/api/checkout/upi/:id/` | ❌ | Needs payment app |

---

## Priority Implementation Plan

### Phase 1: Critical (Week 1-2)
1. ✅ Fix URL routing - Move API endpoints to `/api/` prefix
2. ✅ Add search/filter to courses
3. ✅ Add enrollment check endpoint
4. ✅ Add student dashboard endpoint
5. ✅ Add instructor analytics endpoints
6. ✅ Add file upload endpoints

### Phase 2: High Priority (Week 3-4)
7. ✅ Create Quiz app with models and endpoints
8. ✅ Create Certificate app with generation
9. ✅ Add course categories
10. ✅ Add draft/publish workflow
11. ✅ Add password change endpoint

### Phase 3: Medium Priority (Week 5-6)
12. ❌ Add activity tracking
13. ❌ Add revenue tracking
14. ❌ Add engagement analytics
15. ❌ Add notification settings
16. ❌ Add stats endpoint

### Phase 4: Future (Week 7+)
17. ❌ Payment integration (Stripe/UPI)
18. ❌ SSO providers
19. ❌ Advanced analytics
20. ❌ Real-time features

---

## URL Structure Issues

### Current Backend Structure
```
/api/auth/...           # Core auth endpoints
/api/user/...           # User profile endpoints
/courses/api/courses/   # Course endpoints (WRONG!)
/courses/api/lessons/   # Lesson endpoints (WRONG!)
```

### Required Frontend Structure
```
/api/auth/...
/api/user/...
/api/courses/...
/api/lessons/...
/api/enrollments/...
/api/progress/...
```

### Fix Required
Move all API endpoints to `/api/` prefix by updating `lms_project/urls.py`

---

## Next Steps

1. **Immediate**: Fix URL routing structure
2. **Week 1**: Implement Phase 1 critical endpoints
3. **Week 2-3**: Create Quiz and Certificate apps
4. **Week 4+**: Add analytics and advanced features

