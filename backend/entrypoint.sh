#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding test users..."
python create_test_users.py || echo "Users may already exist"

echo "Seeding sample courses..."
python seed_sample_courses.py || echo "Courses may already exist"

echo "Creating PRERELEASE coupon..."
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
import django
django.setup()
from courses.models import Coupon
Coupon.objects.get_or_create(
    code='PRERELEASE',
    defaults={
        'description': 'Pre-release 100% discount coupon',
        'discount_percentage': 100,
        'is_active': True
    }
)
print('Coupon ready')
" || echo "Coupon may already exist"

echo "Starting Gunicorn server..."
exec gunicorn lms_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
