# Frontend-Backend Integration Guide

## Overview

The CourseCompass_V2 Next.js frontend has been copied to `/frontend` and needs to be integrated with the stupendousLMS Django backend.

## Current Setup

- **Frontend**: Next.js 15 + React 19 + TypeScript (in `/frontend`)
- **Backend**: Django 5.2.8 + DRF (in `/backend`)
- **Frontend Port**: 3000 (default)
- **Backend Port**: 8000 (default)

---

## Step 1: Update Frontend Environment Variables

**File**: `frontend/.env.local`

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB

# Features
NEXT_PUBLIC_ENABLE_STRIPE=false
NEXT_PUBLIC_ENABLE_RAZORPAY=false
```

---

## Step 2: Update Backend CORS Settings

**File**: `backend/lms_project/settings.py`

Update the CORS configuration:

```python
# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",      # Frontend dev
    "http://localhost:5173",      # Vite dev
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    # Add production URLs here
]

CORS_ALLOW_CREDENTIALS = True

# Allow frontend to access API
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
```

---

## Step 3: Create API Service Layer

**File**: `frontend/src/lib/api-client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired - try to refresh
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await axios.post(
                `${API_BASE_URL}/auth/token/refresh/`,
                { refresh: refreshToken }
              );
              localStorage.setItem('access_token', response.data.access);
              // Retry original request
              return this.client(error.config!);
            } catch (refreshError) {
              // Refresh failed - redirect to login
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/auth/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login/', { email, password });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    return response.data;
  }

  async register(userData: any) {
    const response = await this.client.post('/auth/register/', userData);
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    return response.data;
  }

  async logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/user/');
    return response.data;
  }

  // Course endpoints
  async getCourses(params?: any) {
    const response = await this.client.get('/courses/', { params });
    return response.data;
  }

  async getCourseDetail(courseId: string) {
    const response = await this.client.get(`/courses/${courseId}/`);
    return response.data;
  }

  async createCourse(courseData: any) {
    const response = await this.client.post('/courses/', courseData);
    return response.data;
  }

  async updateCourse(courseId: string, courseData: any) {
    const response = await this.client.patch(`/courses/${courseId}/`, courseData);
    return response.data;
  }

  async deleteCourse(courseId: string) {
    await this.client.delete(`/courses/${courseId}/`);
  }

  // Enrollment endpoints
  async enrollCourse(courseId: string) {
    const response = await this.client.post('/enrollments/', { course: courseId });
    return response.data;
  }

  async getEnrollments() {
    const response = await this.client.get('/enrollments/');
    return response.data;
  }

  // Progress endpoints
  async updateProgress(lessonId: string, progressData: any) {
    const response = await this.client.post('/progress/', {
      lesson: lessonId,
      ...progressData,
    });
    return response.data;
  }

  async getProgress(lessonId: string) {
    const response = await this.client.get(`/progress/?lesson=${lessonId}`);
    return response.data;
  }

  // File upload
  async uploadFile(file: File, category: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await this.client.post('/files/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Generic request method
  async request(method: string, url: string, data?: any, config?: any) {
    return this.client.request({
      method,
      url,
      data,
      ...config,
    });
  }
}

export const apiClient = new APIClient();
```

---

## Step 4: Update Authentication Configuration

**File**: `frontend/src/lib/auth-config.ts`

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "./api-client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const response = await apiClient.login(
            credentials.email,
            credentials.password
          );

          if (response.user) {
            return {
              id: response.user.id,
              email: response.user.email,
              name: response.user.username,
              image: response.user.avatar,
              role: response.user.is_instructor ? "instructor" : "student",
            };
          }
        } catch (error) {
          throw new Error("Invalid email or password");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
```

---

## Step 5: Update API Routes

**File**: `frontend/src/app/api/featured-courses/route.ts`

```typescript
import { apiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const courses = await apiClient.getCourses({ limit: 6 });
    return NextResponse.json(courses.results || []);
  } catch (error) {
    console.error("Error fetching featured courses:", error);
    return NextResponse.json([], { status: 500 });
  }
}
```

**File**: `frontend/src/app/api/categories/route.ts`

```typescript
import { apiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await apiClient.request("GET", "/categories/");
    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json([], { status: 500 });
  }
}
```

**File**: `frontend/src/app/api/stats/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Return mock stats - replace with actual API calls
    const stats = [
      { icon: "Users", label: "Active Students", value: "10,000+", color: "text-blue-500" },
      { icon: "BookOpen", label: "Courses", value: "500+", color: "text-purple-500" },
      { icon: "Award", label: "Certificates", value: "50,000+", color: "text-green-500" },
      { icon: "TrendingUp", label: "Success Rate", value: "95%", color: "text-orange-500" },
    ];
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json([], { status: 500 });
  }
}
```

---

## Step 6: Update Login Page

**File**: `frontend/src/app/auth/login/page.tsx`

Update the login handler to use the new API:

```typescript
import { signIn } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

async function handleLogin(email: string, password: string) {
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/learn",
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}
```

---

## Step 7: Update Course Pages

**File**: `frontend/src/app/courses/page.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await apiClient.getCourses()
        setCourses(data.results || [])
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course: any) => (
        <div key={course.id} className="card">
          {/* Course card content */}
        </div>
      ))}
    </div>
  )
}
```

---

## Step 8: Running Both Services

### Terminal 1 - Backend:
```bash
cd backend
python manage.py runserver
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Step 9: Testing the Integration

1. **Test Registration**:
   - Go to `http://localhost:3000/auth/signup`
   - Create a new account
   - Verify user is created in Django admin

2. **Test Login**:
   - Go to `http://localhost:3000/auth/login`
   - Login with created credentials
   - Verify tokens are stored in localStorage

3. **Test Course Listing**:
   - Go to `http://localhost:3000/courses`
   - Verify courses are fetched from backend

4. **Test Enrollment**:
   - Click "Enroll Now" on a course
   - Verify enrollment is created in backend

---

## Common Issues & Solutions

### CORS Errors
**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Ensure CORS_ALLOWED_ORIGINS includes your frontend URL in `settings.py`

### 401 Unauthorized
**Problem**: API returns 401 even with valid token

**Solution**: Check that token is being sent in Authorization header:
```
Authorization: Bearer <token>
```

### Token Refresh Issues
**Problem**: Token refresh endpoint not working

**Solution**: Ensure `/api/auth/token/refresh/` endpoint is configured in Django

### File Upload Issues
**Problem**: File upload returns 400 error

**Solution**: Ensure `MEDIA_ROOT` and `MEDIA_URL` are configured in Django settings

---

## Environment Variables Checklist

- [ ] `NEXT_PUBLIC_API_URL` set to backend URL
- [ ] `NEXTAUTH_URL` set to frontend URL
- [ ] `NEXTAUTH_SECRET` set to a secure random string
- [ ] Backend CORS_ALLOWED_ORIGINS includes frontend URL
- [ ] Backend JWT settings configured
- [ ] Frontend `.env.local` created

---

## Next Steps

1. Install frontend dependencies: `npm install`
2. Run both services
3. Test the integration
4. Deploy to production with proper environment variables
5. Set up SSL/HTTPS for production

---

## Production Deployment

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-secure-random-string>
```

### Backend (settings.py)
```python
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

ALLOWED_HOSTS = ["api.yourdomain.com", "yourdomain.com"]

DEBUG = False

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

