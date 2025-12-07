// Client-side Django API utilities for Astro components
// This provides similar functionality to django-api.config.ts but for client-side scripts

window.API_BASE_URL = import.meta?.env?.PUBLIC_API_URL || 'http://localhost:8000/api';

// API Endpoints matching Django backend
window.API_ENDPOINTS = {
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
    detail: (id) => `/courses/${id}/`,
    withProgress: (id) => `/courses/${id}/with-progress/`,
    publish: (id) => `/courses/${id}/publish/`,
  },
  
  // Lesson management endpoints
  lessons: {
    list: '/lessons/',
    detail: (id) => `/lessons/${id}/`,
    markComplete: (id) => `/lessons/${id}/mark-complete/`,
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
window.getApiUrl = function(endpoint) {
  const base = window.API_BASE_URL.endsWith('/') ? window.API_BASE_URL.slice(0, -1) : window.API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

// Token management
window.TokenManager = {
  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Helper function to get authentication headers
window.getAuthHeaders = async function() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = window.TokenManager.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Refresh access token using refresh token
window.refreshAccessToken = async function() {
  const refreshToken = window.TokenManager.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(window.getApiUrl(window.API_ENDPOINTS.auth.refreshToken), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      window.TokenManager.setTokens(data.access, refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
  }

  return false;
};

// Helper function for standardized API calls with automatic token refresh
window.apiCall = async function(endpoint, options = {}) {
  try {
    const url = window.getApiUrl(endpoint);
    const headers = await window.getAuthHeaders();
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await window.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        const newHeaders = await window.getAuthHeaders();
        response = await fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
      } else {
        // Refresh failed, redirect to login
        window.TokenManager.clearTokens();
        window.location.href = '/login';
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
      error: error.message || 'Network error',
    };
  }
};

// Convenience methods
window.djangoApi = {
  // GET request
  get: (endpoint) => window.apiCall(endpoint, { method: 'GET' }),
  
  // POST request
  post: (endpoint, data) => window.apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // PATCH request
  patch: (endpoint, data) => window.apiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  // PUT request
  put: (endpoint, data) => window.apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // DELETE request
  delete: (endpoint, data) => window.apiCall(endpoint, {
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  }),

  // Upload file (multipart/form-data)
  upload: async (endpoint, formData) => {
    try {
      const url = window.getApiUrl(endpoint);
      const token = window.TokenManager.getAccessToken();
      
      const headers = {};
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
        error: error.message || 'Upload error',
      };
    }
  },
};
