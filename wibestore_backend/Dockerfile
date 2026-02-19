# ============================================================
# WibeStore Backend - Multi-stage Dockerfile
# ============================================================

# Stage 1: Base image with system dependencies
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r wibestore && useradd -r -g wibestore -d /app -s /sbin/nologin wibestore

WORKDIR /app

# Stage 2: Install Python dependencies
FROM base AS deps

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production image
FROM base AS production

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY . /app/
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chmod +x /app/entrypoint.sh && \
    chown -R wibestore:wibestore /app

USER wibestore

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["gunicorn", "config.wsgi:application", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "4", \
    "--worker-class", "gthread", \
    "--threads", "4", \
    "--timeout", "120", \
    "--access-logfile", "-", \
    "--error-logfile", "-"]
