# Implementation Priority Guide

## Quick Reference: What to Build First

### 🔴 CRITICAL PATH (Must Do First)

These pages are blocking other features and are essential for core functionality.

#### 1. **Course Detail Page** (`/courses/[id].astro`)
**Why**: Users need to see course details before enrolling  
**Effort**: 4 hours  
**Dependencies**: None  
**Blocks**: Enrollment, Course Player

**Implementation Steps**:
```typescript
// 1. Change routing from [slug] to [id]
// 2. Fetch course with: GET /api/courses/{id}/
// 3. Check enrollment with: GET /api/enrollments/check/?courseId={id}
// 4. Add enroll button: POST /api/enrollments/
// 5. Show lessons if enrolled: GET /api/courses/{id}/with-progress/
// 6. Add "Continue Learning" button to course player
```

**Key Features**:
- Display course details (title, description, instructor, price)
- Show lessons list
- Enroll button (check if already enrolled)
- Progress display (if enrolled)
- Related courses
- Student reviews

---

#### 2. **Course Player** (`/course-player.astro`)
**Why**: Students need to watch lessons and track progress  
**Effort**: 6 hours  
**Dependencies**: Course Detail Page  
**Blocks**: Progress Tracking, Certificates

**Implementation Steps**:
```typescript
// 1. Fetch course with progress: GET /api/courses/{id}/with-progress/
// 2. Display lessons list
// 3. Show current lesson video
// 4. Add mark complete button: POST /api/lessons/{id}/mark-complete/
// 5. Update progress bar
// 6. Show next lesson
// 7. Handle course completion
```

**Key Features**:
- Video player (YouTube/Vimeo embed or custom)
- Lesson navigation
- Progress tracking
- Mark complete button
- Next lesson suggestion
- Course completion detection
- Certificate generation trigger

---

#### 3. **Student Dashboard** (`/dashboard/student/index.astro`)
**Why**: Students need to see their enrolled courses and progress  
**Effort**: 3 hours  
**Dependencies**: Course Detail Page  
**Blocks**: Student Settings, Assessments

**Implementation Steps**:
```typescript
// 1. Already partially done - just complete it
// 2. Fetch dashboard: GET /api/student/dashboard/
// 3. Display enrolled courses with progress
// 4. Show recent activity
// 5. Add quick links to courses
// 6. Show certificates earned
```

**Key Features**:
- Enrolled courses with progress
- Recent activity
- Certificates
- Quick stats
- Continue learning buttons

---

#### 4. **Logout Functionality** (`/logout.astro`)
**Why**: Users need to be able to log out  
**Effort**: 1 hour  
**Dependencies**: None  
**Blocks**: Nothing (but essential)

**Implementation Steps**:
```typescript
// 1. Call: POST /api/auth/logout/
// 2. Clear tokens: TokenManager.clearTokens()
// 3. Clear cookies
// 4. Redirect to home or login
```

---

### 🟠 HIGH PRIORITY (Do Next)

These enable core user workflows and are needed for MVP.

#### 5. **Registration Pages** (`/register/student.astro`, `/register/trainer.astro`)
**Why**: Users need to create accounts  
**Effort**: 4 hours  
**Dependencies**: None  
**Blocks**: User acquisition

**Implementation Steps**:
```typescript
// 1. Create registration form
// 2. Call: POST /api/auth/register/
// 3. Validate inputs
// 4. Auto-login after registration
// 5. Redirect to dashboard
```

**Key Features**:
- Email validation
- Password strength validation
- Terms acceptance
- Role selection (student/instructor)
- Auto-login after registration

---

#### 6. **Password Reset Flow** (`/auth/forgot-password.astro`, `/auth/reset-password.astro`)
**Why**: Users need to recover forgotten passwords  
**Effort**: 3 hours  
**Dependencies**: None  
**Blocks**: User support

**Implementation Steps**:
```typescript
// 1. Forgot password page:
//    - Call: POST /api/auth/request-password-reset/
//    - Show confirmation message
// 2. Reset password page:
//    - Get uid and token from URL
//    - Call: POST /api/auth/reset-password/
//    - Show success message
```

---

#### 7. **Student Settings** (`/dashboard/student/settings.astro`)
**Why**: Students need to manage their profile  
**Effort**: 3 hours  
**Dependencies**: None  
**Blocks**: Profile management

**Implementation Steps**:
```typescript
// 1. Fetch user: GET /api/user/me/
// 2. Update profile: PATCH /api/user/me/
// 3. Change password: POST /api/user/change-password/
// 4. Upload avatar: POST /api/user/upload-avatar/
```

---

#### 8. **Instructor Dashboard** (`/dashboard/trainer/index.astro`)
**Why**: Instructors need to see their courses and students  
**Effort**: 8 hours  
**Dependencies**: None  
**Blocks**: Course management

**Implementation Steps**:
```typescript
// 1. Fetch analytics: GET /api/instructor/analytics/
// 2. Fetch courses: GET /api/courses/?instructor_id={id}
// 3. Fetch enrollments: GET /api/enrollments/?course_id={id}
// 4. Display stats and recent activity
// 5. Add quick links to course management
```

