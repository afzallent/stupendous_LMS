# Backend image, built from the `backend/` directory as context.
#
# The production Coolify deployment builds /Dockerfile at the repo root
# (see DEPLOYMENT.md). This file is the equivalent for building from inside
# backend/ — keep the two in sync.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Python dependencies.
# gunicorn and psycopg2-binary are pinned in requirements.txt rather than
# installed unpinned here, so builds are reproducible.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files.
# This must NOT be suppressed with "|| true": CompressedManifestStaticFilesStorage
# raises at request time for any file missing from the manifest, so a silent
# failure here becomes a 500 in production instead of a failed build.
# A dummy SECRET_KEY is supplied because settings.py refuses to import without
# one; it is never used at runtime.
RUN SECRET_KEY=build-time-only-not-used DEBUG=False ALLOWED_HOSTS=build.invalid \
    python manage.py collectstatic --noinput --clear

# Run as a non-root user
RUN chmod +x /app/entrypoint.sh \
    && useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
