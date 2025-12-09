# Clerk Cleanup - Complete Guide

## Problem
The Astro frontend has **ghost Clerk code** - imports and wrapper components that reference `ClerkProviderWrapper.tsx` which **doesn't exist**, causing build errors.

## Files Affected (15 files)

### Student Dashboard Pages (5 files)
1. ✅ `src/pages/dashboard/student/courses.astro` - CLEANED
2. ⚠️ `src/pages/dashboard/student/certificates.astro`
3. ⚠️ `src/pages/dashboard/student/assessments.astro`
4. ⚠️ `src/pages/dashboard/student/discussions.astro`
5. ⚠️ `src/pages/dashboard/student/settings.astro`

### Trainer Dashboard Pages (6 files)
6. ⚠️ `src/pages/dashboard/trainer/courses/new.astro`
7. ⚠️ `src/pages/dashboard/trainer/settings.astro`
8. ⚠️ `src/pages/dashboard/trainer/discussions.astro`
9. ⚠️ `src/pages/dashboard/trainer/students.astro`
10. ⚠️ `src/pages/dashboard/trainer/assessments/new.astro`
11. ⚠️ `src/pages/dashboard/trainer/analytics.astro`

### Other Files (4 files)
12. ⚠️ `src/pages/dashboard/trainer/courses/[courseId]/lessons.astro` - Uses `ClerkTrainerWrapper`
13. ⚠️ `src/pages/dashboard/trainer/courses/index.astro` - Uses `ClerkTrainerWrapper`
14. ⚠️ `src/pages/admin/trainers.astro` - Uses Clerk API
15. ⚠️ `src/pages/admin/students.astro` - Uses Clerk API

## What to Remove

### Pattern 1: ClerkProviderWrapper (Most Common)

**Remove this import:**
```astro
import ClerkProviderWrapper from '../../../components/ClerkProviderWrapper.tsx';
```

**Remove opening tag:**
```astro
<ClerkProviderWrapper>
```

**Remove closing tag:**
```astro
</ClerkProviderWrapper>
```

### Pattern 2: ClerkTrainerWrapper

**Remove this import:**
```astro
import ClerkTrainerWrapper from '../../../../../components/auth/ClerkTrainerWrapper.jsx';
```

**Remove wrapper tags** (if present)

### Pattern 3: Clerk API Calls (Admin Pages)

**Remove Clerk environment variables:**
```astro
const CLERK_SECRET_KEY = import.meta.env.CLERK_SECRET_KEY;
const CLERK_TRAINER_ROLE = import.meta.env.CLERK_TRAINER_ROLE;
const CLERK_STUDENT_ROLE = import.meta.env.CLERK_STUDENT_ROLE;
```

**Remove Clerk API fetch calls:**
```javascript
// Fetch trainers from Clerk
const response = await fetch('https://api.clerk.com/v1/users', {
  headers: {
    'Authorization': `Bearer ${CLERK_SECRET_KEY}`
  }
});
```

## Automated Cleanup Script

I've created: `frontend-astro/cleanup-clerk-references.ps1`

**Run it:**
```powershell
cd frontend-astro
.\cleanup-clerk-references.ps1
```

## Manual Cleanup Steps

For each file, follow these steps:

### Step 1: Remove Import
Find and delete the line:
```astro
import ClerkProviderWrapper from '../../../components/ClerkProviderWrapper.tsx';
```

### Step 2: Remove Opening Tag
Find and delete:
```astro
<ClerkProviderWrapper>
```

### Step 3: Remove Closing Tag
Find and delete (usually at the end of the file):
```astro
</ClerkProviderWrapper>
```

### Step 4: Verify
- No more Clerk imports
- No more wrapper tags
- File should compile without errors

## Quick Fix Commands

### Using PowerShell (Windows)
```powershell
cd frontend-astro

# Remove ClerkProviderWrapper imports
Get-ChildItem -Path "src/pages" -Recurse -Filter "*.astro" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "import ClerkProviderWrapper from [^;]+;`n", ""
    $content = $content -replace "<ClerkProviderWrapper>`n", ""
    $content = $content -replace "</ClerkProviderWrapper>`n", ""
    Set-Content -Path $_.FullName -Value $content -NoNewline
}
```

### Using Bash (Linux/Mac)
```bash
cd frontend-astro

# Remove ClerkProviderWrapper imports
find src/pages -name "*.astro" -type f -exec sed -i '' \
  -e '/import ClerkProviderWrapper/d' \
  -e '/<ClerkProviderWrapper>/d' \
  -e '/<\/ClerkProviderWrapper>/d' {} +
