# Project Structure

## Directory Layout

```
lms_project/
├── manage.py                 # Django management script
├── db.sqlite3               # Development database
├── lms_project/             # Main project configuration
│   ├── settings.py          # Django settings
│   ├── urls.py              # Root URL configuration
│   ├── wsgi.py              # WSGI application
│   └── asgi.py              # ASGI application
├── core/                    # Core app (authentication, home)
│   ├── models.py            # Custom User model
│   ├── views.py             # Core views
│   ├── urls.py              # Core URL patterns
│   ├── forms.py             # Core forms
│   ├── admin.py             # Admin configuration
│   ├── apps.py              # App configuration
│   ├── tests.py             # Tests
│   └── migrations/          # Database migrations
├── courses/                 # Courses app (main LMS functionality)
│   ├── models.py            # Course, Lesson, Enrollment, Progress models
│   ├── views.py             # Course views
│   ├── urls.py              # Course URL patterns
│   ├── forms.py             # Course forms
│   ├── admin.py             # Admin configuration
│   ├── apps.py              # App configuration
│   ├── tests.py             # Tests
│   └── migrations/          # Database migrations
└── templates/               # HTML templates
    ├── base.html            # Base template
    ├── core/                # Core app templates
    │   └── home.html
    ├── courses/             # Courses app templates
    │   ├── course_list.html
    │   ├── course_detail.html
    │   ├── course_form.html
    │   ├── course_lessons.html
    │   ├── lesson_detail.html
    │   ├── lesson_form.html
    │   ├── instructor_dashboard.html
    │   ├── student_dashboard.html
    │   └── monitor_progress.html
    └── registration/        # Auth templates
        ├── login.html
        └── register.html
```

## App Organization

### `core` App
Handles user authentication and home page. Contains the custom User model with instructor/student roles.

### `courses` App
Main LMS functionality including:
- Course creation and management
- Lesson management with video content
- Student enrollment
- Progress tracking

## Key Patterns

- **Models**: Located in `models.py` per app
- **Views**: Class-based and function-based views in `views.py`
- **URLs**: App-specific URL patterns in `urls.py`, included in root `lms_project/urls.py`
- **Forms**: Django forms in `forms.py` for user input
- **Templates**: Organized by app in `templates/<app_name>/`
- **Admin**: Registered models in `admin.py` for Django admin interface
- **Migrations**: Auto-generated in `migrations/` folder per app

## Database Models Hierarchy

```
User (core.models)
├── is_student
├── is_instructor
└── (extends AbstractUser)

Course (courses.models)
├── instructor (FK → User)
└── lessons (reverse relation)

Lesson (courses.models)
├── course (FK → Course)
└── progress (reverse relation)

Enrollment (courses.models)
├── student (FK → User)
└── course (FK → Course)

Progress (courses.models)
├── student (FK → User)
└── lesson (FK → Lesson)
```
