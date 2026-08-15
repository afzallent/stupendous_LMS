#!/bin/bash
set -e

echo "=== LMS Application Startup ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! python -c "
import os
import psycopg2
try:
    conn = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', ''),
        dbname=os.environ.get('DB_NAME', 'lms')
    )
    conn.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    echo "PostgreSQL not ready, waiting..."
    sleep 2
done
echo "PostgreSQL is ready!"

cd /app

# Fail fast on missing critical configuration rather than booting a
# misconfigured (and potentially insecure) instance.
python manage.py check --deploy --fail-level WARNING

echo "Running migrations..."
python manage.py migrate --noinput

# Demo/seed data is NEVER created automatically.
#
# The previous version of this script seeded a superuser with a hardcoded
# password (admin@test.com / admin123) and a 100%-off PRERELEASE coupon on
# every boot, in every environment. Both are now opt-in and refuse to run
# unless DEBUG=True. See PRODUCTION_READINESS.md (P0-6, P0-7).
if [ "${SEED_DEMO_DATA}" = "true" ]; then
    echo "SEED_DEMO_DATA=true - seeding demo data (development only)..."
    python create_test_users.py
    python seed_sample_courses.py
fi

echo "Starting Gunicorn server..."
exec gunicorn lms_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-2}" \
    --threads "${GUNICORN_THREADS:-4}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
