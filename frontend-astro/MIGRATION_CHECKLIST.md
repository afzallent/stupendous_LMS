# Astro Frontend Migration Checklist

## Phase 1: Setup & Configuration ✅

- [x] Create Django API configuration files
  - [x] `src/config/django-api.config.ts`
  - [x] `src/utils/django-api-client.js`
  - [x] `src/utils/django-api-server.ts`
- [x] Update environment variables
  - [x] `.env` - Set PUBLIC_API_URL
  - [x] `.env.example` - Update template
- [x] Update Django CORS settings
  - [x] Add Astro port (4321) to CORS_ALLOWED_ORIGINS
  - [x] Enable CORS_ALLOW_CREDENTIALS
- [x] Update middleware for JWT authentication
  - [x] Replace Clerk middleware with Django JWT checks

## Phase 2: Authentication Pages ✅

- [x] Create student login page
  - [x] `/login/student.astro`
  - [x] JWT token handling
  - [x] Role validation
- [x] Create instructor login page
  - [x] `/login/trainer.astro`
  - [x] JWT token handling
  - [x] Role validation
- [ ] Create registration pages
  - [ ] `/register/student.astro`
  - [ ] `/register/trainer.astro`
- [ ] Create password reset flow
  - [ ] Request reset page
  - [ ] Reset password page

## Phase 3: Core Pages ⏳

- [x] Update courses listing page
  - [x] Fetch from Django API
  - [x] Display Django model fields
- [ ] Update course detail page
  - [ ] Change from slug to ID-based routing
  - [ ] Fetch course with lessons
  - [ ] Add enrollment button
  - [ ] Show progress if enrolled
- [ ] Update course player
  - [ ] Fetch course with progress
  - [ ] Display lessons
  - [ ] Mark lessons complete
  - [ ] Track progress

## Phase 4: Dashboard Pages ⏳

- [x] Update student dashboard (partial)
  - [x] Fetch dashboard data
  - [x] Display stats
  - [ ] Display enrolled courses with progress
  - [ ] Add recent activity section
- [ ] Update instructor dashboard
  - [ ] Fetch instructor analytics
  - [ ] Display course statistics
  - [ ] Show student enrollments
  - [ ] Course management links
- [ ] Create course management pages
  - [ ] Create course form
  - [ ] Edit course form
  - [ ] Manage lessons
  - [ ] View enrollments

## Phase 5: User Profile ⏳

- [ ] Create profile view page
  - [ ] Display user information
  - [ ] Show avatar
  - [ ] Display bio and details
- [ ] Create profile edit page
  - [ ] Update user information
  - [ ] Upload avatar
  - [ ] Change password
- [ ] Add user menu in navbar
  - [ ] Display current user
  - [ ] Profile link
  - [ ] Logout button

## Phase 6: Enrollment & Progress ⏳

- [ ] Create enrollment flow
  - [ ] Enroll button on course detail
  - [ ] Check enrollment status
  - [ ] Handle already enrolled
- [ ] Implement progress tracking
  - [ ] Mark lessons complete
  - [ ] Update progress percentage
  - [ ] Show next lesson
  - [ ] Course completion

## Phase 7: Cleanup 🚧

- [ ] Remove Clerk dependencies
  - [ ] Run `npm uninstall @clerk/astro @clerk/clerk-react`
  - [ ] Or use cleanup script: `./cleanup-clerk.sh` (Unix) or `./cleanup-clerk.ps1` (Windows)
- [ ] Remove Clerk components
  - [ ] Delete `ClerkProviderWrapper.tsx`
  - [ ] Delete `ClerkProviderWrapper.jsx`
  - [ ] Delete `SignOutLink.tsx`
- [ ] Search and replace Clerk imports
  - [ ] Search: `grep -r '@clerk' src/`
  - [ ] Search: `grep -r 'Clerk' src/`
  - [ ] Update all files with Clerk references
- [ ] Remove old login page
  - [ ] Delete `/login.astro` (if exists)

## Phase 8: Testing 🧪

- [ ] Test authentication flows
  - [ ] Student login
  - [ ] Instructor login
  - [ ] Token refresh
  - [ ] Logout
  - [ ] Session expiration
- [ ] Test API endpoints
  - [ ] Courses listing
  - [ ] Course detail
  - [ ] Enrollment
  - [ ] Progress tracking
  - [ ] Dashboard data
