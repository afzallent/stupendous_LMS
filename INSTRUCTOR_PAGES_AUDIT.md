# Instructor Pages - Hardcoded Data Audit

## Summary
Complete audit of all hardcoded/mock data in instructor-facing pages that need to be replaced with Django API calls.

---

## 1. Instructor Dashboard (`/instructor/page.tsx`)

### ✅ Already Fixed:
- Course list (fetches from `/api/courses/?instructorId=${user.id}`)
- Course thumbnails
- Enrollment counts (`enrolled_count`)
- Lesson counts (`lesson_count`)
- Total students, courses, lessons statistics

### ❌ Still Hardcoded/Missing:

#### Revenue Data (Lines 182-183)
```typescript
// TODO: Fetch revenue data from Django backend when implemented
setRevenueData([])
```
**Issue:** Revenue tracking not implemented in Django
**Shows:** Empty revenue chart
**Needs:** 
- Django model to track course sales/revenue
- API endpoint: `/api/instructor/revenue/`

#### Engagement Data (Lines 185-186)
```typescript
// TODO: Fetch engagement data from Django backend when implemented
setEngagementData([])
```
**Issue:** Student engagement tracking not implemented
**Shows:** Empty engagement chart
**Needs:**
- Django analytics to track daily active students
- API endpoint: `/api/instructor/engagement/`

#### Recent Activity (Lines 151-175)
```typescript
try {
  const activityResponse = await fetch(`${API_BASE_URL}/api/instructor/activity/?limit=10`, { headers })
  if (activityResponse.ok) {
    const activityData = await activityResponse.json()
    // Maps activity data
  } else {
    setRecentActivity([])
  }
}
```
**Status:** Tries to fetch but falls back to empty array
**Shows:** Empty activity feed
**Needs:** Activity tracking in Django (may already exist in `activity` app)

#### At-Risk Students (Lines 187-188)
```typescript
// TODO: Fetch student performance data from Django backend when implemented
setAtRiskStudents([])
setTopPerformers([])
```
**Issue:** Student performance analytics not implemented
**Shows:** Empty lists
**Needs:**
- Calculate student progress and identify at-risk students
- API endpoint: `/api/instructor/students/at-risk/`
- API endpoint: `/api/instructor/students/top-performers/`

#### Course Statistics (Hardcoded defaults)
```typescript
rating: 4.5, // Default rating (not in Django model yet)
revenue: 0, // Revenue tracking not implemented yet
completionRate: 0, // Completion rate not calculated yet
```
**Needs:**
- Course rating/review system
- Revenue tracking per course
- Completion rate calculation from Progress model

---

## 2. Create/Edit Course Page (`/instructor/create-course/page.tsx`)

### ✅ Already Fixed:
- Course creation (sends to `/api/courses/`)
- Lesson creation (sends to `/api/lessons/`)
- Thumbnail upload (sends to `/api/courses/{id}/upload_thumbnail/`)
- Video upload (sends to `/api/lessons/{id}/upload_video/`)
- Course loading for edit mode

### ❌ Still Hardcoded/Missing:

#### Category Selection (Line 417)
```typescript
category_id: null, // TODO: Map category name to ID
```
**Issue:** Categories not being saved
**Current:** User selects category name from dropdown, but it's not mapped to category ID
**Needs:**
- Fetch categories from `/api/categories/`
- Map selected category name to category ID before saving

#### Missing Course Fields
The Django Course model is minimal. Frontend has fields that don't exist in backend:
- `subtitle` - Not in Django model
- `language` - Not in Django model  
- `level` - Not in Django model
- `learningObjectives` - Not in Django model
- `requirements` - Not in Django model
- `targetAudience` - Not in Django model

**Options:**
1. Add these fields to Django Course model
2. Remove these fields from frontend
3. Store as JSON in a single field

#### Chapter Organization
```typescript
chapters: chapters.map((chapter, chapterIndex) => ({
  title: chapter.title,
  order: chapterIndex + 1,
  lessons: [...]
}))
```
**Issue:** Django doesn't have a Chapter model
**Current:** Lessons are flat, not organized into chapters
**Needs:**
- Create Chapter model in Django
- Update lesson creation to support chapters
- Or remove chapter UI from frontend

---

## 3. Other Instructor Pages (Need to Check)

### `/instructor/courses/[id]/students` - Student Management
**Status:** Not audited yet
**Likely needs:**
- List of enrolled students
- Student progress per course
- Student contact information

### `/instructor/analytics/[id]` - Course Analytics
**Status:** Not audited yet
**Likely needs:**
- Detailed course performance metrics
- Student engagement over time
- Completion rates
- Quiz performance

### `/instructor/question-bank` - Question Bank
**Status:** Not audited yet
**Backend:** Quiz models exist
**Needs:** Connect to quiz API

### `/instructor/quiz` - Quiz Management
**Status:** Not audited yet
**Backend:** Quiz models exist
**Needs:** Connect to quiz API

---

## Django Backend Status

