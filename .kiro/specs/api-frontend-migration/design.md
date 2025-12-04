# Design Document

## Overview

This design document describes the architecture and implementation approach for migrating the Stupendous LMS from a monolithic Django application to a decoupled architecture with a Django REST API backend and Vue 3 + Vite frontend. The system will maintain all existing functionality while providing a modern, scalable architecture that follows industry best practices and OpenAPI 3.0 specifications.

The migration will transform the application into two independent components:
1. **Backend**: Django REST Framework API providing JSON endpoints
2. **Frontend**: Vue 3 SPA consuming the API

Additionally, the codebase will be reorganized into a cleaner structure with separate directories for backend, frontend, and documentation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Vue 3 + Vite Frontend (SPA)                 │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Vue       │  │    Pinia     │  │  Vue Router │  │  │
│  │  │ Components  │  │    Store     │  │             │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │          Axios API Client Layer                  │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/JSON
                              │ JWT Authentication
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Django Backend Server                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Django REST Framework API                     │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  ViewSets   │  │ Serializers  │  │ Permissions │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │       JWT Authentication Middleware              │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │              CORS Middleware                     │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Django ORM / Models                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SQLite / PostgreSQL                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Backend Components

1. **API Layer (Django REST Framework)**
   - ViewSets for CRUD operations
   - Serializers for data validation and transformation
   - Custom permissions for role-based access
   - JWT authentication middleware

2. **Business Logic Layer**
   - Django models (existing, unchanged)
   - Custom model methods for business logic
   - Signal handlers for automated actions

3. **Data Layer**
   - Django ORM
   - Database (SQLite for dev, PostgreSQL for production)

#### Frontend Components

1. **Presentation Layer**
   - Vue 3 components using Composition API
   - Reusable UI components
   - Page-level components

2. **State Management**
   - Pinia stores for global state
   - Auth store for user/token management
   - Course store for course data
   - UI store for app-wide UI state

3. **Routing Layer**
   - Vue Router for navigation
   - Route guards for authentication
   - Lazy-loaded route components

4. **API Integration Layer**
   - Axios instance with interceptors
   - API service modules
   - Automatic token injection
   - Error handling

## Components and Interfaces

### Backend API Endpoints

#### Authentication Endpoints

```
POST   /api/auth/register/          - Register new user
POST   /api/auth/login/             - Login and get tokens
POST   /api/auth/logout/            - Logout and invalidate token
POST   /api/auth/token/refresh/     - Refresh access token
GET    /api/auth/user/              - Get current user profile
PUT    /api/auth/user/              - Update user profile
```

#### Course Endpoints

```
GET    /api/courses/                - List all courses (paginated)
POST   /api/courses/                - Create course (instructor only)
GET    /api/courses/{id}/           - Get course detail
PUT    /api/courses/{id}/           - Update course (owner only)
DELETE /api/courses/{id}/           - Delete course (owner only)
GET    /api/courses/my-courses/     - Get instructor's courses
```

#### Lesson Endpoints

```
GET    /api/courses/{id}/lessons/           - List course lessons
POST   /api/courses/{id}/lessons/           - Create lesson (owner only)
GET    /api/lessons/{id}/                   - Get lesson detail
PUT    /api/lessons/{id}/                   - Update lesson (owner only)
DELETE /api/lessons/{id}/                   - Delete lesson (owner only)
PATCH  /api/lessons/{id}/reorder/           - Reorder lessons
```

#### Enrollment Endpoints

```
GET    /api/enrollments/                    - Get user's enrollments
POST   /api/enrollments/                    - Enroll in course
DELETE /api/enrollments/{id}/               - Unenroll from course
GET    /api/courses/{id}/enrollments/       - Get course enrollments (instructor only)
```

#### Progress Endpoints

```
GET    /api/progress/                       - Get user's progress
POST   /api/progress/                       - Mark lesson complete
GET    /api/courses/{id}/progress/          - Get course progress
GET    /api/courses/{id}/student-progress/  - Get all students' progress (instructor only)
```

#### Documentation Endpoints

```
GET    /api/schema/                         - OpenAPI 3.0 schema (JSON)
GET    /api/docs/                           - Swagger UI documentation
GET    /api/redoc/                          - ReDoc documentation
```

### API Request/Response Formats

#### User Registration Request
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "password_confirm": "string",
  "is_student": true,
  "is_instructor": false
}
```

#### Login Response
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "is_student": true,
    "is_instructor": false
  }
}
```

