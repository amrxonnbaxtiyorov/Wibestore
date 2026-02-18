# WibeStore Backend

> Professional Django 6.0 backend for the WibeStore gaming accounts marketplace.

## 📋 Overview

WibeStore is a marketplace for buying and selling gaming accounts (PUBG Mobile, Steam, Free Fire, Standoff 2, Mobile Legends, Clash of Clans, Roblox, and 40+ other games). The platform includes premium subscriptions, secure Escrow transactions, real-time chat, notifications, a reviews system, and a powerful admin panel.

## 🛠️ Tech Stack

- **Django 6.0** — Web framework
- **Django REST Framework 3.15+** — REST API
- **PostgreSQL 16+** — Database
- **Redis 7+** — Cache, Celery broker, WebSocket layer
- **Celery 5.3+** — Background tasks
- **Django Channels 4.2+** — WebSocket support
- **JWT** — Authentication (via `djangorestframework-simplejwt`)
- **drf-spectacular** — OpenAPI documentation
- **Docker** — Containerized deployment

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/wibestore-backend.git
cd wibestore-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Database Setup

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4. Seed Initial Data

```bash
python scripts/seed_data.py
```

### 5. Run the Server

```bash
python manage.py runserver
```

### 6. Run Celery (in a separate terminal)

```bash
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

## 🐳 Docker Setup

```bash
docker-compose up --build
```

This starts:
- **web** — Django + Gunicorn
- **postgres** — PostgreSQL database
- **redis** — Redis cache/broker
- **celery-worker** — Celery worker
- **celery-beat** — Celery Beat scheduler
- **nginx** — Reverse proxy

## 📡 API Documentation

Once the server is running, access:

- **Swagger UI**: [http://localhost:8000/api/v1/docs/](http://localhost:8000/api/v1/docs/)
- **OpenAPI Schema**: [http://localhost:8000/api/v1/schema/](http://localhost:8000/api/v1/schema/)
- **Admin Panel**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

### Main API Endpoints

| Module | Endpoint | Description |
|---|---|---|
| **Auth** | `POST /api/v1/auth/register/` | Register |
| **Auth** | `POST /api/v1/auth/login/` | Login (JWT) |
| **Auth** | `POST /api/v1/auth/google/` | Google OAuth |
| **Auth** | `GET /api/v1/auth/me/` | Current user |
| **Games** | `GET /api/v1/games/` | List games |
| **Games** | `GET /api/v1/games/categories/` | List categories |
| **Listings** | `GET /api/v1/listings/` | Browse listings |
| **Listings** | `POST /api/v1/listings/` | Create listing |
| **Payments** | `POST /api/v1/payments/deposit/` | Deposit funds |
| **Payments** | `POST /api/v1/payments/purchase/` | Buy (Escrow) |
| **Payments** | `GET /api/v1/payments/balance/` | User balance |
| **Subscriptions** | `GET /api/v1/subscriptions/plans/` | List plans |
| **Chat** | `GET /api/v1/chats/` | List chats |
| **Notifications** | `GET /api/v1/notifications/` | List notifications |
| **Reviews** | `POST /api/v1/reviews/` | Create review |
| **Reports** | `POST /api/v1/reports/` | File report |
| **Health** | `GET /health/` | Health check |
| **Health** | `GET /health/detailed/` | Detailed health |

### WebSocket Endpoints

| Endpoint | Description |
|---|---|
| `ws://host/ws/chat/{room_id}/` | Real-time chat |
| `ws://host/ws/notifications/` | Real-time notifications |

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_accounts.py

# Run specific test class
pytest tests/test_accounts.py::TestRegistration
```

## 📁 Project Structure

```
wibestore_backend/
├── config/              # Django configuration
│   ├── settings/        # Environment-specific settings
│   ├── urls.py          # Root URL configuration
│   ├── celery.py        # Celery configuration
│   └── asgi.py          # ASGI (WebSocket support)
├── apps/                # Django applications
│   ├── accounts/        # Users & authentication
│   ├── games/           # Games catalog
│   ├── marketplace/     # Listings & trading
│   ├── payments/        # Payments & Escrow
│   ├── subscriptions/   # Premium subscriptions
│   ├── messaging/       # Real-time chat
│   ├── notifications/   # Notification system
│   ├── reviews/         # Reviews & ratings
│   ├── reports/         # Reports & moderation
│   └── admin_panel/     # Admin API
├── core/                # Shared components
│   ├── models.py        # Abstract base models
│   ├── exceptions.py    # Custom exceptions
│   ├── permissions.py   # Shared permissions
│   └── utils.py         # Utilities
├── templates/           # Email templates
├── tests/               # Test suite
├── scripts/             # Management scripts
└── docker-compose.yml   # Docker setup
```

## 🔒 Security Features

- JWT authentication with token rotation
- Google OAuth 2.0 integration
- Argon2 password hashing
- Password history (prevents reuse)
- Rate limiting on auth endpoints
- Data encryption (Fernet) for sensitive account credentials
- HTTPS enforcement in production
- CORS configuration
- CSRF protection
- Content Security Policy headers

## 📝 License

Proprietary — All rights reserved.
