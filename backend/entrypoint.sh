#!/bin/bash
set -e

echo "=== LMS Backend Startup ==="

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
