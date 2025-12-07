// API Configuration for Phase 3 Migration
// This file centralizes all API endpoints and provides version management

export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '';

// Feature flag to enable v2 endpoints
export const USE_V2_ENDPOINTS = true;

// API Endpoints with version management
export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: USE_V2_ENDPOINTS ? 'auth_v2.php?action=login' : 'auth.php?action=login',
    logout: USE_V2_ENDPOINTS ? 'auth_v2.php?action=logout' : 'auth.php?action=logout',
    validate: USE_V2_ENDPOINTS ? 'auth_v2.php?action=validate' : 'auth.php?action=validate',
    user: USE_V2_ENDPOINTS ? 'auth_v2.php?action=user' : 'auth.php?action=user',
  },
  
  // User management endpoints
  trainers: USE_V2_ENDPOINTS ? 'trainers_v2.php' : 'trainers.php',
  students: USE_V2_ENDPOINTS ? 'students_v2.php' : 'students.php',
  
  // Course management endpoints (no v2 yet)
  courses: 'courses.php',
  lessons: 'lessons.php',
  
  // Student activity endpoints (no v2 yet)
  enrollment: 'enrollment.php',
  progress: 'progress.php',
  
  // Assessment endpoints (no v2 yet)
  assessments: 'assessments.php',
  submissions: 'submissions.php',
  certificates: 'certificates.php',
  
  // Settings endpoints (no v2 yet)
  adminSettings: 'admin_settings.php',
  trainerSettings: 'trainer_settings.php',
  
  // Other endpoints
  discussions: 'discussions.php',
  payments: 'payments.php',
  courseplayer: 'courseplayer.php',
  health: 'health.php',
};

// Helper function to build full API URL
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

// Helper function to get authentication headers
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Try to get Clerk token first
  if (typeof window !== 'undefined' && window.Clerk && window.Clerk.session) {
    try {
      const token = await window.Clerk.session.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    } catch (error) {
      console.error('Error getting Clerk token:', error);
    }
  }

  // Fallback to localStorage token
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (localToken) {
    headers['Authorization'] = `Bearer ${localToken}`;
  }

  return headers;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// Helper function for standardized API calls
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = getApiUrl(endpoint);
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle standardized response format
    if (data.success !== undefined) {
      return data;
    }

    // Handle legacy response format
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Request failed',
        details: data,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('API call error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Export type for window.Clerk
declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      };
    };
    API_BASE_URL?: string;
  }
}
