// Django API Configuration
// This file centralizes all Django API endpoints and provides JWT authentication

export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api';

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
export function getApiUrl(endpoint: string): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

// Token management
export const TokenManager = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  setUser(user: any): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser(): any | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Helper function to get authentication headers
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = TokenManager.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: any;
}

// Helper function for standardized API calls with automatic token refresh
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = getApiUrl(endpoint);
    const headers = await getAuthHeaders();
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        const newHeaders = await getAuthHeaders();
        response = await fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
      } else {
        // Refresh failed, redirect to login
        TokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return {
          success: false,
          error: 'Authentication required',
        };
      }
    }

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

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = TokenManager.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.auth.refreshToken), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      TokenManager.setTokens(data.access, refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
  }

  return false;
}

// Convenience methods
export const djangoApi = {
  // GET request
  get: <T = any>(endpoint: string) => 
    apiCall<T>(endpoint, { method: 'GET' }),
  
  // POST request
  post: <T = any>(endpoint: string, data: any) => 
    apiCall<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // PATCH request
  patch: <T = any>(endpoint: string, data: any) => 
    apiCall<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  // PUT request
  put: <T = any>(endpoint: string, data: any) => 
    apiCall<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // DELETE request
  delete: <T = any>(endpoint: string, data?: any) => 
    apiCall<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // Upload file (multipart/form-data)
  upload: async <T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> => {
    try {
      const url = getApiUrl(endpoint);
      const token = TokenManager.getAccessToken();
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.error || 'Upload failed',
          ...data,
        };
      }

      return {
        success: true,
        data: data,
        ...data,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error',
      };
    }
  },
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

export interface Enrollment {
  id: number;
  student: number;
  course: number;
  enrolled_at: string;
}
