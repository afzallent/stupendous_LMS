# Testing Guide - stupendousLMS

## ✅ Migrations Applied Successfully

All Phase 2 migrations have been created and applied:
- ✅ `courses.0002` - Category, Course status fields
- ✅ `quizzes.0001` - Quiz system models
- ✅ `certificates.0001` - Certificate model

## Quick Start Testing

### 1. Start the Backend Server

```bash
cd backend
..\venv\Scripts\python.exe manage.py runserver
```

Server will run at: `http://localhost:8000`

### 2. Create a Superuser (if not already created)

```bash
..\venv\Scripts\python.exe manage.py createsuperuser
```

### 3. Access Admin Panel

Visit: `http://localhost:8000/admin/`

You should now see:
- Categories
- Courses (with status and category fields)
- Lessons
- Enrollments
- Progress
- Quizzes
- Questions
- Quiz Attempts
- Certificates
- Uploaded Files

### 4. API Documentation

Visit the interactive API docs:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`

## Manual Testing Checklist

### Phase 1 Features

#### ✅ Course Search & Filtering
```bash
# Test search
curl "http://localhost:8000/api/courses/?search=python"

# Test filtering by instructor
curl "http://localhost:8000/api/courses/?instructorId=1"

# Test ordering
curl "http://localhost:8000/api/courses/?ordering=-created_at"
```

#### ✅ Featured Courses
```bash
curl "http://localhost:8000/api/courses/featured/"
```

#### ✅ Enrollment Check
```bash
# Requires authentication token
curl "http://localhost:8000/api/enrollments/check/?courseId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### ✅ Student Dashboard
```bash
curl "http://localhost:8000/api/student/dashboard/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### ✅ Instructor Analytics
```bash
curl "http://localhost:8000/api/instructor/analytics/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN"
```

#### ✅ File Upload
```bash
curl -X POST "http://localhost:8000/api/files/upload/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "file_type=document"
```

### Phase 2 Features

#### ✅ Categories

**Create Category (Admin)**
```bash
curl -X POST "http://localhost:8000/api/categories/" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web Development",
    "slug": "web-development",
    "description": "Learn web development"
  }'
```

**List Categories**
```bash
curl "http://localhost:8000/api/categories/"
```

#### ✅ Course Publishing

**Publish Course**
```bash
curl -X POST "http://localhost:8000/api/courses/1/publish/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN"
```

**Unpublish Course**
```bash
curl -X POST "http://localhost:8000/api/courses/1/unpublish/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN"
```

#### ✅ Quiz System

**Create Quiz**
```bash
curl -X POST "http://localhost:8000/api/quizzes/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course": 1,
    "title": "Python Basics Quiz",
    "description": "Test your Python knowledge",
    "passing_score": 70,
    "time_limit": 30,
    "max_attempts": 3,
    "is_active": true
  }'
```

**Add Question to Quiz**
```bash
curl -X POST "http://localhost:8000/api/questions/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quiz": 1,
    "question_text": "What is Python?",
    "question_type": "multiple_choice",
    "points": 10,
    "order": 1
  }'
```

**Submit Quiz**
```bash
curl -X POST "http://localhost:8000/api/quizzes/1/submit/" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "question_id": 1,
        "selected_option_id": 3
      }
    ]
  }'
```

**Get Quiz Results (Instructor)**
```bash
curl "http://localhost:8000/api/quizzes/1/results/" \
  -H "Authorization: Bearer YOUR_INSTRUCTOR_TOKEN"
```

#### ✅ Certificates

**Generate Certificate**
```bash
curl -X POST "http://localhost:8000/api/certificates/" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 1
  }'
```

**Verify Certificate (Public)**
```bash
curl "http://localhost:8000/api/certificates/verify/?certificateId=YOUR_UUID"
```

**Auto-Generate Certificates**
```bash
curl -X POST "http://localhost:8000/api/certificates/auto-generate/" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

#### ✅ Password Change

```bash
curl -X PUT "http://localhost:8000/api/user/change-password/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "current_password",
    "new_password": "new_secure_password123"
  }'
```

## Testing with Admin Panel

### 1. Create Test Data

1. **Login to Admin**: `http://localhost:8000/admin/`

2. **Create Categories**:
   - Go to Categories
   - Add: "Web Development", "Data Science", "Mobile Development"

3. **Create Courses**:
   - Go to Courses
   - Create a course with category and status="published"
   - Add lessons to the course

