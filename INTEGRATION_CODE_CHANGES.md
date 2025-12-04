# Integration Code Changes

This document shows the exact code changes needed to connect the frontend to Django backend.

## 1. Environment Configuration

**File**: `frontend/.env.local` (create if doesn't exist)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 2. Update Home Page

**File**: `frontend/src/app/page.tsx`

### Before (Lines 56-72):
```typescript
const [coursesRes, categoriesRes, statsRes] = await Promise.all([
  fetch('/api/featured-courses'),
  fetch('/api/categories'),
  fetch('/api/stats')
])

const coursesData = await coursesRes.json()
const categoriesData = await categoriesRes.json()
const statsData = await statsRes.json()

setFeaturedCourses(coursesData)
setCategories(categoriesData)
setStats(statsData)
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

// At top of component
const fetchData = async () => {
  try {
    const [coursesData, categoriesData] = await Promise.all([
      djangoApi.get('/api/courses/', { featured: true, limit: 6 }),
      djangoApi.get('/api/categories/')
    ])

    // Transform Django response to frontend format
    const courses = coursesData.results.map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor.name,
      rating: course.rating || 4.5,
      students: course.enrolled_count || 0,
      price: parseFloat(course.price),
      level: course.level,
      category: course.category.name,
      featured: course.featured,
      duration: course.duration || '10h 30m'
    }))

    const categories = categoriesData.results.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '📚',
      courses: cat.course_count || 0
    }))

    const stats = [
      { icon: 'Users', label: 'Active Students', value: '50K+', color: 'text-blue-400' },
      { icon: 'BookOpen', label: 'Total Courses', value: coursesData.count.toString(), color: 'text-green-400' },
      { icon: 'Award', label: 'Certificates', value: '10K+', color: 'text-yellow-400' },
      { icon: 'TrendingUp', label: 'Success Rate', value: '95%', color: 'text-purple-400' }
    ]

    setFeaturedCourses(courses)
    setCategories(categories)
    setStats(stats)
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    setLoading(false)
  }
}
```

## 3. Update Courses Page

**File**: `frontend/src/app/courses/page.tsx`

### Before (Lines 75-97):
```typescript
const params = new URLSearchParams({
  search: searchQuery,
  category: selectedCategory,
  level: selectedLevel,
  price: selectedPrice,
  sort: sortBy
})

const response = await fetch(`/api/courses?${params}`)
const data = await response.json()
setCourses(data)
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const fetchCourses = async () => {
  try {
    const params: any = {}
    
    if (searchQuery) params.search = searchQuery
    if (selectedCategory !== 'all') params.category = selectedCategory
    if (selectedLevel !== 'all') params.level = selectedLevel
    if (selectedPrice !== 'all') params.price_range = selectedPrice
    
    // Map sort options to Django ordering
    const sortMap: Record<string, string> = {
      'popular': '-enrolled_count',
      'rating': '-rating',
      'newest': '-created_at',
      'price-low': 'price',
      'price-high': '-price'
    }
    params.ordering = sortMap[sortBy] || '-enrolled_count'

    const data = await djangoApi.get('/api/courses/', params)
    
    // Transform Django response
    const courses = data.results.map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor.name,
      rating: course.rating || 4.5,
      students: course.enrolled_count || 0,
      price: parseFloat(course.price),
      level: course.level,
      category: course.category.name,
      enrolled: course.is_enrolled || false,
      duration: course.duration || '10h 30m',
      lectures: course.lesson_count || 0
    }))
    
    setCourses(courses)
  } catch (error) {
    console.error('Error fetching courses:', error)
  } finally {
    setLoading(false)
  }
}
```

## 4. Update Student Dashboard

**File**: `frontend/src/app/learn/page.tsx`

### Before (Lines 74-118):
```typescript
const apiUrl = `/api/student/dashboard?userId=${userData.id}`
const response = await fetch(apiUrl)

if (response.ok) {
  const data = await response.json()
  setEnrolledCourses(data.data.enrolledCourses)
  setAchievements(data.data.achievements)
  setStats(data.data.stats)
}
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const fetchDashboardData = async () => {
  try {
    // Check authentication first
    const storedUser = localStorage.getItem('user')
    
    if (!storedUser) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }

    const userData = JSON.parse(storedUser)
    setUser(userData)

    // Fetch dashboard data from Django API
    const data = await djangoApi.get('/api/student/dashboard/')
    
    // Transform Django response
    const enrolledCourses = data.enrollments.map((enrollment: any) => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      instructor: enrollment.course.instructor.name,
      progress: enrollment.progress_percentage || 0,
      totalLessons: enrollment.course.lesson_count || 0,
      completedLessons: enrollment.completed_lessons || 0,
      nextLesson: enrollment.next_lesson ? {
        id: enrollment.next_lesson.id,
        title: enrollment.next_lesson.title
      } : null
    }))

    const stats = {
      totalEnrolled: data.total_enrolled || 0,
      totalCompleted: data.total_completed || 0,
      totalHours: data.total_hours || 0,
      currentStreak: data.current_streak || 0
    }

    const achievements = data.achievements || []

    setEnrolledCourses(enrolledCourses)
    setAchievements(achievements)
    setStats(stats)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    
    // If authentication error, redirect to login
    if ((error as any).status === 401) {
      localStorage.clear()
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }
  } finally {
    setLoading(false)
  }
}
```

## 5. Update Authentication

**File**: `frontend/src/app/auth/login/page.tsx`

### Before:
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const response = await djangoApi.login(email, password)
    
    // User data is automatically stored by djangoApi.login()
    // Redirect to dashboard based on role
    const user = response.user
    const role = user.is_staff ? 'ADMIN' : 
                 user.is_instructor ? 'TRAINER' : 'STUDENT'
    
    if (role === 'ADMIN') {
      router.push('/admin')
    } else if (role === 'TRAINER') {
      router.push('/instructor')
    } else {
      router.push('/learn')
    }
  } catch (error: any) {
    setError(error.message || 'Login failed. Please check your credentials.')
  } finally {
    setLoading(false)
  }
}
```

## 6. Update Registration

**File**: `frontend/src/app/auth/register/page.tsx`

### Before:
```typescript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, name, role })
})
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    await djangoApi.register({
      email,
      password,
      name,
      role: role as 'student' | 'instructor'
    })
    
    // Redirect to appropriate dashboard
    if (role === 'instructor') {
      router.push('/instructor')
    } else {
      router.push('/learn')
    }
  } catch (error: any) {
    setError(error.message || 'Registration failed. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

## 7. Update Logout

**File**: All pages with logout functionality

### Before:
```typescript
const handleLogout = async () => {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  window.location.href = '/'
}
```

### After:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const handleLogout = async () => {
  await djangoApi.logout()
  window.location.href = '/'
}
```

## 8. Update Instructor Dashboard

**File**: `frontend/src/app/instructor/page.tsx`

### Add at top:
```typescript
import { djangoApi } from '@/lib/django-api-client'

const fetchInstructorData = async () => {
  try {
    const [analytics, activity, students] = await Promise.all([
      djangoApi.get('/api/instructor/analytics/'),
      djangoApi.get('/api/instructor/activity/'),
      djangoApi.get('/api/instructor/students/')
    ])

    // Transform and set data
    // ... (transform based on Django response structure)
  } catch (error) {
    console.error('Error fetching instructor data:', error)
  }
}
```

## 9. Delete Unused Files

After implementing the above changes, delete:

```bash
# Delete Next.js API routes
rm -rf frontend/src/app/api/

# Delete Prisma
rm -rf frontend/prisma/
rm frontend/src/lib/db.ts

# Update package.json to remove Prisma dependencies
# Remove: @prisma/client, prisma
```

## 10. Update package.json

**File**: `frontend/package.json`

Remove these dependencies:
```json
{
  "dependencies": {
    "@prisma/client": "...",  // REMOVE
    "prisma": "..."            // REMOVE
  }
}
```

## Testing Commands

```bash
# Start Django backend
cd backend
python manage.py runserver

# Start Next.js frontend (in another terminal)
cd frontend
npm run dev

# Test the integration
# 1. Open http://localhost:3000
# 2. Register a new user
# 3. Login
# 4. Browse courses
# 5. Enroll in a course
# 6. Check student dashboard
# 7. Check activity tracking in Django admin
```

## Verification Checklist

- [ ] Home page loads featured courses from Django
- [ ] Courses page filters work with Django API
- [ ] User can register via Django API
- [ ] User can login and receive JWT tokens
- [ ] Token refresh works automatically on expiry
- [ ] Student dashboard shows enrolled courses from Django
- [ ] Instructor dashboard shows analytics from Django
- [ ] Activity tracking records all API calls
- [ ] Logout clears tokens and redirects
- [ ] No console errors related to API calls

## Common Issues and Solutions

### Issue: CORS errors
**Solution**: Ensure Django CORS settings allow frontend origin
```python
# backend/lms_project/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Issue: 401 Unauthorized
**Solution**: Check that JWT tokens are being sent in Authorization header
```typescript
// Django API client automatically adds: Authorization: Bearer <token>
```

### Issue: Token expired
**Solution**: Django API client automatically refreshes tokens on 401

### Issue: Data format mismatch
**Solution**: Transform Django response to match frontend interface
```typescript
// Django returns: { results: [...], count: 10 }
// Frontend expects: [...]
const courses = data.results.map(transformCourse)
```
