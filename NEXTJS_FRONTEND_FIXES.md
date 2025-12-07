# Next.js Frontend API Integration Fixes

## Summary
Fixed multiple API integration issues between the Next.js frontend and Django backend to ensure proper data flow and error handling.

## Latest Fix (Dec 7, 2025)

### 7. Category Selection in Course Creation ✅
**Problem:** Categories were hardcoded and not being saved to the database. Selected category name wasn't mapped to category_id.

**Fix:**
- Added state for categories: `const [categories, setCategories] = useState<any[]>([])`
- Fetch categories from `/api/categories/` on component mount
- Updated category dropdown to use fetched categories with proper key mapping (`category.id` and `category.name`)
- Map selected category name to ID before saving: `const selectedCategory = categories.find(c => c.name === courseData.category)`
- Updated both `handleSaveDraft` and `handlePublishCourse` to use `category_id: selectedCategory?.id || null`
- Added loading state in dropdown: "Loading categories..." when categories are being fetched

**Files Changed:**
- `frontend/src/app/instructor/create-course/page.tsx`

**Result:** Categories are now properly saved to the database and courses are correctly associated with their categories.

## Issues Fixed

### 1. Course Loading (404 Error)
**Problem:** Frontend was calling non-existent Next.js API route `/api/instructor/courses/${id}`

**Fix:**
- Changed to call Django backend directly: `/api/courses/${id}` using `djangoApi.get()`
- Removed fetch() calls in favor of djangoApi client

**Files Changed:**
- `frontend/src/app/instructor/create-course/page.tsx`

### 2. File Upload Endpoints (404 Errors)
**Problem:** URLs used hyphens but Django REST Framework uses underscores

**Fix:**
- `/api/courses/${id}/upload-thumbnail/` → `/api/courses/${id}/upload_thumbnail/`
- `/api/lessons/${id}/upload-video/` → `/api/lessons/${id}/upload_video/`

**Files Changed:**
- `frontend/src/app/instructor/create-course/page.tsx`

### 3. Enhanced Error Handling
**Problem:** Empty error objects `{}` were being displayed instead of meaningful messages

**Fix in `djangoApi` client:**
- Improved `upload()` method to handle 401 errors and token refresh
- Better error message extraction from Django responses
- Handles field-specific errors (e.g., `thumbnail: ['error message']`)
- Increased response text logging to 500 chars for debugging
- Handles both JSON and text error responses

**Files Changed:**
- `frontend/src/lib/django-api-client.ts`

### 4. Course Creation/Publishing
**Problem:** Frontend was sending fields that don't exist in Django Course model

**Fields Removed:**
- `trainerId` (instructor is set automatically via `perform_create()`)
- `subtitle`
- `language`
- `level`
- `learningObjectives`
- `requirements`
- `targetAudience`
- `chapters` (handled separately)

**Correct Django Course Fields:**
- `title`
- `description`
- `category_id`
- `price`
- `status`
- `thumbnail`

**Fix:**
- Create course with only valid fields
- Create lessons separately via `/api/lessons/` endpoint
- Both Save Draft and Publish functions updated
- Save Draft now supports updating existing courses and lessons

**Files Changed:**
- `frontend/src/app/instructor/create-course/page.tsx`

### 5. Instructor Dashboard (NaN Values)
**Problem:** Dashboard was trying to display fields that don't exist in Django API response

**Fix:**
- Fetch courses from `/api/courses/?instructorId=${user.id}`
- Map Django response fields correctly:
  - `enrolled_count` → `students`
  - `lesson_count` → `lessons`
  - `updated_at` → `lastUpdated`
- Set default values for fields not yet implemented:
  - `rating`: 4.5 (default)
  - `revenue`: 0 (not tracked yet)
  - `completionRate`: 0 (not calculated yet)

**Removed Mock Data:**
- Revenue data (empty array with TODO comment)
- Engagement data (empty array with TODO comment)
- At-risk students (empty array with TODO comment)
- Top performers (empty array with TODO comment)
- Fake growth percentages ("+12% from last month")

**Files Changed:**
- `frontend/src/app/instructor/page.tsx`

### 6. Authentication
**Problem:** Missing logout function import

**Fix:**
- Added `useAuth` hook import
- Used `authLogout` from auth context

**Files Changed:**
- `frontend/src/app/instructor/page.tsx`

## Django API Endpoints Used

### Courses
- `GET /api/courses/` - List courses (with `?instructorId=` filter)
- `GET /api/courses/{id}/` - Get course details
- `POST /api/courses/` - Create course
- `PUT /api/courses/{id}/` - Update course
- `POST /api/courses/{id}/upload_thumbnail/` - Upload thumbnail

### Lessons
- `POST /api/lessons/` - Create lesson
- `PUT /api/lessons/{id}/` - Update lesson
- `POST /api/lessons/{id}/upload_video/` - Upload video

### Activity (Optional)
- `GET /api/instructor/activity/` - Get recent activity (if implemented)

## Django Course Model Fields

```python
class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    instructor = models.ForeignKey(User, ...)  # Set automatically
    category = models.ForeignKey(Category, ...)
    thumbnail = models.ImageField(...)
    status = models.CharField(...)  # 'draft' or 'published'
    price = models.DecimalField(...)
    original_price = models.DecimalField(...)
    is_free = models.BooleanField(...)
    created_at = models.DateTimeField(...)
    updated_at = models.DateTimeField(...)
    published_at = models.DateTimeField(...)
```

## Django Lesson Model Fields

```python
class Lesson(models.Model):
    course = models.ForeignKey(Course, ...)
    title = models.CharField(max_length=200)
    video_url = models.URLField(...)
    video_file = models.FileField(...)
    order = models.PositiveIntegerField()
    content = models.TextField(...)
```

## Testing Checklist

- [x] Login as instructor
- [x] View instructor dashboard
- [x] See courses without NaN values
- [x] Create new course
- [x] Save course as draft
- [x] Upload thumbnail
- [x] Add lessons
- [x] Publish course
- [x] Edit existing course
- [x] Upload lesson videos
- [x] Proper error messages displayed

## Future Enhancements Needed

### Backend (Django)
1. Add revenue tracking to Course model
2. Add rating/review system
3. Calculate completion rates
4. Implement analytics endpoints
5. Add engagement tracking
6. Add student performance metrics

### Frontend
1. ~~Implement category selection (map category names to IDs)~~ ✅ **FIXED**
2. Add support for additional course fields when Django model is extended
3. Implement revenue charts when backend is ready
4. Implement engagement charts when backend is ready
5. Add student performance views when backend is ready

## Notes

- All instructor-related operations now use the Django backend API
- Error messages are now meaningful and helpful
- File uploads properly handle authentication and token refresh
- Course creation matches Django model structure
- Dashboard displays real data from Django API
