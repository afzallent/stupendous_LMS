// Server-side Django API utilities for Astro components
// This can be safely imported in Astro frontmatter

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api';

// API Endpoints matching Django backend
export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    register: '/auth/register/',
    login: '/auth/login/',
    logout: '/auth/logout/',
    refreshToken: '/auth/token/refresh/',
    requestPasswordReset: '/auth/request-password-reset/',
    resetPassword: '/auth/reset-password/',
  },
  
  // User management endpoints
  user: {
    me: '/user/me/',
    changePassword: '/user/change-password/',
    uploadAvatar: '/user/upload-avatar/',
  },
  
  // Course management endpoints
  courses: {
    list: '/courses/',
    detail: (id: number) => `/courses/${id}/`,
    withProgress: (id: number) => `/courses/${id}/with-progress/`,
    publish: (id: number) => `/courses/${id}/publish/`,
  },
  
  // Lesson management endpoints
  lessons: {
    list: '/lessons/',
    detail: (id: number) => `/lessons/${id}/`,
    markComplete: (id: number) => `/lessons/${id}/mark-complete/`,
  },
  
  // Enrollment endpoints
  enrollments: {
    create: '/enrollments/',
    check: '/enrollments/check/',
  },
  
  // Dashboard endpoints
  dashboard: {
    student: '/student/dashboard/',
    instructor: '/instructor/analytics/',
  },
};

// Helper function to build full API URL
function getApiUrl(endpoint: string): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

// API response type
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: any;
}

// Helper function for standardized API calls (server-side version - no auth)
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle Django REST Framework response format
    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.error || data.message || 'Request failed',
        ...data,
      };
    }

    return {
      success: true,
      data: data,
      ...data,
    };
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Convenience methods for server-side API calls
export const djangoApiServer = {
  get: <T = any>(endpoint: string) => apiCall<T>(endpoint, { method: 'GET' }),
  
  post: <T = any>(endpoint: string, data: any) => apiCall<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  put: <T = any>(endpoint: string, data: any) => apiCall<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: <T = any>(endpoint: string, data?: any) => apiCall<T>(endpoint, {
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  }),
};

// Export types for TypeScript
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_student: boolean;
  is_instructor: boolean;
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor: {
    id: number;
    username: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  thumbnail?: string;
  price: string;
  original_price?: string;
  is_free: boolean;
  status: 'draft' | 'published' | 'archived';
  total_lessons: number;
  total_enrollments: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: number;
  course: number;
  title: string;
  order: number;
  video_url?: string;
  video_file?: string;
  content: string;
  duration?: string;
  completed?: boolean;
  completed_at?: string;
}
