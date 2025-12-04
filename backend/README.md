# Backend - Django REST API

This directory contains the Django REST Framework backend for the Stupendous LMS.

## Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

5. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/`

## Project Structure

- `core/` - Core app with custom User model and authentication
- `courses/` - Courses app with Course, Lesson, Enrollment, and Progress models
- `lms_project/` - Django project configuration
- `templates/` - HTML templates (will be replaced by API responses)
- `manage.py` - Django management script
- `db.sqlite3` - SQLite database (development)

## Current Status

This is the existing Django monolithic application. It will be converted to a REST API in subsequent tasks.
