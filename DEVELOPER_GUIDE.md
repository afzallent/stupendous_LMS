# Developer Guide - Frontend/Backend Integration

## Quick Start

### Running the Application

1. **Start Django Backend:**
```bash
cd backend
python manage.py runserver
# Runs on http://localhost:8000
```

2. **Start Next.js Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

3. **Access the App:**
- Frontend: http://localhost:3000
- Django Admin: http://localhost:8000/admin/
- Django API: http://localhost:8000/api/

## Making API Calls from Frontend

### ❌ DON'T DO THIS (Old Pattern)
```typescript
// This will fail - no Next.js API routes exist!
const response = await fetch('/api/courses', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### ✅ DO THIS (Correct Pattern)

#### Option 1: Use Django API Client (Recommended)
```typescript
import { djangoApi } from '@/lib/django-api-client'

// GET request
const courses = await djangoApi.get('/api/courses/')

// POST request
const newCourse = await djangoApi.post('/api/courses/', {
  title: 'My Course',
  description: 'Course description'
})

// File upload
const formData = new FormData()
formData.append('file', file)
const result = await djangoApi.upload('/api/courses/upload/', formData)
```

#### Option 2: Use Auth Context for Auth Operations
```typescript
import { useAuth } from '@/lib/auth'

function MyComponent() {
  const { login, signup, logout, user, isAuthenticated } = useAuth()
  
  const handleLogin = async () => {
    const success = await login(email, password)
    if (success) {
      // User is logged in, tokens are stored
    }
  }
  
  const handleSignup = async () => {
    const success = await signup(name, email, password)
    if (success) {
      // User is registered and logged in
    }
  }
  
  const handleLogout = async () => {
    await logout()
    // User is logged out, redirected to login
  }
}
```

## Django API Endpoints

### Authentication
- `POST /api/auth/login/` - Login
  ```json
  { "username": "user@example.com", "password": "password123" }
  ```
- `POST /api/auth/register/` - Register
  ```json
  {
    "username": "user@example.com",
    "email": "user@example.com",
    "password": "password123",
    "password_confirm": "password123",
    "is_student": true,
    "is_instructor": false
  }
  ```
- `POST /api/auth/token/refresh/` - Refresh token
  ```json
  { "refresh": "refresh_token_here" }
  ```
- `GET /api/auth/me/` - Get current user (requires auth)

### Courses
- `GET /api/courses/` - List courses
  - Query params: `?search=python&category=1&ordering=-created_at`
- `POST /api/courses/` - Create course (instructor only)
- `GET /api/courses/{id}/` - Get course details
- `PUT /api/courses/{id}/` - Update course
- `DELETE /api/courses/{id}/` - Delete course
- `POST /api/courses/{id}/enroll/` - Enroll in course
- `GET /api/courses/{id}/lessons/` - List lessons
- `POST /api/courses/{id}/lessons/` - Create lesson

### Lessons
- `GET /api/lessons/{id}/` - Get lesson
- `PUT /api/lessons/{id}/` - Update lesson
- `DELETE /api/lessons/{id}/` - Delete lesson
- `POST /api/lessons/{id}/mark-complete/` - Mark complete

### Dashboards
- `GET /api/student/dashboard/` - Student dashboard
- `GET /api/instructor/dashboard/` - Instructor dashboard

### Categories
- `GET /api/categories/` - List categories

## Common Patterns

### Protected Routes
```typescript
'use client'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, loading, router])
  
  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return null
  
  return <div>Protected content</div>
}
```

### Role-Based Access
```typescript
const { user, hasRole } = useAuth()

if (hasRole('TRAINER')) {
  // Show instructor features
}

if (hasRole('STUDENT')) {
  // Show student features
}

if (hasRole('ADMIN')) {
  // Show admin features
}
```

### Error Handling
```typescript
try {
  const data = await djangoApi.get('/api/courses/')
  setCourses(data.results)
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - redirect to login
    router.push('/auth/login')
  } else if (error.status === 403) {
    // Forbidden - show error message
    toast({ title: 'Access Denied', variant: 'destructive' })
  } else {
    // Other errors
    toast({ title: 'Error', description: error.message })
  }
}
```

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```bash
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## Troubleshooting

### Issue: "Failed to fetch" or 404 errors
**Cause:** Frontend trying to call `/api/*` routes that don't exist
**Solution:** Use `djangoApi` client instead of direct fetch to `/api/*`

### Issue: "401 Unauthorized"
**Cause:** Missing or expired JWT token
**Solution:** 
1. Check if user is logged in: `const { isAuthenticated } = useAuth()`
2. Token refresh happens automatically in `djangoApi` client
3. If refresh fails, user is redirected to login

### Issue: "CORS error"
**Cause:** Django not configured to allow requests from Next.js
**Solution:** Check Django `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`

### Issue: "Network error"
**Cause:** Django backend not running
**Solution:** Start Django: `cd backend && python manage.py runserver`

## File Structure

```
project/
├── backend/                 # Django backend
│   ├── manage.py
│   ├── lms_project/        # Django settings
│   ├── core/               # Auth app
│   ├── courses/            # Courses app
│   └── db.sqlite3
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages
│   │   ├── components/    # React components
│   │   ├── lib/
│   │   │   ├── auth.tsx              # Auth context
│   │   │   └── django-api-client.ts  # API client
│   │   └── contexts/      # React contexts
│   └── package.json
│
└── docs/                  # Documentation
```

## Best Practices

1. **Always use `djangoApi` for API calls** - Don't use direct fetch to `/api/*`
2. **Use `useAuth()` for authentication** - Don't manage tokens manually
3. **Handle loading states** - Show loaders while fetching data
4. **Handle errors gracefully** - Show user-friendly error messages
5. **Check authentication** - Redirect to login if not authenticated
6. **Use TypeScript** - Define interfaces for API responses
7. **Test with both backends running** - Django on :8000, Next.js on :3000

## Migration Checklist

When you find old API calls:

- [ ] Identify the endpoint (e.g., `/api/courses`)
- [ ] Find the Django equivalent (e.g., `/api/courses/`)
- [ ] Replace `fetch('/api/...')` with `djangoApi.get('/api/...')`
- [ ] Update request/response handling
- [ ] Test the functionality
- [ ] Remove any manual token management
