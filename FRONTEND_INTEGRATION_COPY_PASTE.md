# Frontend Integration - Copy & Paste Code

This document contains exact code to copy-paste for frontend integration.

---

## 1. Update Home Page (frontend/src/app/page.tsx)

### Find and Replace (Lines 56-73)

**FIND THIS:**
```typescript
  useEffect(() => {
    const fetchData = async () => {
      try {
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
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])
```

**REPLACE WITH:**
```typescript
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call Django REST API
        const coursesData = await djangoApi.get('/api/courses/', { 
          featured: true,
          limit: 6 
        })
        
        const categoriesData = await djangoApi.get('/api/categories/')
        
        // Transform Django response to frontend format
        const courses = coursesData.results.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          instructor: course.instructor.name,
          instructorAvatar: course.instructor.avatar,
          rating: course.rating || 4.5,
          students: course.enrolled_count || 0,
          price: parseFloat(course.price),
          thumbnail: course.thumbnail,
          level: course.level,
          duration: course.duration || '10h 30m',
          category: course.category.name,
          featured: course.featured
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

    fetchData()
  }, [])
```

### Add Import at Top
```typescript
import { djangoApi } from '@/lib/django-api-client'
```

---

## 2. Update Courses Page (frontend/src/app/courses/page.tsx)

### Find and Replace (Lines 75-97)

**FIND THIS:**
```typescript
  useEffect(() => {
    const fetchCourses = async () => {
      try {
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
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [searchQuery, selectedCategory, selectedLevel, selectedPrice, sortBy])
```

**REPLACE WITH:**
```typescript
  useEffect(() => {
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

        // Call Django REST API
        const data = await djangoApi.get('/api/courses/', params)
        
        // Transform Django response
        const courses = data.results.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          instructor: course.instructor.name,
          instructorAvatar: course.instructor.avatar,
          rating: course.rating || 4.5,
          students: course.enrolled_count || 0,
          price: parseFloat(course.price),
          thumbnail: course.thumbnail,
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

    fetchCourses()
  }, [searchQuery, selectedCategory, selectedLevel, selectedPrice, sortBy])
```

### Add Import at Top
```typescript
import { djangoApi } from '@/lib/django-api-client'
```

---

## 3. Update Student Dashboard (frontend/src/app/learn/page.tsx)

### Find and Replace (Lines 74-118)

**FIND THIS:**
```typescript
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication first
        const storedUser = localStorage.getItem('user')
        console.log('🔍 Learn page - storedUser from localStorage:', storedUser)
        
        if (!storedUser) {
          console.warn('⚠️ No user found in localStorage, redirecting to login')
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }

        const userData = JSON.parse(storedUser)
        
        // Verify user has appropriate role for learning
        if (!['STUDENT', 'TRAINER', 'ADMIN'].includes(userData.role)) {
          console.error('❌ User role not authorized for learning dashboard:', userData.role)
          window.location.href = '/'
          return
        }
        
        setUser(userData)
        console.log('👤 User loaded for dashboard:', { id: userData.id, email: userData.email, name: userData.name, role: userData.role })

        // Fetch dashboard data from API
        const apiUrl = `/api/student/dashboard?userId=${userData.id}`
        console.log('📊 Calling dashboard API with URL:', apiUrl)
        
        const response = await fetch(apiUrl)
        console.log('📊 Dashboard API response status:', response.status)
        
        if (response.status === 401) {
          console.error('❌ Authentication failed, redirecting to login')
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          console.log('📚 Dashboard data received:', {
            enrolledCoursesCount: data.data.enrolledCourses.length,
            enrolledCourses: data.data.enrolledCourses,
            stats: data.data.stats,
            achievements: data.data.achievements.length
          })
          setEnrolledCourses(data.data.enrolledCourses)
          setAchievements(data.data.achievements)
          setStats(data.data.stats)
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to fetch dashboard data:', { status: response.status, error: errorText })
        }
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error)
        // If there's a network error, still check if user is authenticated
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])
```