### Existing Models/Endpoints:
- ✅ Course model (basic fields only)
- ✅ Lesson model
- ✅ Enrollment model
- ✅ Progress model
- ✅ Category model
- ✅ Quiz models (in quizzes app)
- ✅ Certificate model
- ✅ Activity tracking (in activity app)

### Missing Models/Features:
- ❌ Revenue/Payment tracking
- ❌ Course reviews/ratings
- ❌ Chapter model (for organizing lessons)
- ❌ Lesson resources
- ❌ Student performance analytics
- ❌ Engagement metrics
- ❌ Extended course fields (subtitle, level, etc.)

---

## Implementation Priority

### Critical (Breaks User Experience)
1. **Category Selection** - Categories exist but not being saved
   - Quick fix: Fetch categories and map to IDs
   - Estimated: 30 minutes

### High Priority (Core Features)
2. **Activity Feed** - Backend may already exist
   - Check if `/api/instructor/activity/` works
   - If not, implement basic activity tracking
   - Estimated: 2-4 hours

3. **Student Performance** - Essential for instructors
   - Calculate completion rates from Progress model
   - Identify at-risk students (< 25% progress)
   - Identify top performers (> 75% progress)
   - Estimated: 4-6 hours

### Medium Priority (Enhanced Features)
4. **Course Fields** - Decide on approach
   - Option A: Add fields to Django model (recommended)
   - Option B: Remove from frontend
   - Estimated: 2-3 hours

5. **Chapter Organization**
   - Create Chapter model
   - Update lesson creation flow
   - Estimated: 4-6 hours

### Low Priority (Nice to Have)
6. **Revenue Tracking** - Requires payment integration
   - Needs payment gateway integration
   - Track course sales
   - Estimated: 8-12 hours

7. **Reviews/Ratings** - Community feature
   - Create Review model
   - Add rating system
   - Estimated: 4-6 hours

8. **Engagement Analytics** - Advanced feature
   - Track daily active students
   - Video watch time
   - Quiz completion rates
   - Estimated: 8-12 hours

---

## Quick Wins (Can Fix Today)

### 1. Fix Category Selection
```typescript
// Fetch categories on component mount
const [categories, setCategories] = useState([])

useEffect(() => {
  const fetchCategories = async () => {
    const data = await djangoApi.get('/api/categories/')
    setCategories(data.results || [])
  }
  fetchCategories()
}, [])

// When saving course
const selectedCategory = categories.find(c => c.name === courseData.category)
const coursePayload = {
  ...
  category_id: selectedCategory?.id || null
}
```

### 2. Hide Empty Charts
Instead of showing empty charts, show "Coming Soon" messages:
```typescript
{revenueData.length > 0 ? (
  <Card>Revenue Chart</Card>
) : (
  <Card>
    <CardContent className="text-center py-8">
      <p className="text-muted-foreground">Revenue tracking coming soon</p>
    </CardContent>
  </Card>
)}
```

### 3. Check Activity Endpoint
Test if `/api/instructor/activity/` already works:
```bash
curl http://localhost:8000/api/instructor/activity/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Recommended Immediate Actions

### Today:
1. ✅ Fix category selection (30 min)
2. ✅ Hide empty revenue/engagement charts with "Coming Soon" (15 min)
3. ✅ Test activity endpoint and connect if it works (30 min)

### This Week:
4. Add missing course fields to Django model
5. Implement basic student performance analytics
6. Add chapter support or remove chapter UI

### Next Week:
7. Implement course reviews/ratings
8. Add lesson resources functionality
9. Build engagement analytics

---

## Files to Update

### Frontend (Next.js)
- ✅ `frontend/src/app/instructor/page.tsx` - Main dashboard
- ✅ `frontend/src/app/instructor/create-course/page.tsx` - Course creation
- ❌ `frontend/src/app/instructor/courses/[id]/students/page.tsx` - Student management
- ❌ `frontend/src/app/instructor/analytics/[id]/page.tsx` - Course analytics
- ❌ `frontend/src/app/instructor/question-bank/page.tsx` - Question bank
- ❌ `frontend/src/app/instructor/quiz/page.tsx` - Quiz management

### Backend (Django)
- `backend/courses/models.py` - Add missing fields
- `backend/courses/serializers.py` - Update serializers
- `backend/courses/views.py` - Add analytics endpoints
- `backend/activity/views.py` - Verify activity tracking works

---

## Summary

### What Works:
- ✅ Course CRUD operations
- ✅ Lesson CRUD operations
- ✅ File uploads (thumbnails, videos)
- ✅ Basic statistics (student count, course count)

### What's Missing:
- ❌ Category selection (easy fix)
- ❌ Revenue tracking (needs payment integration)
- ❌ Engagement analytics (needs implementation)
- ❌ Student performance metrics (needs calculation)
- ❌ Activity feed (may exist, needs testing)
- ❌ Course reviews/ratings (needs new model)
- ❌ Chapter organization (needs new model or UI removal)

### Next Steps:
1. Fix category selection immediately
2. Hide empty charts with "Coming Soon" messages
3. Test and connect activity feed if available
4. Plan Django model updates for missing features