```

## Verification

After cleanup, run:
```bash
cd frontend-astro
npm run dev
```

Check for errors. You should see:
- ✅ No "Could not import ClerkProviderWrapper" errors
- ✅ All pages load without import errors
- ✅ Authentication still works (handled by middleware)

## Why This Happened

1. **Migration from Clerk to Django Auth**: The project migrated from Clerk authentication to Django JWT authentication
2. **Incomplete Cleanup**: The wrapper components were removed but imports remained
3. **Ghost References**: Files still reference non-existent Clerk components

## Current Authentication

**Now using:**
- Django JWT tokens (access + refresh)
- Middleware-based authentication
- `django-api-client.js` for API calls
- No Clerk dependencies needed

**Authentication flow:**
1. User logs in → Django returns JWT tokens
2. Tokens stored in localStorage
3. Middleware checks authentication
4. API calls use JWT Bearer tokens
5. No Clerk involved

## Admin Pages Special Case

The admin pages (`admin/trainers.astro`, `admin/students.astro`) use Clerk API to fetch users. These need to be **completely rewritten** to use Django API:

### Before (Clerk):
```javascript
const response = await fetch('https://api.clerk.com/v1/users', {
  headers: { 'Authorization': `Bearer ${CLERK_SECRET_KEY}` }
});
```

### After (Django):
```javascript
import { djangoApi } from '../utils/django-api-client';

const trainers = await djangoApi.get('/api/users/', { 
  is_instructor: true 
});
```

## Testing Checklist

After cleanup:

### Student Pages
- [ ] `/dashboard/student/courses` - Loads without errors
- [ ] `/dashboard/student/certificates` - Loads without errors
- [ ] `/dashboard/student/assessments` - Loads without errors
- [ ] `/dashboard/student/discussions` - Loads without errors
- [ ] `/dashboard/student/settings` - Loads without errors

### Trainer Pages
- [ ] `/dashboard/trainer/courses` - Loads without errors
- [ ] `/dashboard/trainer/courses/new` - Loads without errors
- [ ] `/dashboard/trainer/assessments/new` - Loads without errors
- [ ] `/dashboard/trainer/students` - Loads without errors
- [ ] `/dashboard/trainer/analytics` - Loads without errors
- [ ] `/dashboard/trainer/discussions` - Loads without errors
- [ ] `/dashboard/trainer/settings` - Loads without errors

### Admin Pages
- [ ] `/admin/trainers` - Needs rewrite (uses Clerk API)
- [ ] `/admin/students` - Needs rewrite (uses Clerk API)

## Files Status

| File | Status | Action Needed |
|------|--------|---------------|
| student/courses.astro | ✅ CLEANED | None |
| student/certificates.astro | ⚠️ PENDING | Remove Clerk wrapper |
| student/assessments.astro | ⚠️ PENDING | Remove Clerk wrapper |
| student/discussions.astro | ⚠️ PENDING | Remove Clerk wrapper |
| student/settings.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/courses/new.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/settings.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/discussions.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/students.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/assessments/new.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/analytics.astro | ⚠️ PENDING | Remove Clerk wrapper |
| trainer/courses/[courseId]/lessons.astro | ⚠️ PENDING | Remove ClerkTrainerWrapper |
| trainer/courses/index.astro | ⚠️ PENDING | Remove ClerkTrainerWrapper |
| admin/trainers.astro | ❌ NEEDS REWRITE | Replace Clerk API with Django |
| admin/students.astro | ❌ NEEDS REWRITE | Replace Clerk API with Django |

## Next Steps

1. **Run the cleanup script** or manually remove Clerk references
2. **Test all pages** to ensure they load
3. **Rewrite admin pages** to use Django API instead of Clerk
4. **Remove Clerk from package.json** if it's still there
5. **Remove Clerk environment variables** from `.env` files

## Estimated Time

- **Automated cleanup**: 5 minutes (run script)
- **Manual verification**: 15 minutes
- **Admin pages rewrite**: 1-2 hours
- **Total**: ~2 hours

## Success Criteria

✅ No Clerk import errors  
✅ All dashboard pages load  
✅ Authentication works via Django  
✅ No references to Clerk in codebase  
✅ Admin pages use Django API  

## Conclusion

The Clerk cleanup is straightforward - just remove the ghost imports and wrapper tags. The authentication is already working via Django middleware, so removing Clerk won't break anything. The only complex part is rewriting the admin pages to use Django API instead of Clerk API.
