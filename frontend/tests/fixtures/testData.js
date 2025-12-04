// Test data fixtures for CourseCompass V2 testing

const TEST_USERS = {
  STUDENT: {
    email: 'student@test.com',
    password: 'password123',
    name: 'Test Student',
    role: 'STUDENT'
  },
  INSTRUCTOR: {
    email: 'instructor@test.com',
    password: 'password123',
    name: 'Test Instructor',
    role: 'TRAINER'
  },
  ADMIN: {
    email: 'admin@test.com',
    password: 'password123',
    name: 'Test Admin',
    role: 'ADMIN'
  }
};

const BOUNDARY_TEST_VALUES = {
  // Email validation tests
  EMAIL_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Email is required' },
    { value: 'invalid', shouldPass: false, expectedError: 'Invalid email format' },
    { value: 'test@', shouldPass: false, expectedError: 'Invalid email format' },
    { value: '@test.com', shouldPass: false, expectedError: 'Invalid email format' },
    { value: 'test@test', shouldPass: false, expectedError: 'Invalid email format' },
    { value: 'test@test.com', shouldPass: true, expectedError: null },
    { value: 'a'.repeat(64) + '@test.com', shouldPass: false, expectedError: 'Email too long' },
    { value: 'test+tag@domain.co.uk', shouldPass: true, expectedError: null },
    { value: 'test.email@test-domain.com', shouldPass: true, expectedError: null }
  ],

  // Password validation tests
  PASSWORD_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Password is required' },
    { value: '123', shouldPass: false, expectedError: 'Password too short' },
    { value: 'password', shouldPass: false, expectedError: 'Password must contain uppercase' },
    { value: 'PASSWORD', shouldPass: false, expectedError: 'Password must contain lowercase' },
    { value: 'Password', shouldPass: false, expectedError: 'Password must contain number' },
    { value: 'Password123', shouldPass: true, expectedError: null },
    { value: 'VeryStrongP@ssw0rd123!', shouldPass: true, expectedError: null },
    { value: 'a'.repeat(129), shouldPass: false, expectedError: 'Password too long' },
    { value: '   Password123   ', shouldPass: false, expectedError: 'Password cannot contain spaces' }
  ],

  // Name validation tests
  NAME_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Name is required' },
    { value: 'a', shouldPass: false, expectedError: 'Name too short' },
    { value: 'ab', shouldPass: true, expectedError: null },
    { value: 'John Doe', shouldPass: true, expectedError: null },
    { value: 'José María', shouldPass: true, expectedError: null },
    { value: 'a'.repeat(101), shouldPass: false, expectedError: 'Name too long' },
    { value: 'Test123', shouldPass: false, expectedError: 'Name cannot contain numbers' },
    { value: 'Test@User', shouldPass: false, expectedError: 'Name contains invalid characters' }
  ],

  // Course title tests
  COURSE_TITLE_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Title is required' },
    { value: 'a', shouldPass: false, expectedError: 'Title too short' },
    { value: 'aa', shouldPass: false, expectedError: 'Title too short' },
    { value: 'abc', shouldPass: true, expectedError: null },
    { value: 'Learn JavaScript Programming', shouldPass: true, expectedError: null },
    { value: 'a'.repeat(201), shouldPass: false, expectedError: 'Title too long' },
    { value: '<script>alert("xss")</script>', shouldPass: false, expectedError: 'Invalid characters' }
  ],

  // Course description tests
  COURSE_DESCRIPTION_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Description is required' },
    { value: 'a'.repeat(9), shouldPass: false, expectedError: 'Description too short' },
    { value: 'a'.repeat(10), shouldPass: true, expectedError: null },
    { value: 'A comprehensive course description', shouldPass: true, expectedError: null },
    { value: 'a'.repeat(5001), shouldPass: false, expectedError: 'Description too long' }
  ],

  // Price tests
  PRICE_TESTS: [
    { value: '', shouldPass: false, expectedError: 'Price is required' },
    { value: '-1', shouldPass: false, expectedError: 'Price cannot be negative' },
    { value: '0', shouldPass: true, expectedError: null },
    { value: '99.99', shouldPass: true, expectedError: null },
    { value: '1000000', shouldPass: false, expectedError: 'Price too high' },
    { value: 'abc', shouldPass: false, expectedError: 'Invalid price format' },
    { value: '99.999', shouldPass: false, expectedError: 'Too many decimal places' }
  ]
};

