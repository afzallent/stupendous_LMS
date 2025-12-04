# Frontend-Backend Integration Checklist

## ✅ Implementation Checklist

### Phase 1: Core Integration (COMPLETE)
- [x] Create Django API client (`frontend/src/lib/django-api-client.ts`)
- [x] Update auth context to use Django JWT (`frontend/src/lib/auth.tsx`)
- [x] Update home page to call Django API (`frontend/src/app/page.tsx`)
- [x] Update courses page to call Django API (`frontend/src/app/courses/page.tsx`)
- [x] Update student dashboard to call Django API (`frontend/src/app/learn/page.tsx`)
- [x] Update instructor dashboard to call Django API (`frontend/src/app/instructor/page.tsx`)
- [x] Create environment configuration (`frontend/.env.local`)
- [x] Create integration documentation

### Phase 2: Testing (IN PROGRESS)
- [ ] Test user registration
- [ ] Test user login
- [ ] Test token refresh
- [ ] Test home page data loading
- [ ] Test courses page search/filter
- [ ] Test student dashboard
- [ ] Test instructor dashboard
- [ ] Test activity tracking
- [ ] Test logout functionality

### Phase 3: Cleanup (PENDING)
- [ ] Remove Next.js API routes (`frontend/src/app/api/`)
- [ ] Remove Prisma (`frontend/prisma/`)
- [ ] Remove Prisma client (`frontend/src/lib/db.ts`)
- [ ] Update package.json (remove Prisma dependencies)
- [ ] Clean up unused imports

### Phase 4: Enhancement (OPTIONAL)
- [ ] Add error toast notifications
- [ ] Add loading states
- [ ] Add retry logic for failed requests
- [ ] Add offline mode detection
- [ ] Implement course enrollment flow
- [ ] Implement lesson completion flow
- [ ] Add quiz submission
- [ ] Add certificate generation

---

## 🧪 Testing Checklist

### Authentication Tests
- [ ] **Register New User**
  - Go to `/auth/login`
  - Click "Sign Up"
  - Fill form and submit
  - Verify JWT tokens in localStorage
  - Verify redirect to dashboard

- [ ] **Login Existing User**
  - Go to `/auth/login`
  - Enter credentials
  - Verify JWT tokens in localStorage
  - Verify redirect to dashboard

- [ ] **Token Refresh**
  - Wait 15 minutes (or manually expire token)
  - Make API request
  - Verify automatic token refresh
  - Verify request succeeds

- [ ] **Logout**
  - Click logout button
  - Verify tokens cleared from localStorage
  - Verify redirect to login page

### Home Page Tests
- [ ] **Featured Courses**
  - Go to `/`
  - Verify courses displayed
  - Check Network tab for Django API call
  - Verify URL: `GET /api/courses/?featured=true&limit=6`

- [ ] **Categories**
  - Verify categories displayed
  - Check Network tab for Django API call
  - Verify URL: `GET /api/categories/`

- [ ] **No Errors**
  - Check browser console
  - Verify no CORS errors
  - Verify no 401 errors

### Courses Page Tests
- [ ] **Course List**
  - Go to `/courses`
  - Verify courses displayed
  - Check Network tab for Django API call
  - Verify URL: `GET /api/courses/`

- [ ] **Search**
  - Enter search query
  - Verify filtered results
  - Check Network tab
  - Verify URL: `GET /api/courses/?search=...`

- [ ] **Category Filter**
  - Select category
  - Verify filtered results
  - Check Network tab
  - Verify URL: `GET /api/courses/?category=...`

- [ ] **Sorting**
  - Change sort option
  - Verify results reordered
  - Check Network tab
  - Verify URL: `GET /api/courses/?ordering=...`

### Student Dashboard Tests
- [ ] **Login as Student**
  - Create/login as student user
  - Go to `/learn`
  - Verify dashboard loads

- [ ] **Enrolled Courses**
  - Verify enrolled courses displayed
  - Check Network tab
  - Verify URL: `GET /api/student/dashboard/`
  - Verify Authorization header present

- [ ] **Progress Stats**
  - Verify stats displayed
  - Check total enrolled
  - Check completed courses
  - Check hours learned

- [ ] **No Errors**
  - Check browser console
  - Verify no 401 errors
  - Verify JWT token sent

### Instructor Dashboard Tests
- [ ] **Login as Instructor**
  - Create/login as instructor user
  - Go to `/instructor`
  - Verify dashboard loads

- [ ] **Analytics**
  - Verify analytics displayed
  - Check Network tab
  - Verify URL: `GET /api/instructor/analytics/`
  - Verify Authorization header present

- [ ] **Activity Feed**
  - Verify recent activity displayed
  - Check Network tab
  - Verify URL: `GET /api/instructor/activity/`

- [ ] **Course List**
  - Verify instructor's courses displayed
  - Check enrollment counts
  - Check lesson counts

### Activity Tracking Tests
- [ ] **View Course**
  - Login as student
  - View a course
  - Check Django database for activity record

- [ ] **View Lesson**
  - View a lesson
  - Check Django database for activity record

- [ ] **Enroll in Course**
  - Enroll in a course
  - Check Django database for activity record

- [ ] **Complete Lesson**
  - Complete a lesson
  - Check Django database for activity record

**Verify Activities in Django Shell:**
```python
from activity.models import Activity
activities = Activity.objects.all()
for a in activities:
    print(f"{a.user.username} - {a.action_type} - {a.timestamp}")
```

