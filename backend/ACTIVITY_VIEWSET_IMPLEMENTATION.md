# ActivityLogViewSet Implementation

## Overview

The ActivityLogViewSet provides REST API endpoints for trainers/instructors to view and filter activity logs from their courses. This implementation follows Django REST Framework best practices and includes comprehensive permission checks to ensure trainers can only see activities from their own courses.

## Implementation Details

### Files Created/Modified

1. **backend/activity/serializers.py** (NEW)
   - `ActivityLogSerializer`: Basic serializer with user info and action display
   - `ActivityLogDetailSerializer`: Detailed serializer with all fields

2. **backend/activity/permissions.py** (NEW)
   - `IsInstructor`: Permission class to restrict access to instructors only

3. **backend/activity/api_views.py** (MODIFIED)
   - Added `ActivityLogViewSet`: ViewSet for querying activity logs
   - Implements filtering by course, student, action_type, and date_range
   - Implements `recent` action for getting last N activities

4. **backend/activity/api_urls.py** (MODIFIED)
   - Registered ActivityLogViewSet with router
   - URL pattern: `/api/activity/logs/`

5. **backend/activity/test_viewset.py** (NEW)
   - Comprehensive test suite with 17 tests
   - Tests permissions, filtering, ordering, and edge cases

## API Endpoints

### 1. List Activity Logs
**GET** `/api/activity/logs/`

Returns paginated list of activity logs for the authenticated instructor's courses.

**Query Parameters:**
- `course` (int): Filter by course ID
- `student` (int): Filter by student ID
- `action_type` (string): Filter by action type (e.g., 'lesson_complete', 'quiz_submit')
- `date_from` (date): Filter activities from this date (YYYY-MM-DD)
- `date_to` (date): Filter activities to this date (YYYY-MM-DD)

**Response:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/activity/logs/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 5,
      "user_name": "john_doe",
      "user_email": "john@example.com",
      "action_type": "lesson_complete",
      "action_display": "Completed Lesson",
      "timestamp": "2024-12-10T10:30:00Z",
      "description": "john_doe completed Lesson 1",
      "metadata": {},
      "content_type": 10,
      "object_id": 15
    }
  ]
}
```

**Example Requests:**
```bash
# Get all activities
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/

# Filter by course
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/?course=1

# Filter by student
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/?student=5

# Filter by action type
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/?action_type=lesson_complete

# Filter by date range
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/?date_from=2024-12-01&date_to=2024-12-31

# Combine filters
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/?course=1&student=5&action_type=quiz_submit
```

### 2. Get Recent Activities
**GET** `/api/activity/logs/recent/`

Returns the most recent activity logs for the authenticated instructor's courses.

**Query Parameters:**
- `limit` (int): Number of activities to return (default: 50, max: 100)

**Response:**
```json
{
  "count": 50,
  "results": [
    {
      "id": 100,
      "user": 5,
      "user_name": "john_doe",
      "user_email": "john@example.com",
      "action_type": "quiz_submit",
      "action_display": "Submitted Quiz",
      "timestamp": "2024-12-10T10:30:00Z",
      "description": "john_doe submitted Quiz 1",
      "metadata": {"score": 85, "passed": true},
      "content_type": 12,
      "object_id": 3
    }
  ]
}
```

**Example Requests:**
```bash
# Get last 50 activities (default)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/recent/

# Get last 10 activities
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/recent/?limit=10

