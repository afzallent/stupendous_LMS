# Frontend-Backend Integration Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Start Django Backend
```bash
cd backend
python manage.py runserver
```

Django will run on `http://localhost:8000`

### Step 2: Start Next.js Frontend
```bash
cd frontend
npm install  # If first time
npm run dev
```

Next.js will run on `http://localhost:3000`

### Step 3: Test the Integration

#### Option A: Create New User
1. Go to `http://localhost:3000/auth/login`
2. Click "Sign Up"
3. Fill in the form:
   - Name: Test Student
   - Email: student@test.com
   - Password: testpass123
4. Click "Sign Up"
5. You should be logged in automatically

#### Option B: Use Django Admin to Create User
```bash
cd backend
python manage.py createsuperuser
# Follow prompts to create admin user

# Or create via Django shell
python manage.py shell
```

```python
from core.models import User

# Create student
student = User.objects.create_user(
    username='student1',
    email='student@test.com',
    password='testpass123',
    is_student=True
)

# Create instructor
instructor = User.objects.create_user(
    username='instructor1',
    email='instructor@test.com',
    password='testpass123',
    is_instructor=True
)
```

---

## ✅ Verification Checklist

### 1. Authentication Works
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] JWT tokens stored in localStorage
- [ ] User data displayed in dashboard

**Check in Browser Console:**
```javascript
localStorage.getItem('access_token')  // Should show JWT token
localStorage.getItem('user')          // Should show user data
```

### 2. Home Page Works
- [ ] Featured courses displayed
- [ ] Categories displayed
- [ ] No console errors

**Check Network Tab:**
- Should see: `GET http://localhost:8000/api/courses/?featured=true&limit=6`
- Should see: `GET http://localhost:8000/api/categories/`

### 3. Courses Page Works
- [ ] Courses list displayed
- [ ] Search works
- [ ] Category filter works
- [ ] No console errors

**Check Network Tab:**
- Should see: `GET http://localhost:8000/api/courses/?search=...&category=...`

### 4. Student Dashboard Works
- [ ] Login as student
- [ ] Dashboard displays enrolled courses
- [ ] Stats displayed
- [ ] No console errors

**Check Network Tab:**
- Should see: `GET http://localhost:8000/api/student/dashboard/`
- Should have: `Authorization: Bearer <token>` header

### 5. Instructor Dashboard Works
- [ ] Login as instructor
- [ ] Dashboard displays analytics
- [ ] Courses list displayed
- [ ] Activity feed displayed

**Check Network Tab:**
- Should see: `GET http://localhost:8000/api/instructor/analytics/`
- Should see: `GET http://localhost:8000/api/instructor/activity/`

---

## 🔍 Debugging Tips

### Issue: "Failed to fetch"
**Cause**: Django backend not running  
**Solution**: Start Django with `python manage.py runserver`

### Issue: "401 Unauthorized"
**Cause**: No JWT token or expired token  
**Solution**: 
1. Clear localStorage: `localStorage.clear()`
2. Login again
3. Check token: `localStorage.getItem('access_token')`

### Issue: "CORS Error"
**Cause**: Django CORS not configured  
**Solution**: Check `backend/lms_project/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Issue: "Network Error"
**Cause**: Wrong API URL  
**Solution**: Check `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Issue: No data displayed
**Cause**: Empty database  
**Solution**: Create test data via Django admin or shell

---

## 📊 Activity Tracking Verification

### Check Activity is Being Recorded

1. **Login as student**
2. **Browse courses** (visit `/courses`)
3. **View course details** (click on a course)
4. **Check Django database**:

```bash
cd backend
python manage.py shell
```

```python
from activity.models import Activity

# View all activities
activities = Activity.objects.all()
for activity in activities:
    print(f"{activity.user.username} - {activity.action_type} - {activity.timestamp}")

# View activities for specific user
user_activities = Activity.objects.filter(user__email='student@test.com')
print(f"Total activities: {user_activities.count()}")
```

### Expected Activities
- `view_course` - When viewing course details
- `view_lesson` - When viewing lesson
- `complete_lesson` - When completing lesson
- `enroll_course` - When enrolling in course

---

## 🎯 Test Scenarios

### Scenario 1: Student Journey
1. Register as student
2. Browse courses
3. Enroll in a course
4. View lessons
5. Complete a lesson
6. Check progress in dashboard

### Scenario 2: Instructor Journey
1. Register as instructor
2. Create a course
3. Add lessons to course
4. Publish course
5. View analytics
6. Check student progress

### Scenario 3: Activity Tracking
1. Login as student
2. Perform various actions (browse, enroll, view lessons)
3. Check Django database for recorded activities
4. Verify timestamps and action types

---

## 🔧 Common Commands

### Django Commands
```bash
# View all users
python manage.py shell -c "from core.models import User; print(User.objects.all())"

# View all courses
python manage.py shell -c "from courses.models import Course; print(Course.objects.all())"

# View all activities
python manage.py shell -c "from activity.models import Activity; print(Activity.objects.count())"

# Reset database (WARNING: Deletes all data)
python manage.py flush
python manage.py migrate
```

### Frontend Commands
```bash
# Clear browser cache
# In browser console:
localStorage.clear()
location.reload()

# Check environment variables
# In browser console:
console.log(process.env.NEXT_PUBLIC_API_URL)
```

---

## 📝 API Endpoints Reference

### Authentication
- `POST /api/auth/register/` - Register
- `POST /api/auth/login/` - Login
- `POST /api/auth/token/refresh/` - Refresh token
- `GET /api/auth/me/` - Get current user

### Courses
- `GET /api/courses/` - List courses
- `GET /api/courses/{id}/` - Course details
- `POST /api/courses/` - Create course (instructor)

### Student
- `GET /api/student/dashboard/` - Dashboard data

### Instructor
- `GET /api/instructor/analytics/` - Analytics
- `GET /api/instructor/activity/` - Activity feed

### Activity
- `GET /api/activity/` - List activities
- `GET /api/activity/user/{user_id}/` - User activities

---

## 🎉 Success Indicators

You'll know the integration is working when:

1. ✅ No Next.js API routes are being called (check Network tab)
2. ✅ All requests go to `http://localhost:8000/api/`
3. ✅ JWT tokens are in localStorage
4. ✅ Activity records appear in Django database
5. ✅ User data is consistent between frontend and backend
6. ✅ No CORS errors in console
7. ✅ Dashboard displays real data from Django

---

## 📞 Need Help?

### Check Logs

**Django Logs:**
```bash
# Terminal where Django is running
# Look for API requests like:
# "GET /api/courses/ HTTP/1.1" 200
```

**Frontend Logs:**
```javascript
// Browser console
// Look for:
// "📊 Calling Django dashboard API: http://localhost:8000/api/student/dashboard/"
// "📚 Dashboard data received from Django: {...}"
```

### Verify Configuration

**Django:**
```bash
cd backend
python manage.py check
```

**Frontend:**
```bash
cd frontend
cat .env.local  # Should show NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

**Last Updated**: December 4, 2024  
**Status**: Ready for Testing ✅