#### Course List Response
```json
{
  "count": 10,
  "next": "http://api/courses/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "string",
      "description": "string",
      "instructor": {
        "id": 1,
        "username": "string"
      },
      "created_at": "2024-01-01T00:00:00Z",
      "lesson_count": 5,
      "enrolled_count": 10
    }
  ]
}
```

#### Course Detail Response
```json
{
  "id": 1,
  "title": "string",
  "description": "string",
  "instructor": {
    "id": 1,
    "username": "string",
    "email": "string"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "lessons": [
    {
      "id": 1,
      "title": "string",
      "video_url": "string",
      "order": 1,
      "content": "string"
    }
  ],
  "is_enrolled": false,
  "progress_percentage": 0
}
```

#### Error Response Format
```json
{
  "error": "string",
  "detail": "string",
  "field_errors": {
    "field_name": ["error message"]
  }
}
```

### Reorganized Project Structure

```
stupendous_LMS/
├── backend/                       # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── lms_project/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── core/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   └── tests/
│   ├── courses/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   └── tests/
│   └── db.sqlite3
│
├── frontend/                      # Vue 3 + Vite SPA
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.js                # App entry point
│   │   ├── App.vue                # Root component
│   │   ├── router/
│   │   │   └── index.js           # Route definitions
│   │   ├── stores/
│   │   │   ├── auth.js            # Auth state management
│   │   │   ├── courses.js         # Course state management
│   │   │   └── ui.js              # UI state management
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance
│   │   │   ├── auth.service.js    # Auth API calls
│   │   │   ├── course.service.js  # Course API calls
│   │   │   ├── lesson.service.js  # Lesson API calls
│   │   │   ├── enrollment.service.js  # Enrollment API calls
│   │   │   └── progress.service.js    # Progress API calls
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Navbar.vue
│   │   │   │   ├── Footer.vue
│   │   │   │   ├── LoadingSpinner.vue
│   │   │   │   └── ErrorAlert.vue
│   │   │   ├── course/
│   │   │   │   ├── CourseCard.vue
│   │   │   │   ├── CourseList.vue
│   │   │   │   └── CourseForm.vue
│   │   │   ├── lesson/
│   │   │   │   ├── LessonCard.vue
│   │   │   │   ├── LessonList.vue
│   │   │   │   └── LessonForm.vue
│   │   │   └── progress/
│   │   │       ├── ProgressBar.vue
│   │   │       └── ProgressChart.vue
│   │   ├── views/
│   │   │   ├── Home.vue
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   ├── CoursesCatalog.vue
│   │   │   ├── CourseDetail.vue
│   │   │   ├── LessonView.vue
│   │   │   ├── StudentDashboard.vue
│   │   │   ├── InstructorDashboard.vue
│   │   │   └── ProgressMonitor.vue
│   │   └── utils/
│   │       ├── validators.js      # Form validation helpers
│   │       └── formatters.js      # Data formatting helpers
│   └── .env.example               # Environment variables template
│
├── docs/                          # Documentation
│   ├── README.md                  # Main documentation
│   ├── API.md                     # API documentation
│   ├── SETUP.md                   # Setup instructions
│   ├── DEPLOYMENT.md              # Deployment guide
│   └── openapi.yaml               # OpenAPI 3.0 specification
│
├── .kiro/                         # Kiro configuration
│   ├── steering/
│   └── specs/
│
├── .gitignore
└── README.md                      # Project overview
```

### Benefits of Reorganized Structure

1. **Clear Separation**: Backend and frontend are completely isolated
2. **Independent Development**: Teams can work on backend/frontend separately
3. **Easier Deployment**: Each component can be deployed independently
4. **Better Documentation**: Centralized docs folder for all documentation
5. **Scalability**: Easy to add new services or microservices in the future

## Data Models

The existing Django models remain unchanged. The API layer adds serializers to transform these models to/from JSON.

### Serializers

#### UserSerializer
```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_student', 'is_instructor']
        read_only_fields = ['id']
```

#### CourseSerializer
```python
class CourseSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)
    lesson_count = serializers.IntegerField(read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'instructor', 
                  'created_at', 'lesson_count', 'enrolled_count']
        read_only_fields = ['id', 'created_at']
```

#### LessonSerializer
```python
class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'course', 'title', 'video_url', 'order', 'content']
        read_only_fields = ['id']
```

#### EnrollmentSerializer
```python
class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'course_id', 'enrolled_at']
        read_only_fields = ['id', 'student', 'enrolled_at']
```