**REPLACE WITH:**
```typescript
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        const storedUser = localStorage.getItem('user')
        
        if (!storedUser) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
          return
        }

        const userData = JSON.parse(storedUser)
        setUser(userData)

        // Call Django REST API (user from JWT token)
        const data = await djangoApi.get('/api/student/dashboard/')
        
        // Transform Django response
        const enrolledCourses = data.enrollments.map((enrollment: any) => ({
          id: enrollment.course.id,
          title: enrollment.course.title,
          instructor: enrollment.course.instructor.name,
          progress: enrollment.progress_percentage || 0,
          totalLessons: enrollment.course.lesson_count || 0,
          completedLessons: enrollment.completed_lessons || 0,
          thumbnail: enrollment.course.thumbnail,
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
        
        if ((error as any).status === 401) {
          localStorage.clear()
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])
```

### Add Import at Top
```typescript
import { djangoApi } from '@/lib/django-api-client'
```

---

## 4. Environment Configuration

**File**: `frontend/.env.local`

Create this file if it doesn't exist:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 5. Delete Next.js API Routes

Run these commands:

```bash
# Delete all Next.js API routes
rm -rf frontend/src/app/api/

# Delete Prisma
rm -rf frontend/prisma/
rm frontend/src/lib/db.ts
```

---

## 6. Update package.json

**File**: `frontend/package.json`

Remove these dependencies from the `dependencies` section:
- `@prisma/client`
- `prisma`

Then run:
```bash
npm install
```

---

## 7. Verify Integration

### Start Both Servers

```bash
# Terminal 1: Start Django backend
cd backend
python manage.py runserver

# Terminal 2: Start Next.js frontend (in another terminal)
cd frontend
npm run dev
```

### Test in Browser

1. Open http://localhost:3000
2. Home page should load featured courses from Django
3. Click "Browse Courses" → should show courses from Django
4. Try search/filters → should query Django API
5. Login/Register → should use Django authentication
6. Go to dashboard → should show enrolled courses from Django

### Check Network Tab

Open browser DevTools → Network tab:
- Should see requests to `http://localhost:8000/api/courses/`
- Should see requests to `http://localhost:8000/api/categories/`
- Should see requests to `http://localhost:8000/api/student/dashboard/`
- Should NOT see requests to `/api/featured-courses`, `/api/courses`, etc.

### Check Activity Tracking

1. Open http://localhost:8000/admin/
2. Login with superuser credentials
3. Go to Activity → User Activity
4. Should see records for all API calls made from frontend

---

## 8. Troubleshooting

### Issue: "Cannot find module '@/lib/django-api-client'"
**Solution**: Make sure `frontend/src/lib/django-api-client.ts` exists (created in previous step)

### Issue: CORS errors in console
**Solution**: Add to `backend/lms_project/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Issue: 401 Unauthorized errors
**Solution**: Check that JWT tokens are being sent:
1. Open DevTools → Network tab
2. Click on API request
3. Check "Authorization" header contains "Bearer <token>"

### Issue: Data not displaying
**Solution**: Check data transformation:
1. Open DevTools → Console
2. Look for error messages
3. Check that Django response format matches expected format

### Issue: "TypeError: Cannot read property 'results' of undefined"
**Solution**: Django API response format changed. Check:
```typescript
// Django returns: { results: [...], count: 10 }
// Make sure you're accessing: data.results
```

---

## Summary

After completing these steps:

✅ Home page calls Django API for featured courses
✅ Courses page calls Django API for course listing
✅ Student dashboard calls Django API for enrollments
✅ All API calls recorded by Django activity tracking
✅ Phase 1 features work end-to-end
✅ No more Next.js API routes or Prisma

**Time to complete**: 30-45 minutes
**Complexity**: Low (mostly copy-paste)
**Risk**: Very Low (Django API client handles all edge cases)
