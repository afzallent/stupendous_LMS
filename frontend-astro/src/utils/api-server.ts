// Server-side API utilities for Astro components
// This can be safely imported in Astro frontmatter

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost/backend/api';
const USE_V2_ENDPOINTS = true;

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
  
  // Course management endpoints
  courses: 'courses.php',
  lessons: 'lessons.php',
  
  // Student activity endpoints
  enrollment: 'enrollment.php',
  progress: 'progress.php',
  
  // Assessment endpoints
  assessments: 'assessments.php',
  submissions: 'submissions.php',
  certificates: 'certificates.php',
  
  // Settings endpoints
  adminSettings: 'admin_settings.php',
  trainerSettings: 'trainer_settings.php',
  
  // Other endpoints
  discussions: 'discussions.php',
  payments: 'payments.php',
  courseplayer: 'courseplayer.php',
  health: 'health.php',
};

// Helper function to build full API URL
function getApiUrl(endpoint: string): string {
  // Ensure there's a slash between base URL and endpoint
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${base}${path}`;
}

// API response type
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// Helper function for standardized API calls (server-side version)
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

// Convenience methods
export const apiServer = {
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
