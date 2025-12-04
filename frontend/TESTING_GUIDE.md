# CourseCompass V2 - Testing Guide

## 🚀 Application Status

✅ **Server is running successfully at:** http://localhost:3000

## 🔐 Working Test Credentials

### Confirmed Working Accounts:
| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@test.com | **password123** | Full system access |
| **Instructor** | instructor@test.com | **password123** | Course & quiz creation |
| **Student** | student@test.com | **password123** | Learning features |

## ✅ Working Features

### 1. **Authentication System**
- ✅ Login/Logout working
- ✅ Role-based access control
- ✅ JWT token authentication
- ✅ Protected routes

### 2. **Course Management**
- ✅ Browse courses
- ✅ Course details page
- ✅ Course categories
- ✅ Search and filter courses
- ✅ Course enrollment (database level)

### 3. **Learning System**
- ✅ Student dashboard
- ✅ Progress tracking
- ✅ Lesson viewing
- ✅ Chapter navigation

### 4. **Quiz/Assessment System** (NEW!)
- ✅ Quiz creation for instructors
- ✅ Multiple question types:
  - Multiple Choice
  - True/False
  - Text/Fill-in-blank
  - Multiple Answer
- ✅ Quiz taking interface
- ✅ Automatic scoring
- ✅ Result tracking
- ✅ Question bank management
- ✅ Quiz analytics for instructors

### 5. **Instructor Features**
- ✅ Course creation
- ✅ Quiz creation
- ✅ Question bank
- ✅ Student progress tracking
- ✅ Analytics dashboard

### 6. **Admin Features**
- ✅ User management
- ✅ Course moderation
- ✅ System statistics

## ⚠️ Features Requiring Configuration

### Payment System (Stripe)
**Status:** Requires valid Stripe API keys

To enable payment features:
1. Create a free Stripe test account at https://stripe.com
2. Get your test API keys from the Stripe dashboard
3. Update `.env.local` with:
   ```
   STRIPE_PUBLISHABLE_KEY="pk_test_your-actual-key"
   STRIPE_SECRET_KEY="sk_test_your-actual-key"
   ```

**Alternative for testing without Stripe:**
- Use the UPI payment option (simulated)
- Enrollments can be created manually via database

### OAuth Login
**Status:** Requires OAuth app configuration

To enable social login:
1. Configure OAuth apps with providers (Google, Facebook, LinkedIn)
2. Update `.env.local` with actual client IDs and secrets

## 🧪 Testing Workflows

### 1. Student Learning Flow
1. Login as: `student@test.com` / `password123`
2. Browse available courses at `/courses`
3. View course details
4. Access learning dashboard at `/learn`
5. Take quizzes if available

### 2. Instructor Course Creation
1. Login as: `instructor@test.com` / `password123`
2. Go to `/instructor`
3. Create a new course
4. Add chapters and lessons
5. Create quizzes at `/instructor/quiz/create`
6. View student results at `/instructor/quiz/[quizId]/results`

### 3. Quiz Testing Flow
1. **As Instructor:**
   - Go to `/instructor/quiz/create?lessonId=[lessonId]&courseId=[courseId]`
   - Create quiz with various question types
   - Manage questions in question bank at `/instructor/question-bank`

2. **As Student:**
   - Navigate to course with quiz
   - Take quiz at `/learn/[courseId]/quiz/[quizId]`
   - View results immediately after submission

### 4. Admin Management
1. Login as: `admin@test.com` / `password123`
2. Access admin dashboard at `/admin`
3. Manage users and courses
4. View system statistics

## 🛠️ Troubleshooting

### Common Issues:

1. **"Invalid API Key" for Stripe**
   - Expected behavior without real Stripe keys
   - Use UPI payment or manual enrollment for testing

2. **"No courses found"**
   - Run seed script: `npx prisma db seed`
   - Or create courses as instructor

3. **"Cannot find module" errors**
   - Run: `npm install`
   - Rebuild: `npm run build`

4. **Database errors**
   - Reset database: `npx prisma db push --force-reset`
   - Re-seed: `npx prisma db seed`

## 📊 Test Data Available

### Existing Courses:
- JavaScript Fundamentals
- Complete React Development Course
- UI/UX Design Principles
- JavaScript Quiz Testing (multiple instances for testing)

### Test Quiz:
- Created via test script
- Available in "JavaScript Quiz Testing" course
- 4 questions of different types
- Passing score: 70%

## 🔍 Checking Application Status

### View Logs:
The development server shows detailed logs including:
- API calls
- Database queries (Prisma logs)
- Authentication status
- Middleware execution

### Database Inspection:
View database content:
```bash
npx tsx scripts/check-users.ts
```

### Test Quiz System:
```bash
npx tsx scripts/test-quiz-system.ts
```

## 📝 Notes

- All passwords are hashed with bcrypt
- JWT tokens expire after 1 hour (configurable)
- File uploads are stored locally in development
- Email notifications are not configured (console logs only)

## 🎯 Quick Start Testing

1. **Test Login:** Go to http://localhost:3000/auth/login
2. **Use credentials:** admin@test.com / password123
3. **Explore features:** Navigate through the dashboard
4. **Test Quiz:** Create and take a quiz
5. **Check results:** View analytics and scores

---

**Server Status:** ✅ Running on http://localhost:3000
**Last Updated:** September 27, 2025