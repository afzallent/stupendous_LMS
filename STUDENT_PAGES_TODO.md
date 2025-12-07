# Student/Learning Pages - Hardcoded Data Audit

## Summary
This document lists all the hardcoded/mock data in student-facing pages that need to be replaced with Django API calls.

---

## 1. Lesson Player (`/learn/[courseId]/[lessonId]/page.tsx`)

### ✅ Already Fixed:
- Course data (title, instructor, lessons)
- Current lesson data (title, description, video URL)
- Curriculum/lesson list

### ❌ Still Hardcoded:

#### Resources Section
```typescript
const resources = [
  { id: "1", title: "HTML Cheat Sheet", type: "pdf", size: "2.4 MB" },
  { id: "2", title: "Exercise Files", type: "zip", size: "15.8 MB" },
  { id: "3", title: "HTML Reference Links", type: "txt", size: "4 KB" }
]
```
**Needs:** Django API endpoint to fetch lesson resources
**Endpoint:** `/api/lessons/{id}/resources/` or add resources to lesson serializer

#### Quiz Section
```typescript
const quiz = {
  id: "quiz-1",
  title: "HTML Document Structure Quiz",
  questions: [...]
}
```
**Needs:** Django API endpoint to fetch lesson quiz
**Endpoint:** `/api/lessons/{id}/quiz/` or `/api/quizzes/?lesson={id}`

#### Discussion Section
```typescript
const discussions = [
  {
    id: "1",
    user: "John Doe",
    question: "Can we have multiple <body> tags?",
    timestamp: "2 hours ago",
    replies: 3
  }
]
```
**Needs:** Django API endpoint for lesson discussions/Q&A
**Endpoint:** `/api/lessons/{id}/discussions/` (needs to be implemented)

#### Progress Tracking
- `completedLessons` - hardcoded to 0
- `progress` percentage - hardcoded to 0
- Lesson completion status - hardcoded to false

**Needs:** Django API endpoint to fetch user progress
**Endpoint:** `/api/progress/?course={courseId}&student={userId}`

#### Notes
- Notes are saved to localStorage only
**Needs:** Django API endpoint to save/retrieve notes
**Endpoint:** `/api/lessons/{id}/notes/` (needs to be implemented)

---

## 2. Course Overview (`/learn/[courseId]/page.tsx`)

**Status:** Not checked yet, likely has hardcoded data

**Needs Review:**
- Course details
- Instructor information
- Enrollment status
- Course progress
- Reviews/ratings

---

## 3. Student Dashboard (`/student/dashboard` or similar)

**Status:** Not checked yet

**Likely Hardcoded:**
- Enrolled courses
- Progress statistics
- Recent activity
- Upcoming lessons
- Certificates

---

## 4. Course Listing/Browse (`/courses/page.tsx`)

**Status:** Not checked yet

**Likely Hardcoded:**
- Course cards
- Filters (category, level, price)
- Search functionality
- Pagination

---

## 5. Course Detail Page (`/courses/[id]/page.tsx`)

**Status:** Not checked yet

**Likely Hardcoded:**
- Course information
- Curriculum preview
- Instructor details
- Reviews
- Enrollment button

---

## Implementation Priority

### High Priority (Core Learning Experience)
1. **Progress Tracking** - Essential for tracking student completion
2. **Lesson Resources** - Important for downloadable materials
3. **Course Overview** - Students need to see what they're enrolled in

### Medium Priority (Enhanced Learning)
4. **Quiz Integration** - Already has quiz models, just needs API connection
5. **Notes System** - Useful but can work with localStorage temporarily
6. **Discussion/Q&A** - Needs new Django model and API

### Low Priority (Nice to Have)
7. **Reviews/Ratings** - Needs new Django model
8. **Certificates Display** - Certificate model exists, just needs frontend integration

---

## Django Backend Requirements

### Existing Endpoints to Use:
- ✅ `/api/courses/{id}/` - Course details
- ✅ `/api/lessons/{id}/` - Lesson details
- ✅ `/api/progress/` - Progress tracking (exists)
- ✅ `/api/quizzes/` - Quiz system (exists)

### New Endpoints Needed:
- ❌ `/api/lessons/{id}/resources/` - Lesson resources
- ❌ `/api/lessons/{id}/discussions/` - Lesson discussions
- ❌ `/api/lessons/{id}/notes/` - Student notes
- ❌ `/api/courses/{id}/reviews/` - Course reviews
- ❌ `/api/progress/course/{courseId}/` - Course progress summary

### Models to Create:
1. **LessonResource** - For downloadable files
2. **LessonDiscussion** - For Q&A threads
3. **LessonNote** - For student notes
4. **CourseReview** - For ratings and reviews

---

## Quick Wins (Easy to Implement)

### 1. Progress Tracking
The Progress model already exists. Just need to:
- Fetch progress data from `/api/progress/?course={courseId}`
- Calculate completion percentage
- Update UI to show real progress

### 2. Quiz Integration
The Quiz model already exists. Just need to:
- Fetch quiz from `/api/quizzes/?lesson={lessonId}`
- Display quiz questions
- Submit answers via API

### 3. Remove Hardcoded Resources
For now, just hide the resources section if no resources exist:
```typescript
{resources.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Downloadable Resources</CardTitle>
    </CardHeader>
    ...
  </Card>
)}
```

---

## Recommended Approach

### Phase 1: Core Functionality (This Week)
1. Fix progress tracking to use real data
2. Connect quiz system to API
3. Hide/remove hardcoded sections that don't have backend support

### Phase 2: Enhanced Features (Next Week)
1. Implement lesson resources model and API
2. Add notes API endpoint
3. Update course overview page

### Phase 3: Community Features (Future)
1. Implement discussion/Q&A system
2. Add review/rating system
3. Add social features

---

## Files to Update

### Frontend (Next.js)
- `frontend/src/app/learn/[courseId]/[lessonId]/page.tsx` - Lesson player
- `frontend/src/app/learn/[courseId]/page.tsx` - Course overview
- `frontend/src/app/courses/[id]/page.tsx` - Course detail
- `frontend/src/app/courses/page.tsx` - Course listing
- Student dashboard (need to find the file)

### Backend (Django)
- `backend/courses/models.py` - Add new models
- `backend/courses/serializers.py` - Add new serializers
- `backend/courses/views.py` - Add new viewsets
- `backend/courses/api_urls.py` - Register new endpoints

---

## Next Steps

1. **Immediate:** Remove or hide hardcoded sections in lesson player
2. **Short-term:** Implement progress tracking with real data
3. **Medium-term:** Add resource and notes functionality
4. **Long-term:** Build out community features (discussions, reviews)
