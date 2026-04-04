#!/bin/sh
set -e

# Railway PORT env var orqali dinamik port beradi; lokaldа default 80
export PORT="${PORT:-80}"

echo "==> WibeStore Frontend starting on PORT=$PORT"

# BACKEND_URL berilganda /api/* so'rovlarni backend ga proxy qilamiz
if [ -n "$BACKEND_URL" ]; then
  export BACKEND_URL="${BACKEND_URL%/}"
  echo "==> Backend proxy enabled: $BACKEND_URL"
  envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.proxy.template > /etc/nginx/conf.d/default.conf
else
  envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Nginx konfiguratsiyasini tekshirish
echo "==> Testing nginx config..."
nginx -t

echo "==> Starting nginx..."
exec nginx -g "daemon off;"
