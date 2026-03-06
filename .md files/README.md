# 🎮 WibeStore — Маркетплейс игровых аккаунтов

**WibeStore** — профессиональная платформа для покупки и продажи игровых аккаунтов с полной интеграцией платежей, чатом и системой гарантий.

## 🚀 Технологии

### Frontend
- **React 19** + **Vite** — современный UI
- **React Query (TanStack)** — data fetching
- **React Router** — навигация
- **Tailwind CSS** — стилизация
- **Axios** — HTTP клиент
- **WebSocket** — real-time коммуникация

### Backend
- **Django 5.1** + **Django REST Framework** — API
- **Django Channels** — WebSocket поддержка
- **PostgreSQL** — база данных
- **Redis** — кэш и message broker
- **Celery** — асинхронные задачи
- **JWT** — аутентификация

## 📁 Структура проекта

```
WibeStore/
├── src/                        # Frontend исходный код
│   ├── components/            # React компоненты
│   ├── context/               # React контексты
│   ├── hooks/                 # Custom hooks
│   ├── pages/                 # Страницы
│   ├── lib/                   # Утилиты (API client, etc.)
│   ├── App.jsx
│   └── main.jsx
├── wibestore_backend/         # Backend исходный код
│   ├── apps/                  # Django приложения
│   ├── config/                # Настройки Django
│   ├── core/                  # Общие утилиты
│   ├── manage.py
│   └── requirements.txt
├── .env                       # Frontend environment
├── package.json
└── README.md
```

## 🏃 Быстрый старт

### Требования

- **Node.js 20+**
- **Python 3.12+**
- **PostgreSQL 16+**
- **Redis 7+**

### 1. Клонирование

```bash
git clone <repository-url>
cd WibeStore
```

### 2. Backend настройка

```bash
cd wibestore_backend

# Создать виртуальное окружение
python -m venv venv

# Активировать
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Установить зависимости
pip install -r requirements.txt

# Настроить .env
copy .env.example .env  # Windows
cp .env.example .env  # Linux/Mac

# Применить миграции
python manage.py migrate

# Создать суперпользователя
python manage.py createsuperuser

# Запустить сервер
python manage.py runserver
```

### 3. Frontend настройка

```bash
cd c:\WibeStore\Wibestore

# Установить зависимости
npm install

# .env уже настроен для локальной разработки

# Запустить dev сервер
npm run dev
```

### 4. Docker (рекомендуется)

Запуск из **корня проекта** (где лежит `docker-compose.yml`):

```bash
# Из корня WibeStore/
docker-compose up -d
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:8000  

После запуска:

```bash
# Применить миграции
docker-compose exec backend python manage.py migrate

# Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

## 🔌 API Документация

После запуска backend сервера Swagger UI доступен по адресу:
- **Swagger UI**: http://localhost:8000/api/v1/docs/
- **ReDoc**: http://localhost:8000/api/v1/schema/

### Основные endpoints

| Endpoint | Описание |
|----------|----------|
| `POST /api/v1/auth/register/` | Регистрация нового пользователя |
| `POST /api/v1/auth/login/` | Аутентификация |
| `GET /api/v1/games/` | Список игр |
| `GET /api/v1/listings/` | Список игровых аккаунтов |
| `GET /api/v1/profile/` | Профиль пользователя |
| `GET /api/v1/chats/` | Чаты пользователя |
| `WS /ws/chat/{id}/` | WebSocket для real-time чата |

Полный список endpoints см. в [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

## 🎯 Основные возможности

### Для покупателей
- ✅ Поиск и фильтрация игровых аккаунтов
- ✅ Безопасная покупка через Escrow
- ✅ Гарантия возврата средств
- ✅ Real-time чат с продавцом
- ✅ Система отзывов и рейтингов

### Для продавцов
- ✅ Создание и управление listings
- ✅ Статистика продаж
- ✅ Управление заказами
- ✅ Вывод средств

### Для администраторов
- ✅ Модерация listings
- ✅ Управление пользователями
- ✅ Обработка жалоб
- ✅ Финансовая статистика

## 🧪 Тестирование

### Backend

```bash
cd wibestore_backend

# Запустить тесты
pytest

# С coverage
pytest --cov=apps
```

### Frontend

```bash
# Запустить линтер
npm run lint

# Сборка
npm run build

# Preview production
npm run preview
```

## 📦 Production Deployment

### Backend

```bash
# Собрать статику
python manage.py collectstatic --noinput

# Применить миграции
python manage.py migrate

# Запустить с Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Запустить Celery worker
celery -A config worker -l INFO --concurrency=4

# Запустить Celery beat
celery -A config beat -l INFO
```

### Frontend

```bash
# Сборка
npm run build

# Деплой на Netlify/Vercel или свой сервер
```

### Docker Compose (Production)

Из корня проекта (если есть `docker-compose.prod.yml`):

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Иначе используйте основной compose: `docker-compose up -d` (Frontend: 3000, Backend: 8000).

## 🔐 Безопасность

- ✅ HTTPS в production
- ✅ JWT аутентификация
- ✅ CSRF защита
- ✅ Rate limiting
- ✅ Input валидация
- ✅ XSS защита
- ✅ SQL Injection защита (ORM)

## 📊 Мониторинг

- **Health Check**: http://localhost:8000/health/
- **Detailed Health**: http://localhost:8000/health/detailed/
- **Sentry** — отслеживание ошибок
- **Django Logging** — логи в файлах

## 🤝 Вклад

1. Fork репозиторий
2. Создай feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Открой Pull Request

## 📄 License

MIT License — см. [LICENSE](./LICENSE) файл.

## 📞 Контакты

- **Email**: support@wibestore.uz
- **Telegram**: @wibestore_support
- **Website**: https://wibestore.uz

---

**WibeStore** © 2024. Создано с ❤️ для геймеров.
