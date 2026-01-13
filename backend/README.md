# Backend - Django REST API

Django REST Framework backend for the Stupendous LMS.

## Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create test users:
```bash
python create_test_users.py
```

6. Seed sample courses:
```bash
python seed_sample_courses.py
```

7. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/`

## Project Structure

```
backend/
├── core/           # Custom User model, authentication, JWT
├── courses/        # Courses, lessons, chapters, enrollments, coupons
├── quizzes/        # Quiz system with multiple question types
├── certificates/   # Certificate generation
├── discussions/    # Course discussion forums
├── notifications/  # User notifications
├── activity/       # Activity tracking middleware
├── files/          # File upload handling
├── media_config/   # Media configuration
├── lms_project/    # Django project settings
└── templates/      # HTML templates (legacy, for admin)
```

## API Endpoints

- `POST /api/auth/login/` - Login with email/password
- `POST /api/auth/signup/` - Register new user
- `GET /api/auth/me/` - Get current user
- `GET /api/courses/` - List courses
- `GET /api/courses/{id}/` - Course detail
- `POST /api/enrollments/` - Enroll in course
- `GET /api/quizzes/` - List quizzes
- `POST /api/quizzes/{id}/submit/` - Submit quiz answers

## Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | admin123 | Admin |
| trainer@test.com | trainer123 | Instructor |
| student@test.com | student123 | Student |

## Environment Variables

```
DB_ENGINE=django.db.backends.postgresql
DB_HOST=localhost
DB_NAME=lms
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:8000
DEBUG=True
```

## Running Tests

```bash
pytest
```
