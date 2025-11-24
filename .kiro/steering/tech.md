# Tech Stack & Build System

## Framework & Language
- **Django 5.2.8**: Web framework for Python
- **Python 3.x**: Primary language
- **SQLite**: Default database (development)

## Key Libraries
- Django built-in modules:
  - `django.contrib.auth`: Authentication and authorization
  - `django.contrib.admin`: Admin interface
  - `django.template`: Template rendering
  - `django.forms`: Form handling
  - `django.db.models`: ORM

## Project Structure
- **Settings Module**: `lms_project.settings`
- **URL Router**: `lms_project.urls`
- **WSGI App**: `lms_project.wsgi`
- **Custom User Model**: `core.models.User` (extends AbstractUser)

## Common Commands

### Development
```bash
# Run development server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Access Django shell
python manage.py shell
```

### Database
```bash
# Reset database (development only)
python manage.py flush

# Show SQL for migrations
python manage.py sqlmigrate <app> <migration_number>
```

### Admin
```bash
# Access admin panel at /admin/
```

## Configuration Notes
- `DEBUG = True` (development mode)
- Custom `AUTH_USER_MODEL = 'core.User'`
- Login redirects to home (`/`)
- Templates located in `templates/` directory
- Static files served from `static/` directory
