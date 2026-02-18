#!/bin/bash
# ============================================================
# WibeStore Backend - Docker Entrypoint
# ============================================================

set -e

echo "==> Waiting for PostgreSQL..."
while ! pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-wibestore}" -q 2>/dev/null; do
    sleep 1
done
echo "==> PostgreSQL is ready."

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Starting server..."
exec "$@"