---

### 🟡 MEDIUM PRIORITY (Do After MVP)

These enhance the platform but aren't blocking.

#### 9. **Course Management** (Create/Edit)
**Why**: Instructors need to create and manage courses  
**Effort**: 8 hours  
**Dependencies**: Instructor Dashboard

**Implementation Steps**:
```typescript
// 1. Create course: POST /api/courses/
// 2. Update course: PATCH /api/courses/{id}/
// 3. Manage lessons: POST/PATCH/DELETE /api/lessons/
// 4. Publish course: POST /api/courses/{id}/publish/
```

---

#### 10. **Admin Dashboard**
**Why**: Admins need to manage the platform  
**Effort**: 12 hours  
**Dependencies**: None  
**Blocks**: Platform management

**Implementation Steps**:
```typescript
// 1. Create admin pages for:
//    - User management
//    - Course moderation
//    - Payment management
//    - System settings
```

---

#### 11. **Payment Integration**
**Why**: Platform needs to process payments  
**Effort**: 8 hours  
**Dependencies**: Checkout page

**Implementation Steps**:
```typescript
// 1. Integrate Stripe/PayPal
// 2. Create payment endpoint
// 3. Handle payment confirmation
// 4. Auto-enroll after payment
```

---

### 🟢 LOW PRIORITY (Nice-to-Have)

These are enhancements that can be added later.

- Analytics and reporting
- Assessments and quizzes
- Certificates
- Discussions/Forums
- Notifications
- Email integration
- Advanced search
- Coaching/Booking

---

## Implementation Checklist

### Phase 1: Critical Path (Week 1)
- [ ] Update course detail page to use Django API
- [ ] Implement course player with lesson tracking
- [ ] Complete student dashboard
- [ ] Implement logout functionality
- [ ] Test all critical paths

### Phase 2: Authentication (Week 2)
- [ ] Create student registration page
- [ ] Create instructor registration page
- [ ] Implement password reset flow
- [ ] Test registration and password reset

### Phase 3: User Management (Week 2-3)
- [ ] Implement student settings page
- [ ] Implement instructor dashboard
- [ ] Add profile management
- [ ] Test user management features

### Phase 4: Instructor Features (Week 3-4)
- [ ] Create course management pages
- [ ] Implement lesson management
- [ ] Add course publishing
- [ ] Test instructor workflows

### Phase 5: Admin & Payments (Week 4-5)
- [ ] Create admin dashboard
- [ ] Implement payment processing
- [ ] Add coupon system
- [ ] Test admin and payment features

---

## Code Templates

### Template 1: API Integration Pattern

```typescript
// In your Astro page
---
import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';

// Fetch data
const response = await djangoApi.get(API_ENDPOINTS.courses.list);

if (!response.success) {
  return Astro.redirect('/error');
}

const courses = response.results || response.data || [];
---

<div>
  {courses.map(course => (
    <div>{course.title}</div>
  ))}
</div>
```

### Template 2: Client-Side API Call

```typescript
<script>
  import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';
  
  async function handleEnroll(courseId) {
    const response = await djangoApi.post(API_ENDPOINTS.enrollments.create, {
      course_id: courseId
    });
    
    if (response.success) {
      alert('Enrolled successfully!');
      window.location.reload();
    } else {
      alert('Error: ' + response.error);
    }
  }
</script>
```

### Template 3: Form Submission

```typescript
<script>
  import { djangoApi, API_ENDPOINTS } from '../config/django-api.config';
  
  const form = document.getElementById('myForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const response = await djangoApi.post(API_ENDPOINTS.auth.register, data);
    
    if (response.success) {
      // Handle success
    } else {
      // Handle error
    }
  });
</script>
```

---

## Testing Checklist

For each page, test:
- [ ] API calls succeed
- [ ] Error handling works
- [ ] Loading states display
- [ ] Authentication required pages redirect to login
- [ ] Role-based access works
- [ ] Form validation works
- [ ] Success/error messages display
- [ ] Navigation works correctly

---

## Common Pitfalls to Avoid

1. **Forgetting to check authentication**
   - Always check if user is logged in before making authenticated API calls

2. **Not handling errors**
   - Always handle API errors and show user-friendly messages

3. **Hardcoding IDs**
   - Use dynamic IDs from URL params or API responses

4. **Not validating form inputs**
   - Validate on client-side before sending to API

5. **Forgetting to update UI after API calls**
   - Refresh data or update UI after successful API calls

6. **Not using TypeScript types**
   - Use proper types for API responses

7. **Making unnecessary API calls**
   - Cache data when possible to reduce API calls

---

## Quick Start Commands

```bash
# Start development
cd backend && python manage.py runserver
cd frontend-astro && npm run dev

# Test API endpoint
curl http://localhost:8000/api/courses/

# Check tokens in browser
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')

# Clear tokens
localStorage.clear()
```

---

## Resources

- [API Documentation](../API_DOCUMENTATION.md)
- [Django Migration Guide](./DJANGO_MIGRATION_GUIDE.md)
- [Audit Report](./AUDIT_REPORT.md)
- [Quick Start](./QUICK_START.md)
