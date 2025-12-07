# Astro Frontend Pages Status Matrix

## Legend
- ✅ **Fully Integrated** - Uses Django API, fully functional
- ⚠️ **Partially Integrated** - Some API integration, needs work
- ❌ **Not Integrated** - No API integration, needs implementation
- 🗑️ **Deprecated** - Should be removed
- 📝 **Missing** - Page doesn't exist, needs to be created

---

## PUBLIC PAGES (No Authentication Required)

| Page | Route | Status | API Used | Priority | Notes |
|------|-------|--------|----------|----------|-------|
| Home | `/` | ⚠️ | None | Medium | Add featured courses carousel |
| Courses | `/courses` | ✅ | `GET /api/courses/` | ✓ Done | Fully working |
| Course Detail | `/courses/[slug]` | ❌ | Old PHP API | 🔴 Critical | Needs Django API integration |
| Enroll | `/courses/enroll` | ❌ | None | 🔴 Critical | Needs implementation |
| Course Player | `/course-player` | ❌ | None | 🔴 Critical | React component not integrated |
| Shopping Cart | `/cart` | ⚠️ | None | 🟡 Medium | Uses localStorage only |
| Checkout | `/checkout` | ⚠️ | None | 🟡 Medium | Simulates payment |
| About | `/about` | ✅ | None | ✓ Done | Static content |
| Contact | `/contact` | ❌ | None | 🟡 Medium | Needs backend |
| Booking | `/booking` | ❌ | None | 🟢 Low | Placeholder |
| Coaching | `/coaching` | ❌ | None | 🟢 Low | Placeholder |
| Programs | `/programs` | ❌ | None | 🟢 Low | Placeholder |
| Program Detail | `/programs/[slug]` | ❌ | None | 🟢 Low | Placeholder |
| Articles | `/articles` | ❌ | None | 🟢 Low | Placeholder |
| Privacy | `/privacy` | ✅ | None | ✓ Done | Static content |
| Sitemap | `/sitemap` | ✅ | None | ✓ Done | Static content |
| 404 | `/404` | ✅ | None | ✓ Done | Error page |
| Debug | `/debug-courses` | ⚠️ | None | 🟢 Low | Dev only, remove in prod |

**Summary**: 4 ✅ | 3 ⚠️ | 10 ❌ | 1 🟢

---

## AUTHENTICATION PAGES

| Page | Route | Status | API Used | Priority | Notes |
|------|-------|--------|----------|----------|-------|
| Student Login | `/login/student` | ✅ | `POST /api/auth/login/` | ✓ Done | Fully working |
| Trainer Login | `/login/trainer` | ✅ | `POST /api/auth/login/` | ✓ Done | Fully working |
| Old Login | `/login` | 🗑️ | Clerk | 🔴 Critical | Remove - use `/login/student` |
| Logout | `/logout` | ❌ | Clerk | 🔴 Critical | Needs Django API |
| Student Register | `/register/student` | 📝 | None | 🟠 High | Needs creation |
| Trainer Register | `/register/trainer` | 📝 | None | 🟠 High | Needs creation |
| Forgot Password | `/auth/forgot-password` | 📝 | None | 🟠 High | Needs creation |
| Reset Password | `/auth/reset-password` | 📝 | None | 🟠 High | Needs creation |

**Summary**: 2 ✅ | 0 ⚠️ | 1 ❌ | 1 🗑️ | 4 📝

---

## STUDENT DASHBOARD PAGES

| Page | Route | Status | API Used | Priority | Notes |
|------|-------|--------|----------|----------|-------|
| Dashboard | `/dashboard/student` | ⚠️ | `GET /api/student/dashboard/` | 🔴 Critical | Partially done, needs courses section |
| My Courses | `/dashboard/student/courses` | ❌ | None | 🟠 High | Needs implementation |
| Assessments | `/dashboard/student/assessments` | ❌ | None | 🟡 Medium | Placeholder |
| Certificates | `/dashboard/student/certificates` | ❌ | None | 🟡 Medium | Placeholder |
| Discussions | `/dashboard/student/discussions` | ❌ | None | 🟡 Medium | Placeholder |
| Settings | `/dashboard/student/settings` | ❌ | None | 🟠 High | Form without backend |