#### ProgressSerializer
```python
class ProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    lesson_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Progress
        fields = ['id', 'student', 'lesson', 'lesson_id', 
                  'completed', 'completed_at']
        read_only_fields = ['id', 'student', 'completed_at']
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Backend API Properties

Property 1: JSON Response Format
*For any* API endpoint request, the response should be valid JSON with appropriate HTTP status codes
**Validates: Requirements 1.2**

Property 2: CORS Headers
*For any* API request with an Origin header, the response should include appropriate CORS headers allowing frontend communication
**Validates: Requirements 1.4**

Property 3: JWT Token Issuance
*For any* valid user credentials submitted to the login endpoint, the response should include both access and refresh JWT tokens
**Validates: Requirements 2.1, 3.2**

Property 4: Token Refresh
*For any* valid refresh token, the token refresh endpoint should issue a new access token
**Validates: Requirements 2.2**

Property 5: Token Validation
*For any* protected endpoint request with a valid JWT token, the request should be authenticated successfully
**Validates: Requirements 2.3**

Property 6: Invalid Token Rejection
*For any* protected endpoint request with an invalid or expired token, the response should be 401 Unauthorized
**Validates: Requirements 2.4**

Property 7: Token Invalidation
*For any* user logout request, the refresh token should be invalidated and no longer work for token refresh
**Validates: Requirements 2.5, 3.5**

Property 8: User Registration Round Trip
*For any* valid registration data, creating a user then retrieving the profile should return matching user data
**Validates: Requirements 3.1**

Property 9: Profile Retrieval
*For any* authenticated user requesting their profile, the response should contain their complete user data
**Validates: Requirements 3.3**

Property 10: Profile Update Round Trip
*For any* authenticated user updating their profile, retrieving the profile afterward should reflect the updates
**Validates: Requirements 3.4**

Property 11: Course Pagination
*For any* course list request with pagination parameters, the response should include correct pagination metadata and results
**Validates: Requirements 4.1**

Property 12: Course Detail Completeness
*For any* course detail request, the response should include all course fields and nested lesson data
**Validates: Requirements 4.2**

Property 13: Course Creation Round Trip
*For any* instructor creating a course, retrieving the course afterward should return the same course data
**Validates: Requirements 4.3**

Property 14: Course Update Authorization
*For any* course update request, only the course owner should be able to update the course
**Validates: Requirements 4.4**

Property 15: Course Deletion
*For any* course deleted by its owner, subsequent requests for that course should return 404 Not Found
**Validates: Requirements 4.5**

Property 16: Instructor Course Filtering
*For any* instructor requesting their courses, the response should only include courses they created
**Validates: Requirements 4.6**

Property 17: Lesson Ordering
*For any* course's lessons, they should always be returned ordered by the order field
**Validates: Requirements 5.1**

Property 18: Lesson Creation Authorization
*For any* lesson creation request, only the course owner should be able to create lessons for that course
**Validates: Requirements 5.2**

Property 19: Lesson Update Authorization
*For any* lesson update request, only the course owner should be able to update the lesson
**Validates: Requirements 5.3**

Property 20: Lesson Deletion
*For any* lesson deleted by the course owner, subsequent requests for that lesson should return 404 Not Found
**Validates: Requirements 5.4**

Property 21: Lesson Reordering
*For any* lesson reorder operation, the order field should be updated correctly for all affected lessons
**Validates: Requirements 5.5**

Property 22: Enrollment Idempotency
*For any* student enrolling in a course multiple times, only one enrollment record should exist
**Validates: Requirements 6.1, 6.3**

Property 23: Enrollment Filtering
*For any* student requesting their enrollments, the response should only include courses they are enrolled in
**Validates: Requirements 6.2**

Property 24: Enrollment Data Completeness
*For any* enrollment response, it should include nested course details and progress information
**Validates: Requirements 6.4**

Property 25: Unenrollment
*For any* student unenrolling from a course, subsequent enrollment requests should not include that course
**Validates: Requirements 6.5**

Property 26: Progress Completion Idempotency
*For any* student marking a lesson complete multiple times, only one progress record should exist with completed status
**Validates: Requirements 7.1**

Property 27: Course Progress Completeness
*For any* student requesting progress for a course, the response should include completion status for all lessons in that course
**Validates: Requirements 7.2**

Property 28: Completion Timestamp
*For any* progress record marked as completed, the completed_at field should be set to a valid timestamp
**Validates: Requirements 7.3**

Property 29: Instructor Progress Access
*For any* instructor requesting student progress for their course, the response should include progress data for all enrolled students
**Validates: Requirements 7.4**

Property 30: Progress Percentage Calculation
*For any* course progress calculation, the percentage should equal (completed_lessons / total_lessons) * 100
**Validates: Requirements 7.5**

Property 31: Validation Error Format
*For any* API request with invalid data, the response should be 400 Bad Request with detailed field-level error messages
**Validates: Requirements 17.1**

Property 32: Authentication Error Format
*For any* authentication failure, the response should be 401 Unauthorized with error details
**Validates: Requirements 17.2**

Property 33: Authorization Error Format
*For any* authorization failure, the response should be 403 Forbidden with clear messaging
**Validates: Requirements 17.3**

Property 34: Not Found Error Format
*For any* request for a non-existent resource, the response should be 404 Not Found
**Validates: Requirements 17.4**

### Frontend Properties

Property 35: Authenticated Request Headers
*For any* API request requiring authentication, the Authorization header should include the JWT token
**Validates: Requirements 9.3**

## Error Handling

### Backend Error Handling

1. **Validation Errors (400)**
   - Field-level validation errors
   - Custom validation messages
   - Serializer validation

2. **Authentication Errors (401)**
   - Invalid credentials
   - Expired tokens
   - Missing tokens

3. **Authorization Errors (403)**
   - Insufficient permissions
   - Resource ownership violations

4. **Not Found Errors (404)**
   - Non-existent resources
   - Invalid IDs

5. **Server Errors (500)**
   - Unhandled exceptions
   - Database errors
   - Logged for debugging

### Frontend Error Handling

1. **API Error Handling**
   - Display user-friendly messages
   - Parse backend error responses
   - Show field-level validation errors

2. **Network Error Handling**
   - Connection failures
   - Timeout errors
   - Retry mechanisms

3. **Authentication Error Handling**
   - Automatic token refresh
   - Redirect to login on auth failure
   - Clear invalid tokens

## Testing Strategy

### Backend Testing

#### Unit Tests
- **Serializer Tests**: Validate data transformation and validation logic
- **Model Tests**: Test model methods and properties
- **Permission Tests**: Verify role-based access control
- **Utility Tests**: Test helper functions and utilities

#### Integration Tests
- **API Endpoint Tests**: Test all CRUD operations for each endpoint
- **Authentication Tests**: Verify JWT token generation, validation, and refresh
- **Authorization Tests**: Ensure proper permission enforcement
- **Pagination Tests**: Verify pagination works correctly
- **Filtering Tests**: Test query parameter filtering

#### Property-Based Tests
- Use **Hypothesis** library for Python property-based testing
- Generate random valid data for testing properties
- Test edge cases automatically
- Minimum 100 iterations per property test

**Property Test Configuration**:
```python
from hypothesis import given, strategies as st
from hypothesis import settings