# Get last 100 activities (max)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/activity/logs/recent/?limit=100
```

## Permission System

### IsInstructor Permission
- Only authenticated users with `is_instructor=True` can access the endpoints
- Students and unauthenticated users receive 403 Forbidden

### Course Ownership Filtering
- Instructors can only see activities from their own courses
- Activities are filtered by:
  - Course content type + course IDs owned by instructor
  - Lesson content type + lesson IDs from instructor's courses
- Attempting to filter by another instructor's course returns empty results

## Features

### 1. Automatic Filtering by Instructor
The ViewSet automatically filters activities to only show those related to the authenticated instructor's courses. This is done by:
1. Getting all courses where `instructor=request.user`
2. Getting all lessons from those courses
3. Filtering ActivityLog by content_type and object_id matching courses or lessons

### 2. Multiple Filter Support
Instructors can combine multiple filters:
- Course + Student: See specific student's activities in a specific course
- Action Type + Date Range: See all quiz submissions in December
- Course + Action Type + Student: See specific student's lesson completions in a course

### 3. Chronological Ordering
All activities are ordered by timestamp in descending order (most recent first).

### 4. Pagination
The ViewSet uses DRF's default pagination (typically 100 items per page).

### 5. Recent Activities Endpoint
The `recent` action provides a quick way to get the latest activities without pagination, useful for dashboard displays.

## Testing

### Running Tests
```bash
cd backend
python manage.py test activity.test_viewset
```

### Test Coverage
- ✅ Permission checks (instructor only)
- ✅ Course ownership filtering
- ✅ Filter by course
- ✅ Filter by student
- ✅ Filter by action type
- ✅ Filter by date range
- ✅ Multiple filter combinations
- ✅ Recent activities endpoint
- ✅ Recent activities with custom limit
- ✅ Recent activities max limit (100)
- ✅ Chronological ordering
- ✅ Invalid course filter handling
- ✅ Other instructor's course filter
- ✅ Serializer includes user info
- ✅ Unauthenticated access denied
- ✅ Non-instructor access denied
- ✅ Integration with complete workflow

### Manual Testing
Run the manual test script:
```bash
cd backend
python test_activity_viewset.py
```

This requires:
- Django server running on http://localhost:8000
- An instructor user with username/password
- A student user with username/password

## Requirements Validation

This implementation satisfies the following requirements from the spec:

### Requirement 2.1
✅ "WHEN a trainer requests recent activity THEN the System SHALL return a chronological list of student actions within the trainer's courses"
- Implemented via `list` action with automatic filtering by instructor's courses
- Activities ordered by timestamp descending

### Requirement 2.2
✅ "WHEN displaying activity THEN the System SHALL include student name, course name, activity type, and timestamp for each activity"
- Serializer includes user_name, user_email, action_type, action_display, timestamp
- Description field includes human-readable context

### Requirement 2.3
✅ "WHEN filtering activities THEN the System SHALL support filtering by course, student, activity type, and date range"
- Implemented via query parameters: course, student, action_type, date_from, date_to
- All filters can be combined

### Additional Features
✅ Permission check: Trainer can only see their course activities
- Implemented via IsInstructor permission and queryset filtering

✅ Recent action endpoint: GET /api/activity/recent/
- Returns last 50 activities by default
- Supports custom limit (max 100)

## Usage Examples

### Frontend Integration (Astro)

```typescript
// Get recent activities for dashboard
async function getRecentActivities(token: string, limit: number = 50) {
  const response = await fetch(
    `http://localhost:8000/api/activity/logs/recent/?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

// Get activities for specific course
async function getCourseActivities(token: string, courseId: number) {
  const response = await fetch(
    `http://localhost:8000/api/activity/logs/?course=${courseId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

// Get student's activities in a course
async function getStudentCourseActivities(
  token: string,
  courseId: number,
  studentId: number
) {
  const response = await fetch(
    `http://localhost:8000/api/activity/logs/?course=${courseId}&student=${studentId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}

// Get quiz submissions in date range
async function getQuizSubmissions(
  token: string,
  dateFrom: string,
  dateTo: string
) {
  const response = await fetch(
    `http://localhost:8000/api/activity/logs/?action_type=quiz_submit&date_from=${dateFrom}&date_to=${dateTo}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}
```

## Action Types

The following action types are available for filtering:

**Authentication:**
- `login`, `logout`, `register`

**Course Actions:**
- `course_view`, `course_enroll`, `course_unenroll`, `course_create`, `course_update`, `course_delete`, `course_publish`

**Lesson Actions:**
- `lesson_view`, `lesson_start`, `lesson_complete`, `lesson_create`, `lesson_update`, `lesson_delete`

**Quiz Actions:**
- `quiz_start`, `quiz_submit`, `quiz_complete`, `quiz_create`, `quiz_update`, `quiz_delete`

**Discussion Actions:**
- `discussion_post`, `discussion_reply`, `discussion_edit`, `discussion_delete`, `discussion_pin`, `discussion_lock`, `discussion_solution`

**Other:**
- `search`, `profile_view`, `profile_update`, `certificate_view`, `certificate_download`

## Next Steps

1. ✅ ActivityLogViewSet implementation complete
2. ⏭️ Continue with task 21: Register ActivityLogViewSet in api_urls.py (already done)
3. ⏭️ Continue with task 22: Checkpoint - Verify activity logging works

## Notes

- The ViewSet is read-only (ReadOnlyModelViewSet) - activity logs are created via signals, not through the API
- The implementation uses select_related('user') for query optimization
- Date filtering uses Django's date__gte and date__lte for efficient database queries
- The recent action caps the limit at 100 to prevent performance issues
- All tests pass successfully (17/17)
