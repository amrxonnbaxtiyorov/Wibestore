#!/bin/bash
# ============================================================
# WibeStore Backend - Docker Entrypoint
# ============================================================

set -e

# Railway injects PORT dynamically; default to 8000 for local dev
export PORT="${PORT:-8000}"

echo "==> WibeStore Entrypoint Started (PORT=$PORT)"

echo "==> Applying migrations..."
python manage.py migrate --noinput

echo "==> Creating superuser..."
python create_superuser.py || true

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Starting server on port $PORT..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:$PORT" \
    --workers 2 \
    --worker-class gthread \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -

