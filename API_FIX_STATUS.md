# API Fix Status - Updated Analysis

## Overview
This document tracks the migration from raw `fetch` calls to the standardized `djangoApi` client.

### ✅ Verified Fixed (Using `djangoApi`)
The following files have been verified to use the `djangoApi` client for backend interactions:

1. **`frontend/src/app/profile/page.tsx`**
   - Uses `djangoApi.patch`, `post`, `upload`, `delete`.
   - Comprehensive integration for user profile, password, and avatar management.

2. **`frontend/src/app/learn/[courseId]/[lessonId]/page.tsx`**
   - Uses `djangoApi.post` for marking lessons as complete.
   - Note: Still contains some mock data (videos, quizzes) but API interaction logic is updated.

3. **`frontend/src/app/admin/page.tsx`**
   - Uses `djangoApi.get('/courses/')` for dashboard stats.
   - Note: Some stats (total users) are currently hardcoded/mocked.

### ⚠️ Needs Attention (Raw `fetch` usage detected)
The following files still contain direct `fetch` calls and need to be updated to use `djangoApi`:

1. **`frontend/src/app/admin/sso-settings/page.tsx`**
   - Multiple `fetch` calls to `/api/admin/sso-providers`.
   - `fetch` calls to `/api/auth/logout`.

2. **`frontend/src/app/page.tsx`** (Home Page)
   - Contains `fetch` calls (likely for course listings).

3. **`frontend/src/app/instructor/courses/...`** (Instructor Dashboard)
   - Raw `fetch` usage detected in instructor course management files.

## Next Steps
- Refactor `admin/sso-settings/page.tsx` to use `djangoApi`.
- Refactor `app/page.tsx` to use `djangoApi`.
- Investigate and refactor instructor dashboard files.
