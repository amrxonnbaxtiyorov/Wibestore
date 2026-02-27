#!/bin/bash
# ============================================================
# WibeStore Backend - Docker Entrypoint
# ============================================================
# Migrations always run before start. If DATABASE_URL is wrong or
# DB is unreachable, container will exit here (set -e).
# ============================================================

set -e

# Railway injects PORT dynamically; default to 8000 for local dev
export PORT="${PORT:-8000}"

echo "==> WibeStore Entrypoint Started (PORT=$PORT)"

echo "==> Creating migrations if needed..."
python manage.py makemigrations --noinput 2>/dev/null || true

echo "==> Applying migrations (required; exit on failure)..."
if ! python manage.py migrate --noinput; then
    echo "FATAL: migrate failed. Check DATABASE_URL and DB connectivity."
    exit 1
fi

echo "==> Creating superuser..."
python create_superuser.py 2>/dev/null || true

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --no-color 2>/dev/null || true

# If command line args passed (e.g. docker-compose: runserver), use them; else gunicorn
if [ $# -gt 0 ]; then
    echo "==> Starting: $*"
    exec "$@"
else
    echo "==> Starting gunicorn on port $PORT..."
    exec gunicorn config.wsgi:application \
        --bind "0.0.0.0:$PORT" \
        --workers 2 \
        --worker-class gthread \
        --threads 4 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
fi

