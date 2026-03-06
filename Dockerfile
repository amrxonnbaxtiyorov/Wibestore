# ============================================================
# WibeStore Frontend - Multi-stage Dockerfile (Railway / Linux)
# ============================================================
# Builder: node:20-slim (glibc) — Alpine (musl) da Rollup native modul xato beradi:
#   Cannot find module @rollup/rollup-linux-x64-musl

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# NODE_ENV=production qo‘ymang: npm ci faqat prod o‘rnatadi, Vite devDependencies da — "vite: not found" bo‘ladi
# npm ci (yoki install) barcha dependency’larni o‘rnatadi, keyin vite build ishlaydi
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Build-time env (Railway: set as build args or use default empty)
ARG VITE_API_BASE_URL=
ARG VITE_WS_BASE_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_SENTRY_DSN=
ARG VITE_ADMIN_USERNAME=
ARG VITE_ADMIN_PASSWORD=
ARG VITE_TELEGRAM_BOT_USERNAME=
ARG VITE_APPWRITE_ENDPOINT=
ARG VITE_APPWRITE_PROJECT_ID=
ARG VITE_EMAILJS_PUBLIC_KEY=
ARG VITE_EMAILJS_SERVICE_ID=
ARG VITE_EMAILJS_TEMPLATE_ID=
ARG VITE_APP_ENV=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_ADMIN_USERNAME=$VITE_ADMIN_USERNAME
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_APPWRITE_ENDPOINT=$VITE_APPWRITE_ENDPOINT
ENV VITE_APPWRITE_PROJECT_ID=$VITE_APPWRITE_PROJECT_ID
ENV VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY
ENV VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID
ENV VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID
ENV VITE_APP_ENV=$VITE_APP_ENV

RUN npm run build

# Stage 2: Serve with Nginx (Railway PORT qo'llab-quvvatlash)
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY nginx.proxy.template /etc/nginx/conf.d/default.proxy.template
RUN rm -f /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