4. **Create Quiz**:
   - Go to Quizzes
   - Create a quiz for your course
   - Add questions with options

5. **Enroll Students**:
   - Go to Enrollments
   - Enroll students in courses

6. **Mark Progress**:
   - Go to Progress
   - Mark some lessons as completed

### 2. Test Certificate Generation

1. Complete all lessons in a course
2. Use the API to generate certificate
3. Verify the certificate using the UUID

### 3. Test Quiz Flow

1. Create quiz with questions
2. Student takes quiz via API
3. Check results as instructor
4. Verify scoring is correct

## Automated Testing

### Backend Tests (if implemented)

```bash
cd backend
..\venv\Scripts\python.exe -m pytest
```

### Frontend Tests

```bash
cd frontend
npm run test:student
```

## Common Issues & Solutions

### Issue: Migration Error
**Solution**: Delete `db.sqlite3` and run migrations again (development only)

```bash
cd backend
del db.sqlite3
..\venv\Scripts\python.exe manage.py migrate
..\venv\Scripts\python.exe manage.py createsuperuser
```

### Issue: CORS Error
**Solution**: Check `CORS_ALLOWED_ORIGINS` in `settings.py`

### Issue: Authentication Error
**Solution**: Get a fresh token:

```bash
curl -X POST "http://localhost:8000/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### Issue: File Upload Error
**Solution**: Ensure `MEDIA_ROOT` directory exists and has write permissions

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test course list endpoint
ab -n 100 -c 10 http://localhost:8000/api/courses/

# Test with authentication
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/student/dashboard/
```

## Security Testing

### Check Authentication
- Try accessing protected endpoints without token
- Verify token expiration
- Test refresh token flow

### Check Permissions
- Student trying to create quiz (should fail)
- Student trying to view other student's certificates (should fail)
- Instructor trying to modify other instructor's course (should fail)

## Database Verification

### Check Tables Created

```bash
cd backend
..\venv\Scripts\python.exe manage.py dbshell
```

```sql
-- List all tables
.tables

-- Check courses table
SELECT * FROM courses_course LIMIT 5;

-- Check quizzes table
SELECT * FROM quizzes_quiz LIMIT 5;

-- Check certificates table
SELECT * FROM certificates_certificate LIMIT 5;

-- Check categories table
SELECT * FROM courses_category LIMIT 5;
```

## API Response Examples

### Successful Course Creation
```json
{
  "id": 1,
  "title": "Python for Beginners",
  "description": "Learn Python from scratch",
  "instructor": {
    "id": 1,
    "username": "instructor1",
    "email": "instructor@example.com"
  },
  "category": {
    "id": 1,
    "name": "Web Development",
    "slug": "web-development"
  },
  "status": "draft",
  "created_at": "2024-12-04T10:00:00Z",
  "lesson_count": 0,
  "enrolled_count": 0
}
```

### Successful Quiz Submission
```json
{
  "id": 1,
  "quiz": 1,
  "quiz_title": "Python Basics Quiz",
  "student": 2,
  "score": 80.00,
  "max_score": 100,
  "percentage": 80.00,
  "passed": true,
  "started_at": "2024-12-04T10:00:00Z",
  "completed_at": "2024-12-04T10:15:00Z",
  "time_taken": 900,
  "answers": [...]
}
```

### Successful Certificate Generation
```json
{
  "id": 1,
  "certificate_id": "550e8400-e29b-41d4-a716-446655440000",
  "student": 2,
  "course": 1,
  "issued_at": "2024-12-04T10:00:00Z",
  "completion_date": "2024-12-04",
  "student_name": "John Doe",
  "course_title": "Python for Beginners",
  "instructor_name": "Jane Smith",
  "is_valid": true,
  "verification_url": "/api/certificates/verify/?certificateId=550e8400-e29b-41d4-a716-446655440000"
}
```

## Next Steps

After testing Phase 1 & 2:

1. **Frontend Integration**: Connect Next.js frontend to these endpoints
2. **Phase 3 Development**: Implement activity tracking, revenue, and engagement analytics
3. **Production Deployment**: Deploy to production server
4. **Performance Optimization**: Add caching, optimize queries
5. **Security Hardening**: Add rate limiting, additional validation

---

**Testing Status**: Ready for manual and automated testing ✅  
**Migrations**: Applied successfully ✅  
**Documentation**: Complete ✅  
**Last Updated**: December 4, 2024
