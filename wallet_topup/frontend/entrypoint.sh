#!/bin/sh
set -e

# Railway and other platforms inject PORT at runtime; default to 80.
export PORT="${PORT:-80}"

# Substitute $PORT into the main nginx config template.
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# If BACKEND_URL is provided, generate an API proxy block.
# Otherwise write an empty file so the nginx include directive succeeds.
if [ -n "${BACKEND_URL}" ]; then
    envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.proxy.template > /etc/nginx/conf.d/proxy.conf
else
    echo "" > /etc/nginx/conf.d/proxy.conf
fi

exec nginx -g 'daemon off;'