**Summary**: 0 ✅ | 1 ⚠️ | 5 ❌

---

## INSTRUCTOR DASHBOARD PAGES

| Page | Route | Status | API Used | Priority | Notes |
|------|-------|--------|----------|----------|-------|
| Dashboard | `/dashboard/trainer` | ❌ | None | 🟠 High | Mock data only |
| Analytics | `/dashboard/trainer/analytics` | ❌ | None | 🟡 Medium | Placeholder |
| My Courses | `/dashboard/trainer/courses` | ❌ | None | 🟠 High | Placeholder |
| Create Course | `/dashboard/trainer/courses/new` | ❌ | None | 🟠 High | Placeholder |
| Manage Lessons | `/dashboard/trainer/courses/[id]/lessons` | ❌ | None | 🟠 High | Placeholder |
| Assessments | `/dashboard/trainer/assessments` | ❌ | None | 🟡 Medium | Placeholder |
| Create Assessment | `/dashboard/trainer/assessments/new` | ❌ | None | 🟡 Medium | Placeholder |
| Edit Assessment | `/dashboard/trainer/assessments/[id]/edit` | ❌ | None | 🟡 Medium | Placeholder |
| Students | `/dashboard/trainer/students` | ❌ | None | 🟠 High | Placeholder |
| Discussions | `/dashboard/trainer/discussions` | ❌ | None | 🟡 Medium | Placeholder |
| Settings | `/dashboard/trainer/settings` | ❌ | None | 🟠 High | Placeholder |

**Summary**: 0 ✅ | 0 ⚠️ | 11 ❌

---

## ADMIN PAGES

| Page | Route | Status | API Used | Priority | Notes |
|------|-------|--------|----------|----------|-------|
| Dashboard | `/admin/dashboard` | ❌ | None | 🟡 Medium | Navigation only |
| Manage Courses | `/admin/courses` | ❌ | None | 🟡 Medium | Placeholder |
| Manage Students | `/admin/students` | ❌ | None | 🟡 Medium | Placeholder |
| Manage Trainers | `/admin/trainers` | ❌ | None | 🟡 Medium | Placeholder |
| Add Student | `/admin/add-student` | ❌ | None | 🟡 Medium | Placeholder |
| Add Trainer | `/admin/add-trainer` | ❌ | None | 🟡 Medium | Placeholder |
| Add Course | `/admin/add-course` | ❌ | None | 🟡 Medium | Placeholder |
| Manage Coupons | `/admin/coupons` | ❌ | None | 🟡 Medium | Placeholder |
| Manage Payments | `/admin/payments` | ❌ | None | 🟡 Medium | Placeholder |
| Settings | `/admin/settings` | ❌ | None | 🟡 Medium | Placeholder |

**Summary**: 0 ✅ | 0 ⚠️ | 10 ❌

---

## OVERALL STATISTICS

### By Status
| Status | Count | Percentage |
|--------|-------|-----------|
| ✅ Fully Integrated | 4 | 8% |
| ⚠️ Partially Integrated | 4 | 8% |
| ❌ Not Integrated | 36 | 77% |
| 🗑️ Deprecated | 1 | 2% |
| 📝 Missing | 4 | 5% |
| **TOTAL** | **49** | **100%** |

### By Priority
| Priority | Count | Effort (hours) |
|----------|-------|----------------|
| 🔴 Critical | 4 | 14 |
| 🟠 High | 8 | 26 |
| 🟡 Medium | 15 | 20 |
| 🟢 Low | 8 | 10 |
| **TOTAL** | **35** | **70** |

### By Category
| Category | Total | Integrated | Partial | Not Done |
|----------|-------|-----------|---------|----------|
| Public | 17 | 4 | 3 | 10 |
| Auth | 8 | 2 | 0 | 6 |
| Student Dashboard | 6 | 0 | 1 | 5 |
| Instructor Dashboard | 11 | 0 | 0 | 11 |
| Admin | 10 | 0 | 0 | 10 |
| **TOTAL** | **52** | **6** | **4** | **42** |

