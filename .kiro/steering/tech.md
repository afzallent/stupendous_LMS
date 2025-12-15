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

## Python Execution

### Virtual Environment
This project uses a virtual environment located at the workspace root: `venv/`

**IMPORTANT**: Always activate the virtual environment before running Python commands:
```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (CMD)
.\venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

After activation, you can use `python` directly. If not activated, use the full path:
```bash
# Windows
.\venv\Scripts\python.exe <command>

# Linux/Mac
./venv/bin/python <command>
```

### Running Tests

**IMPORTANT**: Tests use SQLite (in-memory) instead of PostgreSQL for speed and isolation.
The test configuration is in `backend/lms_project/test_settings.py` and is automatically used by pytest.

**pytest (for property-based tests and unit tests):**
```bash
# From backend directory, with venv activated
cd backend
pytest xapi/test_statement_validation.py -v

# Run specific test class
pytest xapi/test_statement_validation.py::TestXAPIStatementStorage -v

# Run with hypothesis settings
pytest xapi/test_statement_validation.py -v --hypothesis-show-statistics

# Run all tests
pytest -v
```

**Django test runner (uses SQLite by default for tests):**
```bash
# From backend directory, with venv activated
cd backend
python manage.py test xapi.test_statement_validation

# Run specific test class
python manage.py test xapi.test_statement_validation.TestXAPIStatementStorage

# Run with custom settings
python manage.py test --settings=lms_project.test_settings
```

**Test Database Configuration:**
- Tests use SQLite in-memory database (`:memory:`) for speed
- PostgreSQL is only used for development/production
- Test settings are in `backend/lms_project/test_settings.py`
- pytest.ini is configured to use test_settings automatically

**CRITICAL - After Testing with New Models:**
When you create or modify models and test them with SQLite, you MUST migrate those changes to PostgreSQL:

```bash
# 1. After testing passes, create migrations for the new/modified models
python manage.py makemigrations

# 2. Apply migrations to PostgreSQL (production database)
python manage.py migrate

# 3. Verify migrations were applied
python manage.py showmigrations
```

**Migration Workflow:**
1. Write code with new/modified models
2. Run tests with SQLite (fast iteration)
3. Once tests pass, create migrations: `python manage.py makemigrations`
4. Apply to PostgreSQL: `python manage.py migrate`
5. Commit both code and migration files to version control

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
