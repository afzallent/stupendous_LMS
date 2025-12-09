# CORS Fix for Astro Frontend (Port 4322)

## Problem
```
Access to fetch at 'http://localhost:8000/api/auth/login/' from origin 'http://localhost:4322' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
The Astro frontend is running on port **4322**, but Django's CORS configuration only allowed port **4321**.

## Solution Applied

### 1. Updated Django Settings
**File**: `backend/lms_project/settings.py`

Added port 4322 to CORS_ALLOWED_ORIGINS:
```python
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:4321,http://localhost:4322,http://localhost:4000,http://localhost:3000,http://localhost:8000,http://127.0.0.1:4321,http://127.0.0.1:4322,http://127.0.0.1:4000,http://127.0.0.1:3000,http://127.0.0.1:8000',
    cast=Csv()
)
```

### 2. Updated Environment Variables
**File**: `backend/.env`

Updated CORS_ALLOWED_ORIGINS to include all frontend ports:
```env
CORS_ALLOWED_ORIGINS=http://localhost:4321,http://localhost:4322,http://localhost:4000,http://localhost:3000,http://localhost:8000,http://127.0.0.1:4321,http://127.0.0.1:4322,http://127.0.0.1:4000,http://127.0.0.1:3000,http://127.0.0.1:8000
```

## Ports Explained

| Port | Frontend | Purpose |
|------|----------|---------|
| 3000 | Next.js | Main Next.js frontend |
| 4000 | - | Reserved/alternate port |
| 4321 | Astro | Default Astro dev server port |
| 4322 | Astro | Alternate Astro port (when 4321 is busy) |
| 8000 | Django | Backend API server |

## How to Apply the Fix

### Option 1: Restart Django Server (Recommended)
```bash
# Stop Django if running (Ctrl+C)
# Then restart:
cd backend
python manage.py runserver
```

### Option 2: If Using PowerShell Scripts
```powershell
# Stop all servers
.\stop-dev.ps1

# Start all servers
.\start-dev.ps1
```

## Verification

After restarting Django, test the login:

1. Open Astro frontend: `http://localhost:4322/login/trainer`
2. Try to login
3. Check browser console - CORS error should be gone
4. Check Django terminal - should see successful API requests

## Additional CORS Configuration

Django is already configured with:

```python
CORS_ALLOW_CREDENTIALS = True  # Allow cookies/auth headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',      # For JWT tokens
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

## Troubleshooting

### If CORS error persists:

1. **Check Django is running**:
   ```bash
   # Should see: Starting development server at http://127.0.0.1:8000/
   ```

2. **Verify .env file is loaded**:
   ```bash
   cd backend
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.CORS_ALLOWED_ORIGINS)
   # Should include 'http://localhost:4322'
   ```

3. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window

4. **Check Astro port**:
   ```bash
   # In frontend-astro terminal, look for:
   # Local: http://localhost:4322/
   ```

5. **Verify Django CORS middleware is active**:
   ```python
   # In settings.py, MIDDLEWARE should have:
   "corsheaders.middleware.CorsMiddleware",  # Should be near the top
   ```

### Common Issues

**Issue**: Still getting CORS error after restart
**Solution**: Make sure you restarted Django, not just Astro

**Issue**: Different port number
**Solution**: Add your specific port to both settings.py and .env

**Issue**: CORS works for some endpoints but not others
**Solution**: Check if the endpoint exists and returns proper response

## For Production

In production, update CORS_ALLOWED_ORIGINS to only include your actual domains:

```env
# Production .env
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Never use `CORS_ALLOW_ALL_ORIGINS = True` in production!

## Related Files

- `backend/lms_project/settings.py` - Django CORS configuration
- `backend/.env` - Environment variables
- `backend/requirements.txt` - Includes `django-cors-headers`

## Summary

✅ Added port 4322 to CORS allowed origins  
✅ Updated both settings.py default and .env file  
✅ Supports all frontend ports (3000, 4321, 4322)  
✅ Restart Django server to apply changes  

The CORS error should now be resolved!
