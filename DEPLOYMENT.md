# Deployment Guide — Coolify

> **Branding:** The site name, tagline and logo are white-label configurable in Django admin → Site Settings (served to the frontend at `/api/settings/branding/`).


This project deploys as **two separate Coolify applications** from one GitHub repository: a Django API and a Next.js frontend.

```
GitHub Repo: afzallent/stupendous_LMS
├── /backend              → Django API (Python 3.12)
├── /frontend             → Next.js App (Node 22)
├── /Dockerfile           → Backend image
└── /frontend/Dockerfile  → Frontend image
```

> The repo previously carried `nginx.conf`, `supervisord.conf` and `nixpacks.toml`, describing a single-container topology that nothing used. They have been removed — Coolify runs the two images separately behind its own proxy. See "Upload size limits" below for the one setting that lived in `nginx.conf` and now needs configuring at the proxy.

---

## Before you deploy — required

These are not optional. The backend refuses to start without them.

### 1. Generate a real `SECRET_KEY`

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

This key also signs JWTs, so anyone who knows it can mint a token for any user, including a superuser. It must be at least 50 characters and must not begin with `django-insecure-` — the startup check rejects weak keys.

**If you have deployed this application before, rotate the key now.** The previous version shipped a hardcoded fallback key in source, so any token issued under it must be treated as compromised. Rotating invalidates all existing sessions, which is the intended outcome.

### 2. Configure object storage for media

Container filesystems are ephemeral. With `USE_S3_MEDIA=False`, every uploaded avatar, thumbnail and lesson video is destroyed on each redeploy and is not served at all when `DEBUG=False`. Set `USE_S3_MEDIA=True` and provide the `AWS_*` variables. Any S3-compatible provider works (AWS S3, Cloudflare R2, Backblaze B2, MinIO) via `AWS_S3_ENDPOINT_URL`.

### 3. Purge previously seeded demo data (existing deployments only)

**Nothing is seeded automatically any more.** Demo data is created only when `SEED_DEMO_DATA=true`, and the seed scripts additionally refuse to run unless `DEBUG=True` — so a production deployment cannot create them regardless of that flag.

However, **removing the seeding code does not remove what it already created.** Earlier versions of the entrypoint inserted the following into every environment on every boot. If this app has been deployed before, delete them from the production database now:

| What | Why it matters |
|---|---|
| User `admin@test.com` / `admin123` | Superuser with a password published in this repository |
| User `trainer@test.com` / `trainer123` | Can create and publish courses |
| User `student@test.com` / `student123` | — |
| Coupon `PRERELEASE` | 100% discount, no expiry, no usage cap — free access to every paid course |
| Demo courses from `seed_sample_courses.py` | Clutters a real catalogue |

```bash
# Against the production container
python manage.py shell -c "
from core.models import User
from courses.models import Coupon
User.objects.filter(email__in=['admin@test.com','trainer@test.com','student@test.com']).delete()
Coupon.objects.filter(code='PRERELEASE').delete()
"
```

Do this **after** creating your own superuser (see below), or you will lock yourself out of the admin.

---

## Backend application

| Setting | Value |
|---|---|
| **Name** | LMS Backend |
| **Build Pack** | Dockerfile |
| **Base Directory** | *(empty — repo root)* |
| **Dockerfile Location** | `Dockerfile` |
| **Watch Paths** | `backend/**,Dockerfile` |
| **Port** | `8000` |
| **Health check** | `GET /api/health/` |

### Environment variables

```bash
# Core — required
SECRET_KEY=<50+ char random string, see above>
DEBUG=False
ALLOWED_HOSTS=lms.5stars.dev

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=<password>
DB_HOST=<coolify-postgres-internal-hostname>
DB_PORT=5432
DB_SSL_MODE=require

# CORS / CSRF
CORS_ALLOWED_ORIGINS=https://learn.5stars.dev
CSRF_TRUSTED_ORIGINS=https://lms.5stars.dev,https://learn.5stars.dev

# Media — required, see above
USE_S3_MEDIA=True
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_STORAGE_BUCKET_NAME=<bucket>
AWS_S3_REGION_NAME=<region>
AWS_S3_ENDPOINT_URL=          # only for non-AWS S3-compatible providers
AWS_S3_CUSTOM_DOMAIN=         # public CDN/bucket domain

# Cache — strongly recommended
# Rate-limit counters live here. Without Redis each gunicorn worker keeps its
# own counters and the effective limit is multiplied by the worker count.
REDIS_URL=redis://<coolify-redis-hostname>:6379/0
```

The full annotated list, including throttle rates and gunicorn tuning, is in [`.env.example`](.env.example).

### What happens on boot

`backend/entrypoint.sh` runs `manage.py check --deploy --fail-level WARNING`, applies migrations, then starts gunicorn. A misconfigured instance fails loudly at startup rather than serving traffic in a degraded state.

This gate is deliberately strict: a weak `SECRET_KEY`, a missing security header, or a disabled secure-cookie setting will stop the container from starting. OpenAPI schema-generation notices are silenced in `settings.py` so only genuine security findings can trip it.