- [ ] Test error handling
  - [ ] Invalid credentials
  - [ ] Expired tokens
  - [ ] Network errors
  - [ ] API errors
- [ ] Test role-based access
  - [ ] Student-only pages
  - [ ] Instructor-only pages
  - [ ] Unauthorized access

## Phase 9: UI/UX Improvements 🎨

- [ ] Add loading states
  - [ ] Skeleton screens
  - [ ] Loading spinners
  - [ ] Progress indicators
- [ ] Add error messages
  - [ ] Form validation errors
  - [ ] API error messages
  - [ ] Network error messages
- [ ] Add success messages
  - [ ] Login success
  - [ ] Enrollment success
  - [ ] Profile update success
- [ ] Improve navigation
  - [ ] User menu
  - [ ] Breadcrumbs
  - [ ] Back buttons

## Phase 10: Performance 🚀

- [ ] Implement caching
  - [ ] Cache course data
  - [ ] Cache user data
  - [ ] Cache dashboard data
- [ ] Optimize API calls
  - [ ] Reduce unnecessary calls
  - [ ] Batch requests
  - [ ] Implement pagination
- [ ] Optimize images
  - [ ] Lazy loading
  - [ ] Responsive images
  - [ ] Image optimization

## Phase 11: Documentation 📚

- [x] Create migration guide
  - [x] `DJANGO_MIGRATION_GUIDE.md`
- [x] Create quick start guide
  - [x] `QUICK_START.md`
- [x] Create migration summary
  - [x] `MIGRATION_SUMMARY.md`
- [x] Create integration overview
  - [x] `../ASTRO_DJANGO_INTEGRATION.md`
- [ ] Update README
  - [ ] Add setup instructions
  - [ ] Add development workflow
  - [ ] Add deployment guide

## Phase 12: Production Readiness 🏭

- [ ] Environment configuration
  - [ ] Production API URL
  - [ ] Environment-specific settings
  - [ ] Secure token storage
- [ ] Security review
  - [ ] HTTPS enforcement
  - [ ] Token security
  - [ ] CORS configuration
  - [ ] Input validation
- [ ] Performance optimization
  - [ ] Build optimization
  - [ ] Asset optimization
  - [ ] CDN configuration
- [ ] Monitoring setup
  - [ ] Error tracking
  - [ ] Performance monitoring
  - [ ] User analytics

## Quick Commands

### Start Development
```bash
# Terminal 1 - Django
cd backend && python manage.py runserver

# Terminal 2 - Astro
cd frontend-astro && npm run dev
```

### Run Cleanup
```bash
# Unix/Linux/Mac
cd frontend-astro && ./cleanup-clerk.sh

# Windows PowerShell
cd frontend-astro && .\cleanup-clerk.ps1
```

### Search for Clerk References
```bash
# Unix/Linux/Mac
grep -r '@clerk' src/
grep -r 'Clerk' src/

# Windows PowerShell
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.jsx,*.js,*.astro | Select-String '@clerk'
Get-ChildItem -Recurse -Include *.tsx,*.ts,*.jsx,*.js,*.astro | Select-String 'Clerk'
```

### Test API Connection
```bash
# Test courses endpoint
curl http://localhost:8000/api/courses/

# Test login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

## Progress Summary

- **Completed**: 15 tasks
- **In Progress**: 5 tasks
- **Pending**: 45+ tasks
- **Overall Progress**: ~25%

## Priority Order

1. **High Priority** (Do First):
   - Remove Clerk dependencies
   - Complete student dashboard
   - Update course detail page
   - Create registration pages

2. **Medium Priority** (Do Next):
   - Update instructor dashboard
   - Implement enrollment flow
   - Add user profile pages
   - Complete progress tracking

3. **Low Priority** (Do Later):
   - UI/UX improvements
   - Performance optimization
   - Advanced features
   - Production deployment

## Notes

- Keep Django backend running while developing frontend
- Test each feature after implementation
- Check browser console for errors
- Review Django logs for API issues
- Update this checklist as you progress

## Resources

- [Quick Start Guide](./QUICK_START.md)
- [Migration Guide](./DJANGO_MIGRATION_GUIDE.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Integration Overview](../ASTRO_DJANGO_INTEGRATION.md)
