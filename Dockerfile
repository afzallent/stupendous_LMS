# Backend-only Dockerfile for Django LMS
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn psycopg2-binary

# Copy backend application code
COPY backend/ .

# Collect static files
RUN python manage.py collectstatic --noinput --clear || true

# Expose port
EXPOSE 8000

# Run startup script
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
