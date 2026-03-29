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

# Railway: Postgres often exposes DATABASE_PUBLIC_URL; Django/env may expect DATABASE_URL
if [ -z "${DATABASE_URL}" ] && [ -n "${DATABASE_PUBLIC_URL}" ]; then
    export DATABASE_URL="${DATABASE_PUBLIC_URL}"
    echo "==> Using DATABASE_PUBLIC_URL as DATABASE_URL"
fi

# Production (Railway): DB bo'lmasa aniq xabar va to'xtatish (traceback o'rniga)
if [ -z "${DATABASE_URL}" ]; then
    echo "FATAL: DATABASE_URL yoki DATABASE_PUBLIC_URL kerak. Railway: Postgres qo'shing, keyin Backend servisida Variables → Add Reference → Postgres → DATABASE_PUBLIC_URL tanlang."
    exit 1
fi

echo "==> WibeStore Entrypoint Started (PORT=$PORT)"

echo "==> Fixing migration state if needed..."
python fix_migrations.py || true

echo "==> Applying migrations..."
if ! python manage.py migrate --noinput 2>&1; then
    echo "==> migrate failed, syncing migration state with --fake..."
    python manage.py migrate --fake --noinput 2>&1 || true
    echo "==> Re-applying migrations after fake..."
    if ! python manage.py migrate --noinput 2>&1; then
        echo "FATAL: migrate still failed after --fake. Check DATABASE_URL and DB state."
        exit 1
    fi
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