---

## 🔍 Verification Checklist

### Frontend Verification
- [x] Django API client exists
- [x] Auth context uses Django API
- [x] Home page calls Django API
- [x] Courses page calls Django API
- [x] Student dashboard calls Django API
- [x] Instructor dashboard calls Django API
- [x] Environment config created
- [ ] No Next.js API routes called
- [ ] JWT tokens in localStorage
- [ ] Authorization headers sent

### Backend Verification
- [x] Django REST API endpoints exist
- [x] JWT authentication configured
- [x] CORS configured for Next.js
- [x] Activity tracking middleware active
- [ ] Database has test data
- [ ] Activities being recorded
- [ ] User authentication working

### Integration Verification
- [ ] Frontend calls Django API (not Next.js routes)
- [ ] JWT tokens managed correctly
- [ ] Token refresh works automatically
- [ ] Activity tracking records actions
- [ ] Data consistent between frontend/backend
- [ ] No CORS errors
- [ ] No authentication errors

---

## 🐛 Debugging Checklist

### Issue: CORS Errors
- [ ] Check Django CORS settings
- [ ] Verify `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
- [ ] Restart Django server
- [ ] Clear browser cache

### Issue: 401 Unauthorized
- [ ] Check JWT token exists: `localStorage.getItem('access_token')`
- [ ] Check token not expired
- [ ] Try logging in again
- [ ] Check Authorization header in Network tab

### Issue: No Data Displayed
- [ ] Check Django server is running
- [ ] Check Django has test data
- [ ] Check API endpoint returns data: `http://localhost:8000/api/courses/`
- [ ] Check browser console for errors
- [ ] Check Network tab for failed requests

### Issue: Token Refresh Fails
- [ ] Check refresh token exists: `localStorage.getItem('refresh_token')`
- [ ] Check refresh token not expired (7 days)
- [ ] Try logging in again
- [ ] Check Django logs for errors

### Issue: Activity Not Tracked
- [ ] Check Django middleware is active
- [ ] Check user is authenticated
- [ ] Check JWT token is valid
- [ ] Query Activity model in Django shell
- [ ] Check Django logs for errors

---

## 📊 Success Criteria

### Must Have (Critical)
- [x] Frontend calls Django API (not Next.js routes)
- [x] JWT authentication works
- [x] Token refresh works automatically
- [ ] Activity tracking records actions
- [ ] User can register and login
- [ ] Dashboard displays real data

### Should Have (Important)
- [ ] All pages load without errors
- [ ] Search and filters work
- [ ] Progress tracking works
- [ ] Instructor analytics work
- [ ] No CORS errors
- [ ] No console errors

### Nice to Have (Optional)
- [ ] Error toast notifications
- [ ] Loading states
- [ ] Retry logic
- [ ] Offline mode detection
- [ ] Performance optimizations

---

## 📝 Documentation Checklist

### Created Documents
- [x] `FRONTEND_BACKEND_INTEGRATION_COMPLETE.md` - Technical details
- [x] `INTEGRATION_QUICK_START.md` - Quick start guide
- [x] `INTEGRATION_SUMMARY.md` - Executive summary
- [x] `INTEGRATION_ARCHITECTURE.md` - Architecture diagrams
- [x] `INTEGRATION_CHECKLIST.md` - This checklist
- [x] `frontend/.env.local` - Environment config

### Existing Documents
- [x] `API_SPECIFICATION.md` - API documentation
- [x] `FRONTEND_BACKEND_DISCONNECT_ANALYSIS.md` - Problem analysis
- [x] `FRONTEND_DJANGO_INTEGRATION_PLAN.md` - Integration plan

---

## 🚀 Deployment Checklist (Future)

### Frontend Deployment
- [ ] Update `NEXT_PUBLIC_API_URL` to production URL
- [ ] Build Next.js: `npm run build`
- [ ] Test production build: `npm start`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Verify environment variables set

### Backend Deployment
- [ ] Update `ALLOWED_HOSTS` to production domain
- [ ] Update `CORS_ALLOWED_ORIGINS` to production frontend URL
- [ ] Set `DEBUG = False`
- [ ] Configure production database (PostgreSQL)
- [ ] Collect static files: `python manage.py collectstatic`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Deploy to hosting (AWS, Heroku, DigitalOcean, etc.)
- [ ] Configure HTTPS/SSL

### Post-Deployment
- [ ] Test authentication flow
- [ ] Test all pages load
- [ ] Test API endpoints
- [ ] Monitor error logs
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Set up backups

---

## 📞 Support Resources

### Documentation
- Django REST Framework: https://www.django-rest-framework.org/
- Next.js: https://nextjs.org/docs
- JWT: https://jwt.io/

### Project Documents
- `API_SPECIFICATION.md` - Complete API reference
- `INTEGRATION_QUICK_START.md` - Quick start guide
- `INTEGRATION_ARCHITECTURE.md` - Architecture details

### Debugging Commands
```bash
# Django shell
python manage.py shell

# Check activities
from activity.models import Activity
Activity.objects.all()

# Check users
from core.models import User
User.objects.all()

# Frontend console
localStorage.getItem('access_token')
localStorage.getItem('user')
```

---

**Last Updated**: December 4, 2024  
**Status**: Implementation Complete, Testing In Progress
