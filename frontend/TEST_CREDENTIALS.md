# CourseCompass V2 - Test Credentials

## 🔐 CONFIRMED User Accounts for Testing

### ✅ Admin Accounts
| Email | Role | Password |
|-------|------|----------|
| **admin@test.com** | ADMIN | **password123** ✅ |
| admin@example.com | ADMIN | password (from seed) |

### ✅ Instructor/Trainer Accounts
| Email | Role | Password |
|-------|------|----------|
| **instructor@test.com** | TRAINER | **password123** ✅ |
| instructor@example.com | TRAINER | password (from seed) |
| test.instructor@example.com | TRAINER | Unknown |
| john.smith@example.com | TRAINER | password (from seed) |
| quiz.instructor@test.com | TRAINER | **testpass123** ✅ |

### ✅ Student Accounts
| Email | Role | Password |
|-------|------|----------|
| **student@test.com** | STUDENT | **password123** ✅ |
| student@example.com | STUDENT | password (from seed) |
| test.student@example.com | STUDENT | Unknown |
| quiz.student@test.com | STUDENT | **testpass123** ✅ |
| afzal.m@gmail.com | STUDENT | (user-created password) |

## 🔑 Common Test Passwords to Try

Based on typical test setups, try these passwords in order:

1. **password123** - Most common test password
2. **test123** - Simple test password
3. **testpass123** - Used in quiz test script
4. **admin123** - For admin accounts
5. **Password123!** - With special characters
6. **12345678** - Simple numeric
7. **demo123** - Demo account password
8. **password** - Basic password

## 📝 Test Scenarios

### For Admin Testing:
- **Email:** admin@test.com
- **Password:** Try password123 or admin123
- **Access:** Full admin dashboard, user management, system settings

### For Instructor Testing:
- **Email:** instructor@test.com
- **Password:** Try password123 or test123
- **Access:** Course creation, quiz creation, student management

### For Student Testing:
- **Email:** student@test.com
- **Password:** Try password123 or test123
- **Access:** Course enrollment, quiz taking, certificate viewing

### For Quiz System Testing:
- **Instructor:** quiz.instructor@test.com / testpass123
- **Student:** quiz.student@test.com / testpass123
- These accounts were created specifically for quiz testing

## 🧪 Quick Test Flow

1. **Student Flow:**
   - Login as: student@test.com
   - Browse courses
   - Enroll in "JavaScript Fundamentals"
   - Take lessons and quizzes
   - View progress and certificates

2. **Instructor Flow:**
   - Login as: instructor@test.com
   - Create a new course
   - Add chapters and lessons
   - Create quizzes
   - View student progress

3. **Admin Flow:**
   - Login as: admin@test.com
   - Manage users
   - Approve courses
   - View system analytics

## 📊 Active Courses for Testing

1. **JavaScript Fundamentals** - Has enrollments and content
2. **Complete React Development Course** - Full course content
3. **UI/UX Design Principles** - Design course
4. **Test Course for Certificates** - For testing certificate generation
5. **JavaScript Quiz Testing** - Has quiz content for testing

## ⚠️ Important Notes

- All passwords are hashed with bcrypt in the database
- The actual passwords cannot be retrieved, only reset
- If none of these passwords work, you may need to:
  1. Create new test accounts via the signup page
  2. Reset passwords using the database
  3. Check the original seed scripts for passwords

## 🔧 Creating New Test Account

If you need to create a new test account with a known password:

```bash
# Run this script to create a new test user
npx tsx scripts/create-test-user.ts
```

Or use the signup page at `/auth/signup` to create a new account.

## 🎯 Recommended Testing Accounts

For comprehensive testing, use these account combinations:

1. **Basic Testing:**
   - Student: student@test.com
   - Instructor: instructor@test.com
   - Admin: admin@test.com

2. **Quiz Testing:**
   - Student: quiz.student@test.com (password: testpass123)
   - Instructor: quiz.instructor@test.com (password: testpass123)

These accounts have the most test data associated with them.