---

## CRITICAL PATH (Must Do First)

```
Week 1 (Critical - 14 hours)
├── Course Detail Page (4h) ← Blocks: Enrollment, Player
├── Course Player (6h) ← Blocks: Progress, Certificates
├── Student Dashboard (3h) ← Blocks: Settings, Assessments
└── Logout (1h) ← Blocks: Nothing but essential

Week 2 (High Priority - 7 hours)
├── Registration Pages (4h) ← Blocks: User acquisition
└── Password Reset (3h) ← Blocks: User support

Week 3 (High Priority - 11 hours)
├── Student Settings (3h)
└── Instructor Dashboard (8h) ← Blocks: Course management

Week 4 (Medium Priority - 8 hours)
└── Course Management (8h)

Week 5+ (Medium/Low Priority - 30+ hours)
├── Admin Pages (12h)
├── Payment Integration (8h)
└── Other Features (10h)
```

---

## API ENDPOINTS COVERAGE

### Implemented (3 endpoints)
```
✅ POST /api/auth/login/
✅ GET /api/courses/
✅ GET /api/student/dashboard/
```

### Partially Implemented (3 endpoints)
```
⚠️ GET /api/courses/{id}/
⚠️ POST /api/enrollments/
⚠️ GET /api/courses/{id}/with-progress/
```

### Not Implemented (20+ endpoints)
```
❌ POST /api/auth/register/
❌ POST /api/auth/logout/
❌ POST /api/auth/request-password-reset/
❌ POST /api/auth/reset-password/
❌ GET /api/user/me/
❌ PATCH /api/user/me/
❌ POST /api/user/change-password/
❌ POST /api/user/upload-avatar/
❌ GET /api/lessons/
❌ POST /api/lessons/{id}/mark-complete/
❌ GET /api/enrollments/check/
❌ GET /api/instructor/analytics/
... and 8+ more
```

---

## QUICK REFERENCE: WHAT TO BUILD NEXT

### This Week (Critical Path)
1. ✏️ **Course Detail** - Update `/courses/[slug].astro` to use Django API
2. ✏️ **Course Player** - Integrate React component with Django API
3. ✏️ **Student Dashboard** - Complete courses section
4. ✏️ **Logout** - Implement Django logout API

### Next Week (Authentication)
1. 📝 **Create** `/register/student.astro`
2. 📝 **Create** `/register/trainer.astro`
3. 📝 **Create** `/auth/forgot-password.astro`
4. 📝 **Create** `/auth/reset-password.astro`

### Following Week (User Management)
1. ✏️ **Student Settings** - Add backend integration
2. ✏️ **Instructor Dashboard** - Implement with API

---

## CLEANUP TASKS

### Remove (Deprecated)
- [ ] `/login.astro` - Use `/login/student.astro` instead
- [ ] Clerk components - All Clerk imports and components
- [ ] Old API calls - Replace with Django API

### Update (Fix)
- [ ] `/logout.astro` - Use Django API
- [ ] `/courses/[slug].astro` - Use Django API
- [ ] `/course-player.astro` - Integrate React component
- [ ] `/checkout.astro` - Add real payment processing

### Create (New)
- [ ] `/register/student.astro`
- [ ] `/register/trainer.astro`
- [ ] `/auth/forgot-password.astro`
- [ ] `/auth/reset-password.astro`

---

## NOTES

- All pages should use the Django API client from `src/config/django-api.config.ts`
- All authenticated pages should check for valid JWT tokens
- All forms should validate inputs before sending to API
- All API calls should handle errors gracefully
- All pages should show loading states during API calls
- All pages should be tested before deployment

---

## Related Documents

- **Full Audit**: `AUDIT_REPORT.md` - Detailed analysis of all pages
- **Implementation Guide**: `IMPLEMENTATION_PRIORITY.md` - Step-by-step instructions
- **Quick Start**: `QUICK_START.md` - Development setup
- **API Docs**: `../API_DOCUMENTATION.md` - All available endpoints
