# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a monorepo containing a Django REST API backend and Next.js 16 frontend for a Learning Management System (LMS).

**Directory Structure:**
- `backend/` - Django REST API (Python 3.12)
- `frontend/` - Next.js 16 app (TypeScript, React 19, App Router)

## Backend (Django REST API)

### Core Django Apps
- `core/` - User model (custom), authentication, JWT tokens
- `courses/` - Courses, chapters, lessons, enrollments, categories
- `quizzes/` - Quiz system (multiple choice, true/false, fill-in-blank)
- `certificates/` - Certificate generation
- `activity/` - Activity tracking middleware and models
- `discussions/` - Course discussion forums
- `notifications/` - Real-time notifications
- `files/` - File uploads
- `media_config/` - Media file configuration

### Key Configuration
- Custom user model: `core.User` (extends AbstractUser with role field)
- Authentication: JWT (django-rest-framework-simplejwt)
- API documentation: drf-spectacular (OpenAPI 3.0)
- Static files: Whitenoise
- Database: PostgreSQL (production), SQLite (development)
- All API endpoints prefixed with `/api/`

### Development Commands
```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate

# Create test users (admin, instructor, student)
python create_test_users.py

# Run server
python manage.py runserver

# Run tests
pytest

# Run specific test file
pytest path/to/test_file.py

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### URL Routing
- Main URL config: `backend/lms_project/urls.py`
- API URLs are namespaced by app in each app's `api_urls.py`
- Legacy template views in `urls.py` (backward compatibility)

### Authentication Pattern
- JWT-based authentication with access tokens (15min) and refresh tokens (7 days)
- Frontend stores token in localStorage and sends via `Authorization: Bearer <token>` header
- All API endpoints require authentication by default (except auth endpoints)

### Testing
- Configuration: `backend/pytest.ini`
- Test files: `test_*.py` or `*_tests.py`
- Uses pytest-django for Django integration
- Test files exist in app directories (e.g., `backend/core/test_student_management.py`)

## Frontend (Next.js 16)

### Architecture
- Framework: Next.js 16 (App Router), React 19
- Language: TypeScript
- UI: Tailwind CSS + shadcn/ui components
- Package Manager: pnpm
- State Management: Zustand, React Context
- Data Fetching: TanStack Query (React Query)

### Key Directories
- `src/app/` - Next.js pages (App Router)
- `src/components/` - React components
- `src/lib/` - Utilities, API client, auth utilities
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React contexts (cart, auth)

### API Client
- Custom API client: `src/lib/django-api-client.ts`
- Base URL from `NEXT_PUBLIC_API_URL` env var
- Automatically adds JWT token from localStorage to requests
- Handles query parameter serialization

### Authentication Flow
- Auth context: `src/lib/auth.tsx`
- Token stored in localStorage
- Middleware: `src/middleware.ts` - defines public routes
- Protected routes redirect to `/auth/login` if not authenticated

### Development Commands
```bash
cd frontend

# Setup
pnpm install
cp .env.example .env.local  # Set NEXT_PUBLIC_API_URL

# Run dev server (port 4000)
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Lint
pnpm lint

# E2E Tests (Playwright via Puppeteer)
pnpm test:e2e
pnpm test:smoke
pnpm test:regression
pnpm test:headed  # with browser UI

# Unit Tests (Jest)
pnpm test:auth
pnpm test:security
pnpm test:forms
pnpm test:student

# Storybook
pnpm storybook
```

### Server Setup
- Standard `next start` (the custom `server.ts` + Socket.IO server was removed)
- Runs on Node.js >= 22.12.0

## Environment Variables

### Backend (.env)
```
DB_ENGINE=django.db.backends.postgresql  # or sqlite3
DB_HOST=localhost
DB_NAME=lms
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:4000,http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:8000
DEBUG=True
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Test Users

Demo accounts are seeded ONLY in local development, and only when explicitly
requested. They are never created in a deployed environment: the seed scripts
exit if `DEBUG=False`, and the entrypoint runs them only when
`SEED_DEMO_DATA=true`.

```bash
cd backend
DEBUG=True python create_test_users.py
```

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | admin123 | Admin |
| trainer@test.com | trainer123 | Instructor |
| student@test.com | student123 | Student |

For production, create an administrator with `python manage.py createsuperuser`.

## Development Workflow Notes

### Backend
- Each Django app has its own models, serializers, views, URLs
- API URLs follow pattern: `/api/<app>/<resource>/`
- ViewSets used for CRUD operations
- Custom permissions in each app's `permissions.py`

### Frontend
- Uses App Router (not Pages Router)
- Server components by default, client components marked with `"use client"`
- shadcn/ui components in `src/components/ui/`
- API calls through TanStack Query for caching and state management

### Common Tasks
- Add new API endpoint: Create in appropriate Django app's `api_urls.py`, `views.py`, `serializers.py`
- Add new frontend page: Create under `src/app/` with `page.tsx`
- Add new UI component: Use shadcn/ui CLI or create in `src/components/`
- Database changes: Create migrations in backend, apply with `python manage.py migrate`

## Security invariants

These were each a live vulnerability at some point. Do not regress them.
Full history and rationale: [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md).

**Paid content must stay gated.**
- `LessonSerializer` exposes `video_url`, `video_file` and `content`. Only use
  it where enrollment or course ownership has been verified. Anything publicly
  reachable uses `LessonPreviewSerializer`.
- Querysets for lessons, quizzes and questions are filtered to courses the user
  is enrolled in or owns. Do not widen them to `.objects.all()`.

**Enrollment is not client-initiated for paid courses.**
- `POST /api/enrollments/` accepts free, published courses only; it returns 402
  otherwise. A coupon grants access only when the final price is zero.
- When adding a payment gateway, enrollment must be created by the webhook
  handler, never by a request the client can forge.

**Role checks are per-object, not per-flag.**
- `user.is_instructor` means "is an instructor somewhere", not "owns this".
  Always compare against `course.instructor`. The global flag alone previously
  exposed every quiz answer key and every student's certificates.
- Registration always creates a student. Role elevation is admin-only.

**Configuration fails closed.**
- `DEBUG` defaults to `False`; `SECRET_KEY` has no fallback outside DEBUG. It
  signs JWTs, so a known key is a full authentication bypass.
- The entrypoint runs `check --deploy --fail-level WARNING`. If you add a
  setting that trips it, fix the setting rather than lowering the gate.
- Seed scripts refuse to run unless `DEBUG=True`. Never wire them into a
  deployed entrypoint.

**Uploads are validated by content, not by the client's Content-Type header.**
- Use the helpers in `core/upload_validation.py`. Filenames are server-generated.

**Always generate migrations.** Two model fields once shipped without them, so
the columns did not exist in any deployed database. CI runs
`makemigrations --check`.
