# ============================================================
# WibeStore Frontend - Multi-stage Dockerfile
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WS_BASE_URL=ws://localhost:8000
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_SENTRY_DSN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# Stage 2: Serve with Nginx (Railway PORT qo'llab-quvvatlash)
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
# Eski default.conf o'chiriladi, entrypoint yangisini yaratadi
RUN rm -f /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
