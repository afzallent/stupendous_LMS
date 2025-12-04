# CourseCompass V2 - Development Memory

## Project Context
- LMS platform built with Next.js 15, TypeScript, Prisma, and SQLite
- Three user roles: STUDENT, TRAINER (instructor), ADMIN
- Authentication using JWT tokens with jose library

## Recent Work (September 27, 2025)

### Quiz/Assessment System Implementation
- Created complete quiz system with creation, taking, and results features
- Multiple question types supported
- Automatic scoring with immediate feedback
- Question bank management for instructors
- Analytics dashboard for quiz results

### Authentication Fixes
1. **Login Redirect Loop Issue**
   - Problem: Admin page checking for token in localStorage but login wasn't storing it
   - Solution: Updated auth context to store accessToken in localStorage
   - Files: `/src/lib/auth.tsx`, `/src/app/admin/page.tsx`

2. **Admin API Authentication Issue**
   - Problem: Admin APIs use different token verification (verifyAdminAccess)
   - Current state: APIs returning "Invalid token" errors
   - Needs: Further investigation of token format mismatch

### Key Technical Details
- JWT tokens stored in both cookies (httpOnly) and localStorage
- Middleware uses cookies for server-side auth
- Client pages use localStorage for immediate access
- Admin APIs require special verification through admin-auth module

## Test Credentials
- admin@test.com / password123
- instructor@test.com / password123
- student@test.com / password123

## Common Issues & Solutions

### Stripe API Errors
- Expected with placeholder keys
- Use UPI payment or manual enrollment for testing
- Need real Stripe test keys for full functionality

### Database Issues
- Reset: `npx prisma db push --force-reset`
- Seed: `npx prisma db seed`
- Check users: `npx tsx scripts/check-users.ts`

### Build/Runtime Errors
- Missing modules: `npm install`
- Build issues: `npm run build`
- Clear cache: `rm -rf .next`

## File Structure Notes
- Quiz system: `/src/app/instructor/quiz/`, `/src/app/api/instructor/quiz/`
- Auth logic: `/src/lib/auth.tsx`, `/src/lib/jwt.ts`, `/src/middleware.ts`
- Admin auth: `/src/lib/admin-auth.ts` (uses different verification)

## Testing Infrastructure (September 27, 2025)

### Student Journey E2E Tests
- **Created:** Comprehensive Puppeteer test suite for student experience
- **Main Test File:** `tests/student-journey.test.js`
- **Helper Classes:** `tests/helpers/upi-payment-helper.js`
- **Configuration:** `tests/jest-puppeteer-headed.config.js` for visible browser

### Test Coverage
1. **Homepage & Course Browsing** - Navigate and view available courses
2. **Course Selection** - Add multiple courses to cart
3. **UPI Payment Flow** - Complete checkout with UPI simulation
4. **Registration/Login** - Create account and authenticate
5. **Learning Experience** - Access courses, view content, take quizzes
6. **Session Management** - Logout and re-login persistence
7. **Performance Metrics** - Load times and accessibility checks

### Running Tests on Windows
```bash
# Batch file (recommended)
run-student-tests.bat

# PowerShell
.\run-student-tests.ps1

# NPM script
npm run test:student:win
```

### Key Features
- **Visible Browser:** Tests run in headed mode (Chrome window visible)
- **Screenshots:** Automatic capture at key points
- **UPI Providers:** Supports GPay, PhonePe, Paytm, BHIM
- **Mock Payments:** Development-friendly payment simulation
- **Performance Monitoring:** Tracks FCP, load times, accessibility

### Known Test Environment Issues
- Jest not globally installed (use npx)
- Windows environment variables need cross-env or batch files
- Node version mismatch warning (requires >=22.12.0 but works with 20.11.1)

## Git Repository
- URL: https://github.com/afzalm/CCLMS2.git
- Branch: main
- All changes committed and pushed successfully