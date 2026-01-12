# Multi-stage build for Django backend + Next.js frontend

# Stage 1: Build Next.js frontend
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Final image with Python + Node
FROM python:3.12-slim

# Install Node.js, nginx, and system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    supervisor \
    libpq-dev \
    gcc \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn psycopg2-binary

# Copy backend code
COPY backend/ ./backend/

# Collect Django static files
WORKDIR /app/backend
RUN python manage.py collectstatic --noinput --clear || true

# Copy built frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package.json ./
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY frontend/server.ts frontend/tsconfig.json ./

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy startup script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