@settings(max_examples=100)
@given(st.text(min_size=1, max_size=200))
def test_course_title_property(title):
    # Property test implementation
    pass
```

**Property Test Tagging**:
Each property-based test must include a comment referencing the design document:
```python
# Feature: api-frontend-migration, Property 13: Course Creation Round Trip
```

### Frontend Testing

#### Unit Tests
- **Component Tests**: Test individual Vue components with Vue Test Utils
- **Store Tests**: Test Pinia store actions and getters
- **Service Tests**: Test API service methods with mocked responses
- **Utility Tests**: Test validation and formatting functions

#### Integration Tests
- **User Flow Tests**: Test complete user journeys (e.g., registration → login → enroll)
- **API Integration Tests**: Test frontend-backend communication
- **Router Tests**: Test navigation and route guards

#### End-to-End Tests
- Use **Playwright** or **Cypress** for E2E testing
- Test critical user paths
- Test across different browsers
- Test responsive behavior

### Testing Tools

**Backend**:
- pytest: Test framework
- pytest-django: Django integration
- Hypothesis: Property-based testing
- factory_boy: Test data generation
- coverage: Code coverage reporting

**Frontend**:
- Vitest: Unit test framework
- Vue Test Utils: Component testing
- Playwright: E2E testing
- MSW (Mock Service Worker): API mocking

## Security Considerations

### Backend Security

1. **JWT Security**
   - Short-lived access tokens (15 minutes)
   - Longer-lived refresh tokens (7 days)
   - Secure token storage
   - Token rotation on refresh

2. **CORS Configuration**
   - Whitelist specific origins
   - Restrict allowed methods
   - Limit exposed headers

3. **Input Validation**
   - Serializer validation
   - SQL injection prevention (ORM)
   - XSS prevention

4. **Rate Limiting**
   - Throttle authentication endpoints
   - Prevent brute force attacks
   - API rate limits per user

5. **HTTPS Only**
   - Force HTTPS in production
   - Secure cookie flags
   - HSTS headers

### Frontend Security

1. **Token Storage**
   - Store tokens in httpOnly cookies (preferred) or localStorage
   - Clear tokens on logout
   - Validate token expiration

2. **XSS Prevention**
   - Vue's automatic escaping
   - Sanitize user input
   - Content Security Policy

3. **CSRF Protection**
   - CSRF tokens for state-changing operations
   - SameSite cookie attribute

## Performance Considerations

### Backend Performance

1. **Database Optimization**
   - Use select_related() for foreign keys
   - Use prefetch_related() for many-to-many
   - Add database indexes
   - Query optimization

2. **Caching**
   - Cache course lists
   - Cache user profiles
   - Redis for session storage

3. **Pagination**
   - Limit page size
   - Cursor-based pagination for large datasets

### Frontend Performance

1. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for large components
   - Vite automatic code splitting

2. **Asset Optimization**
   - Image optimization
   - Minification
   - Compression (gzip/brotli)

3. **State Management**
   - Efficient Pinia store updates
   - Avoid unnecessary re-renders
   - Computed properties for derived state

4. **API Optimization**
   - Request debouncing
   - Response caching
   - Optimistic UI updates

## Deployment Strategy

### Backend Deployment

**Development**:
- SQLite database
- Django development server
- Debug mode enabled

**Production**:
- PostgreSQL database
- Gunicorn WSGI server
- Nginx reverse proxy
- Environment-based configuration
- Docker containerization (optional)

### Frontend Deployment

**Development**:
- Vite dev server
- Hot module replacement
- Source maps

**Production**:
- Static file build
- CDN hosting (Netlify, Vercel, Cloudflare Pages)
- Environment variables for API URL
- Minified and optimized assets

### CI/CD Pipeline

1. **Backend Pipeline**
   - Run tests
   - Check code coverage
   - Lint code (flake8, black)
   - Build Docker image
   - Deploy to staging/production

2. **Frontend Pipeline**
   - Run tests
   - Lint code (ESLint)
   - Build production bundle
   - Deploy to CDN

## Migration Strategy

### Phase 1: Backend API Development
1. Set up Django REST Framework
2. Create serializers for existing models
3. Implement ViewSets and URLs
4. Add JWT authentication
5. Write API tests
6. Generate OpenAPI documentation

### Phase 2: Frontend Development
1. Initialize Vue 3 + Vite project
2. Set up routing and state management
3. Create API service layer
4. Build UI components
5. Implement views
6. Add authentication flow

### Phase 3: Integration
1. Connect frontend to backend API
2. Test end-to-end flows
3. Fix integration issues
4. Performance optimization

### Phase 4: Reorganization
1. Create backend/ and frontend/ directories
2. Move Django files to backend/
3. Move Vue files to frontend/
4. Create docs/ directory
5. Update documentation
6. Update deployment scripts

### Phase 5: Testing & Deployment
1. Comprehensive testing
2. Security audit
3. Performance testing
4. Deploy to staging
5. User acceptance testing
6. Deploy to production

## OpenAPI 3.0 Specification

The API will be documented using OpenAPI 3.0 specification with the following tools:

1. **drf-spectacular**: Automatic OpenAPI schema generation
2. **Swagger UI**: Interactive API documentation
3. **ReDoc**: Alternative documentation UI

### Schema Generation

```python
# settings.py
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Stupendous LMS API',
    'DESCRIPTION': 'API for Learning Management System',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
```

### Documentation Endpoints

- `/api/schema/` - OpenAPI schema (JSON)
- `/api/schema/yaml/` - OpenAPI schema (YAML)
- `/api/docs/` - Swagger UI
- `/api/redoc/` - ReDoc UI

## Technology Stack Summary

### Backend
- **Framework**: Django 5.2.8
- **API**: Django REST Framework 3.14+
- **Authentication**: djangorestframework-simplejwt
- **Documentation**: drf-spectacular
- **CORS**: django-cors-headers
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Testing**: pytest, pytest-django, Hypothesis

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite 5+
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **HTTP Client**: Axios
- **UI Framework**: Bootstrap 5 or Tailwind CSS
- **Testing**: Vitest, Vue Test Utils, Playwright

### DevOps
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker (optional)
- **Hosting**: Backend (Railway, Render, AWS), Frontend (Netlify, Vercel)
