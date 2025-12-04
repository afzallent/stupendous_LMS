# Frontend Integration Execution Guide

## Current State: BROKEN
Frontend calls Next.js API routes with Prisma → Django REST API never called → Phase 1 features don't work end-to-end

## Target State: WORKING
Frontend calls Django REST API directly → Activity tracking works → All Phase 1 features exercised end-to-end

---

## Step 1: Update Home Page

**File**: `frontend/src/app/page.tsx`

### Current (Lines 56-73) - BROKEN
```typescript
const [coursesRes, categoriesRes, statsRes] = await Promise.all([
  fetch('/api/featured-courses'),      // ❌ Next.js route
  fetch('/api/categories'),             // ❌ Next.js route
  fetch('/api/stats')                   // ❌ Next.js route
])
```

### Replace With:
```typescript
import { djangoApi } from '@/lib/django-api-client'

useEffect(() => {
  const fetchData = async () => {
    try {
      // Call Django REST API directly
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

  fetchData()
}, [])
```

---

## Step 2: Update Courses Page

**File**: `frontend/src/app/courses/page.tsx`

### Current (Lines 75-97) - BROKEN
```typescript
const response = await fetch(`/api/courses?${params}`)  // ❌ Next.js route
const data = await response.json()
setCourses(data)
```

### Replace With:
```typescript
import { djangoApi } from '@/lib/django-api-client'

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

  fetchCourses()
}, [searchQuery, selectedCategory, selectedLevel, selectedPrice, sortBy])
```

---

## Step 3: Update Student Dashboard

**File**: `frontend/src/app/learn/page.tsx`

### Current (Lines 74-118) - BROKEN
```typescript
const apiUrl = `/api/student/dashboard?userId=${userData.id}`  // ❌ Next.js route
const response = await fetch(apiUrl)

if (response.ok) {
  const data = await response.json()
  setEnrolledCourses(data.data.enrolledCourses)
  setAchievements(data.data.achievements)
  setStats(data.data.stats)
}
```

### Replace With:
```typescript
import { djangoApi } from '@/lib/django-api-client'

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

---

## Step 4: Delete Next.js API Routes

These are no longer needed - Django API handles everything:

```bash
# Delete all Next.js API routes
rm -rf frontend/src/app/api/

# Delete Prisma (no longer needed)
rm -rf frontend/prisma/
rm frontend/src/lib/db.ts

# Update package.json - remove these dependencies:
# - @prisma/client
# - prisma
```

---

## Step 5: Environment Configuration

**File**: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Step 6: Verify Integration

### Start Both Servers

```bash
# Terminal 1: Start Django backend
cd backend
python manage.py runserver

# Terminal 2: Start Next.js frontend
cd frontend
npm run dev
```

### Test Checklist

- [ ] Home page loads featured courses from Django
- [ ] Courses page displays courses from Django
- [ ] Search/filters work with Django API
- [ ] Student dashboard shows enrolled courses from Django
- [ ] Activity tracking records API calls in Django
- [ ] No console errors about API calls
- [ ] JWT tokens are being sent in Authorization header

### Verify Activity Tracking

```bash
# Check Django admin
http://localhost:8000/admin/activity/useractivity/

# Should see records for:
# - GET /api/courses/
# - GET /api/categories/
# - GET /api/student/dashboard/
# - etc.
```

---

## Step 7: Update Authentication (Optional but Recommended)

**File**: `frontend/src/lib/auth.tsx`

Replace NextAuth with Django JWT:

```typescript
import { djangoApi } from '@/lib/django-api-client'

export const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, isLoading] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
      setIsAuthenticated(true)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await djangoApi.login(email, password)
    setUser(response.user)
    setIsAuthenticated(true)
    return response
  }

  const register = async (data: any) => {
    const response = await djangoApi.register(data)
    setUser(response.user)
    setIsAuthenticated(true)
    return response
  }

  const logout = async () => {
    await djangoApi.logout()
    setUser(null)
    setIsAuthenticated(false)
  }

  return { user, isAuthenticated, isLoading, login, register, logout }
}
```

---

## Expected Results After Integration

### ✅ Phase 1 Features Now Work End-to-End
- Featured courses display from Django database
- Course search/filters query Django API
- Student enrollments tracked in Django
- Progress tracking works with Django ORM

### ✅ Activity Tracking Now Works
- All API calls recorded by Django middleware
- User activity visible in Django admin
- Analytics calculated from activity data

### ✅ Instructor Dashboard Now Works
- Shows real student data from Django
- Analytics calculated from activity tracking
- Course management uses Django API

### ✅ Single Source of Truth
- One database (Django SQLite)
- One ORM (Django ORM)
- Consistent data across all features

---

## Troubleshooting

### Issue: CORS Errors
**Solution**: Ensure Django CORS settings allow frontend origin
```python
# backend/lms_project/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Issue: 401 Unauthorized
**Solution**: Check JWT tokens are being sent
```typescript
// Django API client automatically adds:
// Authorization: Bearer <access_token>
```

### Issue: Token Expired
**Solution**: Django API client automatically refreshes on 401

### Issue: Data Format Mismatch
**Solution**: Transform Django response to match frontend interface
```typescript
// Django returns: { results: [...], count: 10 }
// Frontend expects: [...]
const courses = data.results.map(transformCourse)
```

### Issue: 404 Not Found
**Solution**: Verify Django API endpoints exist
```bash
# Check available endpoints
curl http://localhost:8000/api/courses/
curl http://localhost:8000/api/categories/
curl http://localhost:8000/api/student/dashboard/
```

---

## Summary

| Step | File | Change | Status |
|------|------|--------|--------|
| 1 | `frontend/src/app/page.tsx` | Replace `/api/featured-courses` with `/api/courses/?featured=true` | TODO |
| 2 | `frontend/src/app/courses/page.tsx` | Replace `/api/courses` with `/api/courses/` | TODO |
| 3 | `frontend/src/app/learn/page.tsx` | Replace `/api/student/dashboard` with `/api/student/dashboard/` | TODO |
| 4 | `frontend/src/app/api/` | Delete all Next.js API routes | TODO |
| 5 | `frontend/.env.local` | Add `NEXT_PUBLIC_API_URL=http://localhost:8000` | TODO |
| 6 | Testing | Verify all features work with Django API | TODO |

**Estimated Time**: 2-3 hours
**Complexity**: Low (mostly copy-paste with data transformation)
**Risk**: Very Low (Django API client handles all edge cases)

Once complete, Phase 1 features will be fully exercised end-to-end against the Django backend.
