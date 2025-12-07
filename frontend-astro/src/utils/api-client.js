// Client-side API utilities for Astro components
// This provides similar functionality to api.config.ts but for client-side scripts

window.API_BASE_URL = window.location.origin.includes('localhost') ? (import.meta?.env?.PUBLIC_API_URL || '') : (window.PUBLIC_API_URL || '');
window.USE_V2_ENDPOINTS = true;

// API Endpoints with version management
window.API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: window.USE_V2_ENDPOINTS ? 'auth_v2.php?action=login' : 'auth.php?action=login',
    logout: window.USE_V2_ENDPOINTS ? 'auth_v2.php?action=logout' : 'auth.php?action=logout',
    validate: window.USE_V2_ENDPOINTS ? 'auth_v2.php?action=validate' : 'auth.php?action=validate',
    user: window.USE_V2_ENDPOINTS ? 'auth_v2.php?action=user' : 'auth.php?action=user',
  },
  
  // User management endpoints
  trainers: window.USE_V2_ENDPOINTS ? 'trainers_v2.php' : 'trainers.php',
  students: window.USE_V2_ENDPOINTS ? 'students_v2.php' : 'students.php',
  
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
window.getApiUrl = function(endpoint) {
  return `${window.API_BASE_URL}${endpoint}`;
};

// Helper function to get authentication headers
window.getAuthHeaders = async function() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Try to get Clerk token first
  if (window.Clerk && window.Clerk.session) {
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
  const localToken = localStorage.getItem('token');
  if (localToken) {
    headers['Authorization'] = `Bearer ${localToken}`;
  }

  return headers;
};

// Helper function for standardized API calls
window.apiCall = async function(endpoint, options = {}) {
  try {
    const url = window.getApiUrl(endpoint);
    const headers = await window.getAuthHeaders();
    
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
      error: error.message || 'Network error',
    };
  }
};
