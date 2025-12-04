# Quick Start Guide - stupendousLMS

## Project Overview

stupendousLMS is a modern Learning Management System with:
- **Backend**: Django 5.2.8 + Django REST Framework (Python)
- **Frontend**: Next.js 15 + React 19 + TypeScript (Node.js)
- **Database**: SQLite (development), PostgreSQL (production)

---

## Prerequisites

- Python 3.x with pip
- Node.js 22.12.0+ with npm
- Git

---

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start frontend development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

## Environment Configuration

### Backend (.env or settings.py)

Key settings in `backend/lms_project/settings.py`:
- `DEBUG = True` (development)
- `ALLOWED_HOSTS = ['localhost', '127.0.0.1']`
- `CORS_ALLOWED_ORIGINS` includes frontend URL

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

---

## Testing the Integration

### 1. Register a New User
- Go to `http://localhost:3000/auth/signup`
- Fill in the registration form
- Submit

### 2. Login
- Go to `http://localhost:3000/auth/login`
- Use your registered credentials
- You should be redirected to the dashboard

### 3. Browse Courses
- Go to `http://localhost:3000/courses`
- Courses should load from the backend

### 4. Admin Panel
- Go to `http://localhost:8000/admin`
- Login with superuser credentials
- Manage courses, users, and other data

---

## Project Structure

```
stupendousLMS/
├── backend/                    # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── lms_project/           # Main project config
│   ├── core/                  # Authentication app
│   ├── courses/               # Courses app
│   └── db.sqlite3
│
├── frontend/                   # Next.js SPA
│   ├── package.json
│   ├── src/
│   │   ├── app/              # Pages and routes
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and API client
│   │   └── styles/
│   └── public/
│
├── docs/                       # Documentation
├── FRONTEND_BACKEND_INTEGRATION.md
├── QUICK_START_GUIDE.md
└── README.md
```

---

## Common Commands

### Backend

```bash
# Run development server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Access Django shell
python manage.py shell

# Run tests
python manage.py test

# Create superuser
python manage.py createsuperuser
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user
- `GET /api/auth/user/` - Get current user
- `PUT /api/auth/user/` - Update user profile

### Courses
- `GET /api/courses/` - List all courses
- `POST /api/courses/` - Create course (instructor only)
- `GET /api/courses/{id}/` - Get course detail
- `PUT /api/courses/{id}/` - Update course
- `DELETE /api/courses/{id}/` - Delete course

### Enrollments
- `GET /api/enrollments/` - Get user's enrollments
- `POST /api/enrollments/` - Enroll in course

### Progress
- `GET /api/progress/` - Get user's progress
- `POST /api/progress/` - Update progress

---

## Troubleshooting

### CORS Errors
**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Ensure `CORS_ALLOWED_ORIGINS` in `backend/lms_project/settings.py` includes your frontend URL.

### 401 Unauthorized
**Problem**: API returns 401 even with valid token

**Solution**: Check that token is being sent in Authorization header. Verify in browser DevTools Network tab.

### Database Errors
**Problem**: `django.db.utils.OperationalError`

**Solution**: Run migrations:
```bash
python manage.py migrate
```

### Port Already in Use
**Problem**: `Address already in use`

**Solution**: 
- Backend: `python manage.py runserver 8001`
- Frontend: `npm run dev -- --port 3001`

---

## Next Steps

1. **Explore the codebase**: Check out the existing models, views, and components
2. **Read the documentation**: See `FRONTEND_BACKEND_INTEGRATION.md` for detailed integration info
3. **Run tests**: Execute test suites to ensure everything works
4. **Start developing**: Begin adding features or customizing the LMS

---

## Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

## Support

For issues or questions:
1. Check the documentation files
2. Review the integration guide
3. Check the backend/frontend logs
4. Consult the respective framework documentation

---

## Production Deployment

Before deploying to production:

1. Set `DEBUG = False` in Django settings
2. Configure proper database (PostgreSQL recommended)
3. Set up environment variables for secrets
4. Configure HTTPS/SSL
5. Set up proper CORS origins
6. Run security checks: `python manage.py check --deploy`
7. Build frontend: `npm run build`
8. Use production server (Gunicorn for Django, Vercel/Railway for Next.js)

See `FRONTEND_BACKEND_INTEGRATION.md` for production configuration details.

