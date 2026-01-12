#!/bin/bash
set -e

echo "=== LMS Application Startup ==="

# Create log directories
mkdir -p /var/log/supervisor /var/log/nginx

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
except:
    exit(1)
" 2>/dev/null; do
    echo "PostgreSQL not ready, waiting..."
    sleep 2
done
echo "PostgreSQL is ready!"

# Run Django migrations
cd /app/backend
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

echo "Starting services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