---

## Frontend application

| Setting | Value |
|---|---|
| **Name** | LMS Frontend |
| **Build Pack** | Dockerfile |
| **Base Directory** | `frontend` |
| **Dockerfile Location** | `Dockerfile` |
| **Watch Paths** | `frontend/**` |
| **Port** | `3000` |

### `NEXT_PUBLIC_API_URL` must be a BUILD variable

```
NEXT_PUBLIC_API_URL=https://lms.5stars.dev
```

`NEXT_PUBLIC_*` values are compiled into the browser bundle at **build time**, not read at runtime. If you set this only as a runtime environment variable, the shipped JavaScript will point at `http://localhost:8000` and every client-side API call from the deployed site will fail.

In Coolify, tick **"Build Variable"** for this entry. The Dockerfile declares it as an `ARG` and **fails the build** when it is missing, so a misconfiguration surfaces as a failed build rather than a broken site.

---

## Background worker (optional)

Email is dispatched through Celery. **You do not have to run a worker** — with `CELERY_BROKER_URL` unset, tasks execute inline and behave exactly as they did before Celery existed. Nothing is silently queued and dropped.

To move email off the request path (recommended once you have real traffic — there are only `workers × threads` request slots, and a stalled SMTP host consumes one for the full `EMAIL_TIMEOUT`), add a second Coolify application from the same image:

| Setting | Value |
|---|---|
| **Name** | LMS Worker |
| **Build Pack** | Dockerfile (same as backend) |
| **Start command** | `celery -A lms_project worker --loglevel=info` |
| **Environment** | Same as the backend, plus `CELERY_BROKER_URL` |

```bash
CELERY_BROKER_URL=redis://<coolify-redis-hostname>:6379/1
```

Use a different Redis database number from `REDIS_URL` so cache eviction cannot discard queued tasks.

## Encryption key for stored credentials

SMTP and S3 credentials entered in the Django admin are encrypted at rest. Set `FIELD_ENCRYPTION_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

If you leave it blank the key is derived from `SECRET_KEY`, which couples the two: **rotating `SECRET_KEY` would then make every stored credential undecryptable.** Set it explicitly, and back it up alongside your database — a database restored without this key cannot read its own credentials.

## Upload size limits

The API accepts videos up to 500 MB. That limit is enforced **after** the request body has been received, so it rejects an oversized file but does not stop the transfer — a hard cap has to live in the reverse proxy.

- **Coolify (Traefik)** does not limit request body size by default, so 500 MB uploads work out of the box. To impose a ceiling, add a Traefik `buffering` middleware with `maxRequestBodyBytes` on the backend service.
- **If you put nginx in front**, its default `client_max_body_size` is **1 MB** and every video upload will fail with a 413. Set `client_max_body_size 512M;` and raise `proxy_read_timeout` / `proxy_send_timeout` to around `300s`.

Django-side limits (`DATA_UPLOAD_MAX_MEMORY_SIZE`, `FILE_UPLOAD_MAX_MEMORY_SIZE`) are set in `settings.py` and control memory buffering, not the maximum file size.

## Serving user uploads

With `USE_S3_MEDIA=True`, uploads are served from your bucket or CDN domain, not from the application. Keep it that way: user-supplied files served from the app's own origin are a stored-XSS vector, and JWTs live in `localStorage`. If you ever front media with your own nginx, send `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment` on `/media/`.

## Database

PostgreSQL, created as a Coolify resource. Use the internal hostname for `DB_HOST`. `DB_SSL_MODE` defaults to `require` when `DEBUG=False`.

## Auto-deploy

Enable "Auto Deploy on Push" for both applications. With Watch Paths configured, only the affected service redeploys.

---

## URLs

- **Backend API**: `https://lms.5stars.dev/api/`
- **Django Admin**: `https://lms.5stars.dev/admin/`
- **Frontend**: `https://learn.5stars.dev/`

---

## Common issues

### Backend exits immediately on startup
Read the container logs. `ImproperlyConfigured` means a required variable is missing — most often `SECRET_KEY` or `ALLOWED_HOSTS` (which must list your real hostname, not just localhost). A failed `check --deploy` means a security setting regressed.

### Uploaded images and videos return 404
`USE_S3_MEDIA` is not set to `True`, or the `AWS_*` variables are incomplete. Media is never served from the application container.

### Frontend loads but every API call fails
`NEXT_PUBLIC_API_URL` was set as a runtime variable instead of a build variable. Re-deploy with it marked as a Build Variable.

### Users are logged out every 15 minutes
Should no longer happen — the API client refreshes access tokens automatically. If it recurs, check that `/api/auth/token/refresh/` is reachable and that CORS allows the frontend origin.

### Build timeout
Increase the build timeout in Coolify settings.

---

## First admin user

There is no seeded administrator. Create one against the running container:

```bash
python manage.py createsuperuser
```

Then set the site name, logo and SMTP credentials in Django admin under **Site Settings**.
