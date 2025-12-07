# Quick Start Guide - Astro Frontend with Django Backend

## Prerequisites
- Python 3.x installed
- Node.js and npm installed
- Django backend configured and running

## Setup Steps

### 1. Install Dependencies
```bash
cd frontend-astro
npm install
```

### 2. Configure Environment
Create `.env` file (or use existing):
```bash
PUBLIC_API_URL=http://localhost:8000/api
PUBLIC_FRONTEND_URL=http://localhost:4321
```

### 3. Start Django Backend
```bash
cd backend
python manage.py runserver
# Django runs on http://localhost:8000
```

### 4. Start Astro Frontend
```bash
cd frontend-astro
npm run dev
# Astro runs on http://localhost:4321
```

## Quick Test

### Test 1: View Courses
1. Open http://localhost:4321/courses
2. Should see courses from Django database
3. Check browser console for any errors

### Test 2: Login
1. Open http://localhost:4321/login/student
2. Login with Django credentials
3. Should redirect to http://localhost:4321/dashboard/student

### Test 3: API Connection
```bash
# Test Django API directly
curl http://localhost:8000/api/courses/
```

## Common Commands

### Django Backend
```bash
# Create superuser
python manage.py createsuperuser

# Run migrations
python manage.py migrate

# Create test data
python manage.py shell
>>> from core.models import User
>>> User.objects.create_user(username='student1', password='pass123', is_student=True)
```

### Astro Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## File Structure

```
frontend-astro/
├── src/
│   ├── config/
│   │   └── django-api.config.ts      # Main API configuration
│   ├── utils/
│   │   ├── django-api-client.js      # Client-side utilities
│   │   └── django-api-server.ts      # Server-side utilities
│   ├── pages/
│   │   ├── login/
│   │   │   ├── student.astro         # Student login
│   │   │   └── trainer.astro         # Instructor login
│   │   ├── dashboard/
│   │   │   └── student/
│   │   │       └── index.astro       # Student dashboard
│   │   └── courses.astro             # Course listing
│   └── middleware.ts                 # JWT authentication middleware
├── .env                              # Environment variables
└── package.json                      # Dependencies
```

## API Usage Examples

### Login
```typescript
import { djangoApi, API_ENDPOINTS, TokenManager } from '../config/django-api.config';

const response = await djangoApi.post(API_ENDPOINTS.auth.login, {
  username: 'student1',
  password: 'pass123'
});

if (response.success) {
  TokenManager.setTokens(response.access, response.refresh);
  TokenManager.setUser(response.user);
}
```

### Fetch Courses
```typescript
import { djangoApi, API_ENDPOINTS } from '../config/django-api.config';

const response = await djangoApi.get(API_ENDPOINTS.courses.list);
if (response.success) {
  const courses = response.results || response.data;
}
```

### Check Authentication
```typescript
import { TokenManager } from '../config/django-api.config';

const user = TokenManager.getUser();
if (user) {
  console.log(`Logged in as: ${user.username}`);
  console.log(`Role: ${user.is_student ? 'Student' : 'Instructor'}`);
}
```

## Troubleshooting

### CORS Error
**Problem**: "Access to fetch at 'http://localhost:8000/api/...' has been blocked by CORS policy"

**Solution**:
1. Check `backend/.env` has: `CORS_ALLOWED_ORIGINS=http://localhost:4321,...`
2. Restart Django server
3. Clear browser cache

### Authentication Error
**Problem**: "Authentication credentials were not provided"

**Solution**:
1. Check tokens in browser DevTools → Application → Local Storage
2. Try logging in again
3. Check token hasn't expired (15 min for access token)

### Connection Error
**Problem**: "Failed to fetch" or "Network error"

**Solution**:
1. Verify Django is running: `curl http://localhost:8000/api/courses/`
2. Check `.env` has correct `PUBLIC_API_URL`
3. Check firewall/antivirus isn't blocking connections

### Module Not Found
**Problem**: "Cannot find module '@/config/django-api.config'"

**Solution**:
```bash
npm install
npm run dev
```

## Next Steps

1. **Create Test Users**: Use Django admin or management commands
2. **Explore API**: Check `API_DOCUMENTATION.md` for all endpoints
3. **Update Pages**: Migrate remaining pages to use Django API
4. **Remove Clerk**: Run `npm uninstall @clerk/astro @clerk/clerk-react`

## Resources

- **Detailed Guide**: [DJANGO_MIGRATION_GUIDE.md](./DJANGO_MIGRATION_GUIDE.md)
- **Summary**: [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
- **API Docs**: [../API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **Django Docs**: https://docs.djangoproject.com/
- **Astro Docs**: https://docs.astro.build/

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Django logs: `backend/logs/lms.log`
3. Check browser console for JavaScript errors
4. Review API responses in Network tab
