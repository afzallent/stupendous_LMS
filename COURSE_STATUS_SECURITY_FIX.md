# Course Status Security Fix

## Issue

The course list and search endpoints were not filtering by course status, allowing students and anonymous users to see draft and archived courses. This violated the principle that only published courses should be visible to students.

## What Was Fixed

**File:** `backend/courses/views.py`

### 1. Enhanced `get_queryset()` Method

**Before:**
```python
def get_queryset(self):
    queryset = Course.objects.all().order_by('-created_at')
    # No status filtering
```

**After:**
```python
def get_queryset(self):
    queryset = Course.objects.all().order_by('-created_at')
    
    # Students and anonymous users: only published courses
    if not self.request.user.is_authenticated or self.request.user.is_student:
        queryset = queryset.filter(status='published')
    
    # Instructors: published courses + their own (any status)
    elif self.request.user.is_instructor:
        instructor_id = self.request.query_params.get('instructorId')
        if instructor_id and int(instructor_id) == self.request.user.id:
            # Viewing own courses - show all statuses
            queryset = queryset.filter(instructor_id=instructor_id)
        else:
            # Viewing other courses - only published
            queryset = queryset.filter(status='published')
            if instructor_id:
                queryset = queryset.filter(instructor_id=instructor_id)
```

### 2. Added `retrieve()` Method Override

Prevents direct access to unpublished course details:

```python
def retrieve(self, request, *args, **kwargs):
    instance = self.get_object()
    
    # Check if user has permission to view this course
    if instance.status != 'published':
        # Only the instructor can view unpublished courses
        if not request.user.is_authenticated or instance.instructor != request.user:
            return Response(
                {'detail': 'This course is not available.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    serializer = self.get_serializer(instance)
    return Response(serializer.data)
```

### 3. Enhanced `my_courses()` Action

Clarified that instructors see all their courses regardless of status:

```python
@action(detail=False, methods=['get'])
def my_courses(self, request):
    """Get courses created by current instructor (all statuses)"""
    # Instructors see all their courses regardless of status
    courses = Course.objects.filter(instructor=request.user).order_by('-created_at')
```

### 4. Added Search Functionality

Integrated search into `get_queryset()` with proper status filtering:

```python
# Search functionality
search = self.request.query_params.get('search')
if search:
    queryset = queryset.filter(
        Q(title__icontains=search) | Q(description__icontains=search)
    )
```

## Access Control Rules

### Anonymous Users
- ✅ Can see: Published courses only
- ❌ Cannot see: Draft or archived courses

### Students
- ✅ Can see: Published courses only
- ❌ Cannot see: Draft or archived courses
- ✅ Can search: Published courses only

### Instructors
- ✅ Can see: All published courses
- ✅ Can see: Their own courses (any status)
- ❌ Cannot see: Other instructors' draft/archived courses
- ✅ Can search: Published courses (unless viewing own)

## Course Status Values

From `courses/models.py`:
```python
STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('published', 'Published'),
    ('archived', 'Archived'),
]
```

## API Endpoints Affected

### GET `/api/courses/`
- **Before:** Returned all courses regardless of status
- **After:** Returns only published courses (or instructor's own courses)

### GET `/api/courses/?search=python`
- **Before:** Could search all courses including drafts
- **After:** Searches only published courses (or instructor's own)

### GET `/api/courses/?instructorId=123`
- **Before:** Returned all courses by instructor
- **After:** Returns published courses (or all if viewing own)

### GET `/api/courses/{id}/`
- **Before:** Could access any course by ID
- **After:** Returns 404 for unpublished courses (unless owner)

### GET `/api/courses/my_courses/`
- **Before:** Returned instructor's courses
- **After:** Same, but explicitly shows all statuses

## Security Benefits

1. **Privacy Protection:** Draft courses remain private until published
2. **Content Control:** Instructors control when courses become visible
3. **Consistent Behavior:** All endpoints respect status filtering
4. **No Client-Side Filtering:** Security enforced at API level
5. **Proper 404 Responses:** Unpublished courses appear as "not found"

## Testing

### Test Case 1: Anonymous User
```bash
# Should only see published courses
curl http://localhost:8000/api/courses/

# Should get 404 for draft course
curl http://localhost:8000/api/courses/123/  # (draft course)
```

### Test Case 2: Student
```bash
# Should only see published courses
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/

# Should get 404 for draft course
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/123/
```

### Test Case 3: Instructor (Own Courses)
```bash
# Should see all own courses (any status)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/?instructorId=1

# Should see own draft course
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/123/
```

### Test Case 4: Instructor (Other Courses)
```bash
# Should only see published courses
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/

# Should get 404 for other instructor's draft
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/courses/456/
```

## Migration Notes

No database migration required - this is a view-level security fix.

## Frontend Impact

The frontend no longer needs to filter courses by status. The API handles it automatically based on user role.

**Before (client-side filtering needed):**
```typescript
const courses = await fetch('/api/courses/')
const published = courses.filter(c => c.status === 'published')
```

**After (automatic server-side filtering):**
```typescript
const courses = await fetch('/api/courses/')
// Already filtered by status
```

## Summary

This fix ensures that:
- Students only see published courses
- Instructors can manage their own courses (any status)
- Unpublished courses are not leaked through search or listing
- Direct access to unpublished courses returns 404
- All filtering happens server-side for security

The fix is backward compatible and doesn't require frontend changes, but improves security significantly.
