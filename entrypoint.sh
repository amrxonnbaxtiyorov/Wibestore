#!/bin/sh
set -e
# Railway va boshqa platformalar PORT beradi; agar yo'q bo'lsa 80 ishlatamiz
export PORT="${PORT:-80}"
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
