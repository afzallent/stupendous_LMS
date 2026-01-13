# Deployment Guide - Coolify

This project is deployed using **Coolify** with separate applications for frontend and backend from the same GitHub repository.

## Architecture

```
GitHub Repo: afzallent/stupendous_LMS
├── /backend          → Django API (Python)
├── /frontend         → Next.js App (Node.js)
├── /Dockerfile       → Backend Dockerfile
└── /frontend/Dockerfile → Frontend Dockerfile
```

## Coolify Setup

### Backend Application

| Setting | Value |
|---------|-------|
| **Name** | LMS Backend |
| **Build Pack** | Dockerfile |
| **Base Directory** | *(empty - uses root)* |
| **Dockerfile Location** | `Dockerfile` |
| **Watch Paths** | `backend/**,Dockerfile,entrypoint.sh` |
| **Port** | `8000` |

**Environment Variables:**
```
DB_ENGINE=django.db.backends.postgresql
DB_NAME=lms
DB_USER=postgres
DB_PASSWORD=<your-password>
DB_HOST=<postgres-host>
DB_PORT=5432
SECRET_KEY=<generate-secure-key>
ALLOWED_HOSTS=<your-backend-domain>
DEBUG=False
```

### Frontend Application

| Setting | Value |
|---------|-------|
| **Name** | LMS Frontend |
| **Build Pack** | Dockerfile |
| **Base Directory** | `frontend` |
| **Dockerfile Location** | `Dockerfile` |
| **Watch Paths** | `frontend/**` |
| **Port** | `3000` |

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://<your-backend-domain>
```

## How It Works

1. Both applications use the **same GitHub repository**
2. Coolify's **Base Directory** setting determines which part of the repo to build:
   - Backend: Base Directory = *(empty)* → Uses `/Dockerfile`
   - Frontend: Base Directory = `frontend` → Uses `/frontend/Dockerfile`
3. **Watch Paths** ensure only relevant changes trigger deployments:
   - Backend changes → Only backend redeploys
   - Frontend changes → Only frontend redeploys

## Dockerfiles

### Backend (`/Dockerfile`)
- Base image: `python:3.12-slim`
- Installs: libpq-dev, gcc, Python dependencies
- Runs: Gunicorn on port 8000
- Entry: `/app/entrypoint.sh` (runs migrations, seeds data, starts server)

### Frontend (`/frontend/Dockerfile`)
- Base image: `node:22-slim`
- Package manager: `pnpm`
- Builds: Next.js production build
- Runs: `npm run start` on port 3000

## Database

- **PostgreSQL** (configured via environment variables)
- Create a PostgreSQL database in Coolify first
- Use the internal hostname for `DB_HOST`

## Auto-Deploy

Enable "Auto Deploy on Push" in Coolify for both applications. With Watch Paths configured, only the affected service will redeploy on each commit.

## Common Issues

### Frontend Build Fails with "useSearchParams" Error
- Wrap components using `useSearchParams()` in a `<Suspense>` boundary
- Already fixed in `/frontend/src/app/checkout/coupon/page.tsx`

### Lock File Not Found
- Check `/frontend/.dockerignore` - ensure lock files are NOT ignored
- `pnpm-lock.yaml` must be included in the build context

### Build Timeout
- Increase build timeout in Coolify settings
- Default 30s may not be enough for large builds

## URLs

After deployment:
- **Backend API**: `https://<backend-domain>/api/`
- **Django Admin**: `https://<backend-domain>/admin/`
- **Frontend**: `https://<frontend-domain>/`

## Test Users (Seeded Automatically)

Check `backend/create_test_users.py` for seeded test accounts.

## Coupon Code

A `PRERELEASE` coupon (100% discount) is created automatically on startup.
