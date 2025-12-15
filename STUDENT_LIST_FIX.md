# Fix: Students Not Listed on Course Students Page

## Problem
When visiting `/instructor/courses/14/students`, no students are displayed even though students may be enrolled in the course.

## Root Cause
The frontend was calling the wrong API endpoint:
- **Incorrect**: `/api/courses/student_progress/`
- **Correct**: `/api/progress/student_progress/`

The `student_progress` action is part of the `ProgressViewSet`, which is registered at `/api/progress/` in the Django router.

## Solution Applied

### 1. Fixed API Endpoint
Updated the frontend to call the correct Django backend endpoint:
```typescript
// Changed from:
fetch(`/api/courses/student_progress/?course_id=${courseId}`)

// To:
fetch(`${API_BASE_URL}/api/progress/student_progress/?course_id=${courseId}`)
```

### 2. Added Proper Authentication
Ensured the request includes the JWT access token:
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### 3. Improved Error Handling
Added better error messages and debugging information to help identify issues.

### 4. Enhanced Empty State
Improved the UI when no students are enrolled or when filters don't match any students.

## How to Verify

### Option 1: Check Database Directly

Run this script to see enrollments for course 14:
```bash
cd backend
python check_enrollments.py 14
```

This will show:
- Course details
- Total enrollments
- Each student's progress
- Student IDs and email addresses

### Option 2: Use Django Shell

```bash
cd backend
python manage.py shell
```

Then run:
```python
from courses.models import Course, Enrollment
course = Course.objects.get(id=14)
enrollments = Enrollment.objects.filter(course=course)
print(f"Total enrollments: {enrollments.count()}")
for e in enrollments:
    print(f"- {e.student.username} ({e.student.email})")
```

### Option 3: Test the API Directly

Using curl or Postman:
```bash
# Get your access token first (login)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Then test the endpoint
curl -X GET "http://localhost:8000/api/progress/student_progress/?course_id=14" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Issues

### Issue 1: No Students Enrolled
If the script shows 0 enrollments, you need to enroll students in the course:

**Via Django Admin:**
1. Go to http://localhost:8000/admin/
2. Navigate to **Enrollments**
3. Add new enrollment with:
   - Student: Select a student user
   - Course: Select course 14

**Via Django Shell:**
```python
from courses.models import Course, Enrollment
from core.models import User

course = Course.objects.get(id=14)
student = User.objects.get(username='student_username')
Enrollment.objects.create(student=student, course=course)
```

### Issue 2: User Not an Instructor
The endpoint requires `is_instructor=True`. If you get a permission error:
```bash
cd backend
python manage.py set_instructor your_username
```

### Issue 3: Course Doesn't Belong to Instructor
The endpoint only shows students for courses owned by the logged-in instructor. Verify:
```python
from courses.models import Course
course = Course.objects.get(id=14)
print(f"Instructor: {course.instructor.username}")
```

## API Endpoint Details

**Endpoint**: `GET /api/progress/student_progress/`

**Query Parameters**:
- `course_id` (required): The ID of the course

**Authentication**: Required (JWT Bearer token)

**Permissions**: User must have `is_instructor=True`

**Response Format**:
```json
[
  {
    "student": "john_doe",
    "student_id": 5,
    "completed_lessons": 3,
    "total_lessons": 10,
    "percentage": 30
  }
]
```

## Files Modified

1. **frontend/src/app/instructor/courses/[courseId]/students/page.tsx**
   - Fixed API endpoint URL
   - Added proper authentication headers
   - Improved error handling
   - Enhanced empty state UI

2. **backend/check_enrollments.py** (new)
   - Utility script to check course enrollments
   - Helps debug enrollment issues

## Next Steps

After applying this fix:

1. Refresh the page at `/instructor/courses/14/students`
2. Check browser console for any errors
3. If no students appear, run `python check_enrollments.py 14` to verify enrollments exist
4. Ensure you're logged in as the course instructor
5. Verify your user has `is_instructor=True`
