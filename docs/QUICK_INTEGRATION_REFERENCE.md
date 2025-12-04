# Quick Integration Reference Card

## 3-Step Integration

### Step 1: Update 3 Frontend Pages (45 minutes)

#### Home Page: `frontend/src/app/page.tsx`
```typescript
// Add import
import { djangoApi } from '@/lib/django-api-client'

// Replace fetch calls with:
const coursesData = await djangoApi.get('/api/courses/', { featured: true, limit: 6 })
const categoriesData = await djangoApi.get('/api/categories/')

// Transform: data.results.map(course => ({ id, title, ... }))
```

#### Courses Page: `frontend/src/app/courses/page.tsx`
```typescript
// Add import
import { djangoApi } from '@/lib/django-api-client'

// Replace fetch with:
const data = await djangoApi.get('/api/courses/', params)

// Transform: data.results.map(course => ({ id, title, ... }))
```

#### Student Dashboard: `frontend/src/app/learn/page.tsx`
```typescript
// Add import
import { djangoApi } from '@/lib/django-api-client'

// Replace fetch with:
const data = await djangoApi.get('/api/student/dashboard/')

// Transform: data.enrollments.map(enrollment => ({ id, title, ... }))
```

### Step 2: Delete Next.js API Routes (5 minutes)
```bash
rm -rf frontend/src/app/api/
rm -rf frontend/prisma/
rm frontend/src/lib/db.ts
```

### Step 3: Test (30 minutes)
```bash
# Terminal 1
cd backend && python manage.py runserver

# Terminal 2
cd frontend && npm run dev

# Browser: http://localhost:3000
# Check DevTools Network tab for /api/courses/ calls
```

---

## API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/courses/` | GET | List courses (featured, search, filter) |
| `/api/categories/` | GET | List categories |
| `/api/student/dashboard/` | GET | Student dashboard data |
| `/api/enrollments/` | POST | Enroll in course |
| `/api/auth/login/` | POST | Login |
| `/api/auth/register/` | POST | Register |

---

## Data Transformation Examples

### Courses
```typescript
// Django response
{ results: [{ id, title, instructor: { name }, category: { name }, ... }] }

// Frontend format
[{ id, title, instructor: "John", category: "Python", ... }]

// Transform
data.results.map(course => ({
  id: course.id,
  title: course.title,
  instructor: course.instructor.name,
  category: course.category.name,
  // ... other fields
}))
```

### Student Dashboard
```typescript
// Django response
{ enrollments: [{ course: { id, title }, progress_percentage, ... }] }

// Frontend format
[{ id, title, progress, ... }]

// Transform
data.enrollments.map(enrollment => ({
  id: enrollment.course.id,
  title: enrollment.course.title,
  progress: enrollment.progress_percentage,
  // ... other fields
}))
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| CORS errors | Add `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]` to Django settings |
| 401 Unauthorized | Check Authorization header has `Bearer <token>` |
| Data not displaying | Check data.results (Django returns paginated response) |
| Token expired | Django API client auto-refreshes on 401 |
| API not found | Verify Django running on :8000 |

---

## Verification Checklist

- [ ] Home page loads featured courses
- [ ] Courses page displays courses
- [ ] Search/filters work
- [ ] Student dashboard shows enrollments
- [ ] DevTools shows `/api/courses/` calls (not `/api/featured-courses`)
- [ ] No console errors
- [ ] Activity tracking records API calls
- [ ] JWT tokens in Authorization header

---

## Files to Reference

| Document | Purpose |
|----------|---------|
| FRONTEND_INTEGRATION_COPY_PASTE.md | Exact code to copy-paste |
| DJANGO_API_ENDPOINTS_REFERENCE.md | API endpoint details |
| FRONTEND_INTEGRATION_EXECUTION_GUIDE.md | Step-by-step guide |
| INTEGRATION_STATUS_REPORT.md | Complete status |

---

## Key Points

✅ Django API client already created (`frontend/src/lib/django-api-client.ts`)
✅ All code changes documented and ready to copy-paste
✅ No database migrations needed
✅ No breaking changes
✅ Can be completed in 80 minutes
✅ Very low risk

---

## Success = Phase 1 Features Work End-to-End

When complete:
- ✅ Featured courses from Django
- ✅ Course search/filters from Django
- ✅ Student enrollments from Django
- ✅ Activity tracking working
- ✅ Single source of truth
- ✅ All Phase 1 features exercised end-to-end