const SECURITY_TEST_PAYLOADS = {
  XSS_ATTEMPTS: [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert("xss")',
    '<svg onload="alert(1)">',
    '"><script>alert("xss")</script>',
    '\'-alert(1)-\'',
    '<iframe src="javascript:alert(1)"></iframe>'
  ],

  SQL_INJECTION_ATTEMPTS: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; INSERT INTO users (email, password) VALUES ('hacker@test.com', 'password'); --",
    "' UNION SELECT * FROM users WHERE '1'='1",
    "admin'--",
    "' OR 1=1#",
    "'; EXEC xp_cmdshell('dir'); --"
  ],

  COMMAND_INJECTION_ATTEMPTS: [
    "; cat /etc/passwd",
    "| ls -la",
    "&& rm -rf /",
    "`whoami`",
    "$(cat /etc/passwd)",
    "; echo 'hacked'",
    "| ping google.com"
  ],

  PATH_TRAVERSAL_ATTEMPTS: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd"
  ]
};

const FILE_UPLOAD_TESTS = {
  VALID_FILES: [
    {
      fileName: 'test-image.jpg',
      content: Buffer.from('fake-jpg-content'),
      mimeType: 'image/jpeg',
      shouldPass: true
    },
    {
      fileName: 'test-video.mp4',
      content: Buffer.from('fake-mp4-content'),
      mimeType: 'video/mp4',
      shouldPass: true
    },
    {
      fileName: 'document.pdf',
      content: Buffer.from('fake-pdf-content'),
      mimeType: 'application/pdf',
      shouldPass: true
    }
  ],

  INVALID_FILES: [
    {
      fileName: 'malicious.exe',
      content: Buffer.from('fake-exe-content'),
      mimeType: 'application/x-executable',
      shouldPass: false,
      expectedError: 'File type not allowed'
    },
    {
      fileName: 'script.js',
      content: Buffer.from('alert("xss")'),
      mimeType: 'application/javascript',
      shouldPass: false,
      expectedError: 'File type not allowed'
    },
    {
      fileName: 'large-file.jpg',
      content: Buffer.alloc(11 * 1024 * 1024), // 11MB
      mimeType: 'image/jpeg',
      shouldPass: false,
      expectedError: 'File too large'
    },
    {
      fileName: '',
      content: Buffer.from('content'),
      mimeType: 'image/jpeg',
      shouldPass: false,
      expectedError: 'Filename required'
    }
  ]
};

const PERFORMANCE_BENCHMARKS = {
  PAGE_LOAD_TIMES: {
    EXCELLENT: 1000,  // < 1s
    GOOD: 3000,       // < 3s
    ACCEPTABLE: 5000, // < 5s
    POOR: 10000       // > 10s (fail)
  },

  NETWORK_THRESHOLDS: {
    MAX_REQUESTS: 50,
    MAX_TOTAL_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_JS_SIZE: 1 * 1024 * 1024,     // 1MB
    MAX_CSS_SIZE: 200 * 1024,         // 200KB
    MAX_IMAGE_SIZE: 2 * 1024 * 1024   // 2MB
  }
};

const ACCESSIBILITY_REQUIREMENTS = {
  MIN_COLOR_CONTRAST: 4.5,
  REQUIRED_ARIA_ATTRIBUTES: [
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'role'
  ],
  KEYBOARD_NAVIGATION: [
    'Tab', 'Shift+Tab', 'Enter', 'Space', 'Escape'
  ]
};

const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me'
  },
  COURSES: {
    LIST: '/api/courses',
    CREATE: '/api/courses/create',
    PUBLISH: '/api/courses/publish',
    FEATURED: '/api/featured-courses'
  },
  INSTRUCTOR: {
    DASHBOARD: '/api/instructor/dashboard',
    COURSES: '/api/instructor/courses',
    ANALYTICS: '/api/instructor/analytics'
  },
  ADMIN: {
    OVERVIEW: '/api/admin/overview',
    USERS: '/api/admin/users',
    COURSES: '/api/admin/courses'
  }
};

module.exports = {
  TEST_USERS,
  BOUNDARY_TEST_VALUES,
  SECURITY_TEST_PAYLOADS,
  FILE_UPLOAD_TESTS,
  PERFORMANCE_BENCHMARKS,
  ACCESSIBILITY_REQUIREMENTS,
  API_ENDPOINTS
};