# WibeStore Payment Bot — Technical Specification

**Version:** 1.0.0
**Date:** 2026-03-05
**Bot:** @wibestorepaybot
**Status:** Draft

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [User Flow](#4-user-flow)
5. [Admin Flow](#5-admin-flow)
6. [Database Schema](#6-database-schema)
7. [Backend Architecture](#7-backend-architecture)
8. [Telegram Bot Architecture](#8-telegram-bot-architecture)
9. [Frontend (WebApp) Architecture](#9-frontend-webapp-architecture)
10. [Security Requirements](#10-security-requirements)
11. [Project Structure](#11-project-structure)
12. [API Endpoints](#12-api-endpoints)
13. [Environment Configuration](#13-environment-configuration)
14. [Scaling Recommendations](#14-scaling-recommendations)
15. [Deployment Guide](#15-deployment-guide)

---

## 1. Project Overview

### 1.1 Purpose

**WibeStore Payment Bot** is a dedicated Telegram bot used exclusively for **manual wallet top-up (balance replenishment)** for WibeStore platform users.

The bot provides a seamless payment experience through a **Telegram Web App (TWA)** interface — users never interact with raw bot commands. The entire payment flow is handled inside a mobile-first web application embedded within Telegram.

All payments are **manual**: the user uploads a payment receipt (screenshot/document), and an administrator manually reviews and approves or rejects each transaction.

### 1.2 Scope

| Feature | Included |
|---|---|
| Wallet top-up via receipt upload | YES |
| Currency: UZS, USDT | YES |
| Payment methods: HUMO, UZCARD, VISA, MasterCard | YES |
| Admin confirmation system | YES |
| User notifications | YES |
| Automatic payment processing | NO (future) |
| Withdrawal | NO (future) |

### 1.3 Key Constraints

- All payments require a human admin to approve
- Only one pending transaction per user at a time
- Rate limiting: maximum 3 submission attempts per 10 minutes per user
- Receipt file upload is mandatory — no receipt = no transaction created

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
+------------------+       Telegram API       +------------------+
|  Telegram Client |<------------------------>|  aiogram 3 Bot   |
|  (User Device)   |                          |  (@wibestorepay) |
+------------------+                          +--------+---------+
         |                                             |
         | Opens WebApp                                | Sends admin alerts
         v                                             v
+------------------+     HTTPS/REST API    +------------------+
| Telegram WebApp  |<--------------------->|  FastAPI Backend |
|  (React/Next.js) |                       |  (Async Python)  |
+------------------+                       +--------+---------+
                                                    |
                                        +-----------+-----------+
                                        |           |           |
                                  +-----+---+  +----+----+  +---+------+
                                  |PostgreSQL|  |  Redis  |  |File     |
                                  |(Database)|  |(Cache/  |  |Storage  |
                                  |          |  |RateLimit|  |(Receipts|
                                  +----------+  +---------+  +--------+
```

### 2.2 Component Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| **Telegram Bot** | aiogram 3.x | Entry point, open WebApp, send notifications, admin actions |
| **WebApp Frontend** | React + TWA SDK | Payment form UI, receipt upload, multi-step wizard |
| **FastAPI Backend** | Python + FastAPI | API gateway, business logic, security, DB operations |
| **PostgreSQL** | PostgreSQL 16 | Persistent storage for users and transactions |
| **Redis** | Redis 7 | Rate limiting, session cache, idempotency keys |
| **File Storage** | Local FS / S3 | Receipt files storage |

### 2.3 Data Flow Summary

```
User submits payment
       |
       v
WebApp collects: currency + method + amount + receipt
       |
       v
POST /api/v1/transactions/submit
  - validates initData (HMAC SHA256)
  - extracts telegram_id
  - checks rate limit (Redis)
  - checks pending transactions (DB)
  - saves receipt file
  - creates transaction (PENDING)
       |
       v
Bot sends admin notification with Confirm/Reject buttons
       |
       +---------> Admin clicks Confirm
       |                   |
       |                   v
       |           PATCH /api/v1/admin/transactions/{uid}/approve
       |             - atomic balance update (DB transaction)
       |             - status -> APPROVED
       |             - notify user via bot
       |
       +---------> Admin clicks Reject
                           |
                           v
                   PATCH /api/v1/admin/transactions/{uid}/reject
                     - status -> REJECTED
                     - notify user via bot
```

---

## 3. Technology Stack

### 3.1 Backend

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.12+ |
| Framework | FastAPI | 0.115+ |
| ORM | SQLAlchemy | 2.0+ (async) |
| Migrations | Alembic | 1.13+ |
| Database | PostgreSQL | 16+ |
| Cache / Rate Limit | Redis | 7.x |
| File Uploads | python-multipart | latest |
| Validation | Pydantic v2 | 2.x |
| Async Driver | asyncpg | latest |
| Redis Client | redis-py (async) | latest |
| Server | Uvicorn + Gunicorn | latest |

### 3.2 Telegram Bot

| Layer | Technology | Version |
|---|---|---|
| Framework | aiogram | 3.x |
| Telegram API | Bot API | 7.x+ |
| Dispatcher | aiogram FSM | built-in |

### 3.3 Frontend (Telegram WebApp)

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18+ (or Next.js 14+) |
| Build Tool | Vite | 5.x |
| Telegram SDK | @twa-dev/sdk | latest |
| HTTP Client | Axios | latest |
| State Management | Zustand or React Context | latest |
| Styling | Tailwind CSS | 3.x |
| Forms | React Hook Form + Zod | latest |
| File Upload | react-dropzone | latest |

### 3.4 Infrastructure

| Component | Technology |
|---|---|
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Process Manager | Gunicorn (ASGI) |
| Secrets | .env files / Railway / Vault |
| Logging | Python logging + structlog |

---

## 4. User Flow

### 4.1 Entry Point

1. User opens Telegram and finds **@wibestorepaybot**
2. User sends `/start` or taps the bot
3. Bot replies with a welcome message and a button:

```
Welcome to WibeStore Payments!
Tap the button below to open the payment panel.

[  💰 Open Payment Panel  ]   <- Web App Button
```

4. Tapping the button opens the **Telegram WebApp** inside Telegram

### 4.2 Step 1 — Select Currency

The WebApp displays a currency selection screen:

```
+----------------------------------+
|  Select Currency                 |
|                                  |
|   [  UZS  ]    [  USDT  ]       |
|                                  |
+----------------------------------+
```

- `UZS` — Uzbek Sum (local currency)
- `USDT` — Tether USD (crypto stable)

### 4.3 Step 2 — Select Payment Method

Depending on the selected currency:

**If UZS selected:**
```
+----------------------------------+
|  Select Payment Method           |
|                                  |
|   [  HUMO  ]   [  UZCARD  ]     |
|                                  |
+----------------------------------+
```

**If USDT selected:**
```
+----------------------------------+
|  Select Payment Method           |
|                                  |
|   [  VISA  ]  [  MasterCard  ]  |
|                                  |
+----------------------------------+
```

### 4.4 Step 3 — Enter Amount

```
+----------------------------------+
|  Enter Amount                    |
|                                  |
|   Currency: UZS                  |
|   Method:   HUMO                 |
|                                  |
|   Amount: [_______________]      |
|                                  |
|   Min: 10,000 UZS                |
|   Max: 50,000,000 UZS            |
|                                  |
|   [ Continue ]                   |
+----------------------------------+
```

**Validation rules:**
- Must be a positive number
- Cannot be 0 or negative
- Must be >= minimum limit (configurable per currency)
- Must be <= maximum limit (configurable per currency)
- Only numeric input (no letters, no special characters)
- Decimal allowed for USDT (max 2 decimal places)

**Default limits:**

| Currency | Minimum | Maximum |
|---|---|---|
| UZS | 10,000 | 50,000,000 |
| USDT | 1 | 10,000 |

### 4.5 Step 4 — Upload Receipt

```
+----------------------------------+
|  Upload Payment Receipt          |
|                                  |
|   [  Drop file here or tap  ]   |
|   [  to select from gallery  ]  |
|                                  |
|   Accepted: JPG, PNG, PDF       |
|   Max size: 10 MB                |
|                                  |
|   [ Continue ]                   |
+----------------------------------+
```

**Accepted file types:**
- Images: `image/jpeg`, `image/png`, `image/webp`
- Documents: `application/pdf`

**Validation:**
- File is required — cannot proceed without it
- MIME type must match allowed list (checked both client-side and server-side)
- Maximum file size: **10 MB**
- Only 1 file allowed per transaction

### 4.6 Step 5 — Review and Submit

```
+----------------------------------+
|  Review Your Request             |
|                                  |
|   Currency:  UZS                 |
|   Method:    HUMO                |
|   Amount:    500,000 UZS         |
|   Receipt:   receipt_scan.jpg    |
|                                  |
|   [ Submit Payment Request ]     |
+----------------------------------+
```

User reviews all details and submits.

### 4.7 Step 6 — Confirmation Screen

```
+----------------------------------+
|  Request Submitted!              |
|                                  |
|  Transaction ID: TXN-A1B2C3      |
|                                  |
|  Your request is under review.   |
|  You will be notified once it    |
|  is approved or rejected.        |
|                                  |
|   [ Close ]                      |
+----------------------------------+
```

### 4.8 User Notification Messages

**On Approval:**
```
✅ Payment Approved!

Your wallet has been topped up:
+500,000 UZS

Transaction ID: TXN-A1B2C3
New Balance: 1,250,000 UZS
```

**On Rejection:**
```
❌ Payment Rejected

Transaction ID: TXN-A1B2C3
Amount: 500,000 UZS

If you believe this is an error,
please contact support.
```

---

## 5. Admin Flow

### 5.1 Admin Notification

When a user submits a transaction, the bot sends the following message to the configured **admin chat/group**:

```
🔔 New Top-Up Request

Transaction ID:  TXN-A1B2C3
User ID:         @username (123456789)
Currency:        UZS
Method:          HUMO
Amount:          500,000 UZS
Time:            2026-03-05 14:30:22 UTC

[View Receipt]  <- opens receipt image/document

[  ✅ Confirm  ]  [  ❌ Reject  ]
```

### 5.2 Admin Confirmation

When the admin taps **✅ Confirm**:

1. Backend receives callback with `transaction_uid`
2. Verifies admin identity (telegram_id must be in ADMIN_IDS list)
3. Checks transaction is still `PENDING` (double-approval protection)
4. Begins **atomic DB transaction**:
   - Updates transaction status to `APPROVED`
   - Sets `admin_id` = admin's telegram_id
   - Sets `updated_at` = now
   - Increments user's `wallet_balance` by `amount`
5. Commits DB transaction
6. Sends success notification to user
7. Edits admin message to show:

```
✅ APPROVED by @admin_name
Transaction: TXN-A1B2C3
Amount: +500,000 UZS
```

### 5.3 Admin Rejection

When the admin taps **❌ Reject**:

1. Backend receives callback with `transaction_uid`
2. Verifies admin identity
3. Checks transaction is still `PENDING`
4. Updates status to `REJECTED`
5. Sets `admin_id`, `updated_at`
6. Sends rejection notification to user
7. Edits admin message:

```
❌ REJECTED by @admin_name
Transaction: TXN-A1B2C3
```

### 5.4 Admin Commands (Bot)

| Command | Description |
|---|---|
| `/admin` | Show admin panel summary |
| `/pending` | List all pending transactions |
| `/stats` | Show daily/weekly transaction statistics |
| `/balance <telegram_id>` | Check a user's wallet balance |

---

## 6. Database Schema

### 6.1 Users Table

```sql
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    telegram_id     BIGINT          NOT NULL UNIQUE,
    username        VARCHAR(64),
    first_name      VARCHAR(64),
    last_name       VARCHAR(64),
    wallet_balance  NUMERIC(20, 2)  NOT NULL DEFAULT 0.00,
    is_banned       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

### 6.2 Transactions Table

```sql
CREATE TABLE transactions (
    id              BIGSERIAL           PRIMARY KEY,
    transaction_uid VARCHAR(32)         NOT NULL UNIQUE,
    telegram_id     BIGINT              NOT NULL REFERENCES users(telegram_id),
    currency        VARCHAR(10)         NOT NULL CHECK (currency IN ('UZS', 'USDT')),
    payment_method  VARCHAR(20)         NOT NULL CHECK (payment_method IN ('HUMO', 'UZCARD', 'VISA', 'MASTERCARD')),
    amount          NUMERIC(20, 2)      NOT NULL CHECK (amount > 0),
    receipt_path    VARCHAR(512)        NOT NULL,
    receipt_mime    VARCHAR(64)         NOT NULL,
    status          VARCHAR(20)         NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_id        BIGINT,
    admin_note      TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_telegram_id ON transactions(telegram_id);
CREATE INDEX idx_transactions_status      ON transactions(status);
CREATE INDEX idx_transactions_created_at  ON transactions(created_at DESC);
CREATE INDEX idx_transactions_uid         ON transactions(transaction_uid);
```

### 6.3 Admin Actions Log Table

```sql
CREATE TABLE admin_action_logs (
    id              BIGSERIAL   PRIMARY KEY,
    admin_id        BIGINT      NOT NULL,
    action          VARCHAR(50) NOT NULL,
    transaction_uid VARCHAR(32),
    detail          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id  ON admin_action_logs(admin_id);
CREATE INDEX idx_admin_logs_created   ON admin_action_logs(created_at DESC);
```

### 6.4 SQLAlchemy Models

```python
# backend/models/user.py
from sqlalchemy import BigInteger, Boolean, Column, Numeric, String
from sqlalchemy.orm import relationship
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id             = Column(BigInteger, primary_key=True, autoincrement=True)
    telegram_id    = Column(BigInteger, nullable=False, unique=True, index=True)
    username       = Column(String(64), nullable=True)
    first_name     = Column(String(64), nullable=True)
    last_name      = Column(String(64), nullable=True)
    wallet_balance = Column(Numeric(20, 2), nullable=False, default=0.00)
    is_banned      = Column(Boolean, nullable=False, default=False)

    transactions = relationship("Transaction", back_populates="user",
                                foreign_keys="Transaction.telegram_id")


# backend/models/transaction.py
import enum
from sqlalchemy import BigInteger, Column, Enum, Numeric, String, Text
from .base import Base, TimestampMixin

class CurrencyEnum(str, enum.Enum):
    UZS  = "UZS"
    USDT = "USDT"

class PaymentMethodEnum(str, enum.Enum):
    HUMO       = "HUMO"
    UZCARD     = "UZCARD"
    VISA       = "VISA"
    MASTERCARD = "MASTERCARD"

class TransactionStatusEnum(str, enum.Enum):
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id              = Column(BigInteger, primary_key=True, autoincrement=True)
    transaction_uid = Column(String(32), nullable=False, unique=True, index=True)
    telegram_id     = Column(BigInteger, nullable=False, index=True)
    currency        = Column(Enum(CurrencyEnum), nullable=False)
    payment_method  = Column(Enum(PaymentMethodEnum), nullable=False)
    amount          = Column(Numeric(20, 2), nullable=False)
    receipt_path    = Column(String(512), nullable=False)
    receipt_mime    = Column(String(64), nullable=False)
    status          = Column(Enum(TransactionStatusEnum), nullable=False,
                             default=TransactionStatusEnum.PENDING)
    admin_id        = Column(BigInteger, nullable=True)
    admin_note      = Column(Text, nullable=True)
    ip_address      = Column(String(45), nullable=True)
```

---

## 7. Backend Architecture

### 7.1 FastAPI Application Structure

```
backend/
  app/
    api/
      v1/
        routes/
          transactions.py    # submit transaction endpoint
          admin.py           # approve/reject endpoints
          users.py           # user info endpoint
        __init__.py
      deps.py                # dependency injection (DB, Redis, auth)
    core/
      config.py              # settings via pydantic-settings
      security.py            # HMAC validation, initData parsing
      rate_limiter.py        # Redis-based rate limiter
    models/
      base.py
      user.py
      transaction.py
      admin_log.py
    schemas/
      transaction.py         # Pydantic request/response schemas
      user.py
    services/
      transaction_service.py  # business logic
      user_service.py
      notification_service.py # calls bot to send messages
    database/
      session.py             # async SQLAlchemy engine + session factory
      init_db.py
    middleware/
      logging_middleware.py
    main.py                  # FastAPI app factory
  alembic/
    versions/
    env.py
    alembic.ini
```

### 7.2 Core Security Module

```python
# backend/app/core/security.py
import hashlib
import hmac
import json
import time
from urllib.parse import unquote, parse_qsl
from fastapi import HTTPException, status

class TelegramInitDataValidator:
    """
    Validates Telegram WebApp initData using HMAC-SHA256.
    Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """

    def __init__(self, bot_token: str):
        self._secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256,
        ).digest()

    def validate(self, init_data: str, max_age_seconds: int = 300) -> dict:
        """
        Parse and validate initData string.
        Returns parsed user dict on success.
        Raises HTTPException on failure.
        """
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))

        received_hash = parsed.pop("hash", None)
        if not received_hash:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Missing hash in initData")

        # Validate timestamp
        auth_date = int(parsed.get("auth_date", 0))
        if time.time() - auth_date > max_age_seconds:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="initData expired")

        # Build data check string
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed.items())
        )

        expected_hash = hmac.new(
            key=self._secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_hash, received_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid initData signature")

        user_json = parsed.get("user", "{}")
        return json.loads(unquote(user_json))
```

### 7.3 Rate Limiter

```python
# backend/app/core/rate_limiter.py
import redis.asyncio as redis
from fastapi import HTTPException, status

class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def check(
        self,
        key: str,
        max_requests: int = 3,
        window_seconds: int = 600,  # 10 minutes
    ) -> None:
        """
        Raises HTTPException if rate limit exceeded.
        Uses Redis sliding window counter.
        """
        redis_key = f"rate_limit:{key}"
        count = await self.redis.incr(redis_key)
        if count == 1:
            await self.redis.expire(redis_key, window_seconds)
        if count > max_requests:
            ttl = await self.redis.ttl(redis_key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Try again in {ttl} seconds.",
            )
```

### 7.4 Transaction Service

```python
# backend/app/services/transaction_service.py
import secrets
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from ..models.transaction import Transaction, TransactionStatusEnum
from ..models.user import User

async def create_transaction(
    db: AsyncSession,
    telegram_id: int,
    currency: str,
    payment_method: str,
    amount: Decimal,
    receipt_path: str,
    receipt_mime: str,
    ip_address: str | None = None,
) -> Transaction:
    # Check for existing PENDING transaction
    existing = await db.scalar(
        select(Transaction).where(
            Transaction.telegram_id == telegram_id,
            Transaction.status == TransactionStatusEnum.PENDING,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending transaction. "
                   "Wait for it to be reviewed before submitting another.",
        )

    txn = Transaction(
        transaction_uid = "TXN-" + secrets.token_hex(6).upper(),
        telegram_id     = telegram_id,
        currency        = currency,
        payment_method  = payment_method,
        amount          = amount,
        receipt_path    = receipt_path,
        receipt_mime    = receipt_mime,
        ip_address      = ip_address,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


async def approve_transaction(
    db: AsyncSession,
    transaction_uid: str,
    admin_telegram_id: int,
) -> Transaction:
    async with db.begin():
        txn = await db.scalar(
            select(Transaction)
            .where(Transaction.transaction_uid == transaction_uid)
            .with_for_update()  # row-level lock
        )
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status != TransactionStatusEnum.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transaction already {txn.status.value}",
            )

        # Update transaction
        txn.status   = TransactionStatusEnum.APPROVED
        txn.admin_id = admin_telegram_id

        # Atomic balance update
        await db.execute(
            update(User)
            .where(User.telegram_id == txn.telegram_id)
            .values(wallet_balance=User.wallet_balance + txn.amount)
        )

    await db.refresh(txn)
    return txn


async def reject_transaction(
    db: AsyncSession,
    transaction_uid: str,
    admin_telegram_id: int,
) -> Transaction:
    async with db.begin():
        txn = await db.scalar(
            select(Transaction)
            .where(Transaction.transaction_uid == transaction_uid)
            .with_for_update()
        )
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status != TransactionStatusEnum.PENDING:
            raise HTTPException(status_code=409, detail=f"Transaction already {txn.status.value}")

        txn.status   = TransactionStatusEnum.REJECTED
        txn.admin_id = admin_telegram_id

    await db.refresh(txn)
    return txn
```

### 7.5 File Upload Handling

```python
# backend/app/api/v1/routes/transactions.py (upload logic)
import aiofiles
import mimetypes
from pathlib import Path
from fastapi import UploadFile

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "application/pdf"
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
UPLOAD_DIR = Path("./uploads/receipts")

async def save_receipt(file: UploadFile) -> tuple[str, str]:
    """
    Validates and saves uploaded receipt file.
    Returns (file_path, mime_type).
    """
    # Read file into memory to check size
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB.")

    # Detect and validate MIME type (do not trust Content-Type header alone)
    import magic  # python-magic
    detected_mime = magic.from_buffer(contents, mime=True)

    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {detected_mime}. "
                   f"Allowed: JPEG, PNG, WEBP, PDF"
        )

    # Generate safe filename
    ext = mimetypes.guess_extension(detected_mime) or ".bin"
    filename = secrets.token_hex(16) + ext
    save_path = UPLOAD_DIR / filename
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(contents)

    return str(save_path), detected_mime
```

---

## 8. Telegram Bot Architecture

### 8.1 Bot Setup

```python
# bot/main.py
import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from bot.handlers import user_router, admin_router
from bot.config import settings

async def main():
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()
    dp.include_router(user_router)
    dp.include_router(admin_router)

    await dp.start_polling(bot)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
```

### 8.2 User Handler

```python
# bot/handlers/user.py
from aiogram import Router
from aiogram.types import Message, WebAppInfo
from aiogram.filters import CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder
from bot.config import settings

router = Router()

@router.message(CommandStart())
async def cmd_start(message: Message):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="💰 Open Payment Panel",
        web_app=WebAppInfo(url=settings.WEBAPP_URL),
    )
    await message.answer(
        "👋 Welcome to <b>WibeStore Payments</b>!\n\n"
        "Use the button below to top up your wallet.",
        reply_markup=builder.as_markup(),
    )
```

### 8.3 Admin Notification Function

```python
# bot/services/notification.py
from aiogram import Bot
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import FSInputFile
from bot.config import settings

async def notify_admin_new_transaction(bot: Bot, transaction: dict) -> None:
    builder = InlineKeyboardBuilder()
    builder.button(
        text="✅ Confirm",
        callback_data=f"approve:{transaction['transaction_uid']}"
    )
    builder.button(
        text="❌ Reject",
        callback_data=f"reject:{transaction['transaction_uid']}"
    )
    builder.adjust(2)

    text = (
        f"🔔 <b>New Top-Up Request</b>\n\n"
        f"Transaction ID:  <code>{transaction['transaction_uid']}</code>\n"
        f"User:            @{transaction.get('username', 'N/A')} "
        f"(<code>{transaction['telegram_id']}</code>)\n"
        f"Currency:        {transaction['currency']}\n"
        f"Method:          {transaction['payment_method']}\n"
        f"Amount:          <b>{transaction['amount']:,.2f} {transaction['currency']}</b>\n"
        f"Time:            {transaction['created_at']}"
    )

    # Send receipt first
    receipt_path = transaction["receipt_path"]
    if receipt_path.endswith(".pdf"):
        await bot.send_document(
            settings.ADMIN_CHAT_ID,
            FSInputFile(receipt_path),
            caption=text,
            reply_markup=builder.as_markup(),
        )
    else:
        await bot.send_photo(
            settings.ADMIN_CHAT_ID,
            FSInputFile(receipt_path),
            caption=text,
            reply_markup=builder.as_markup(),
        )
```

### 8.4 Admin Callback Handler

```python
# bot/handlers/admin.py
from aiogram import Router, F
from aiogram.types import CallbackQuery
import httpx
from bot.config import settings

router = Router()

def is_admin(telegram_id: int) -> bool:
    return telegram_id in settings.ADMIN_IDS

@router.callback_query(F.data.startswith("approve:"))
async def handle_approve(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Access denied.", show_alert=True)
        return

    transaction_uid = callback.data.split(":", 1)[1]

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{settings.BACKEND_URL}/api/v1/admin/transactions/{transaction_uid}/approve",
            headers={"X-Admin-Secret": settings.ADMIN_SECRET},
            json={"admin_telegram_id": callback.from_user.id},
        )

    if response.status_code == 200:
        await callback.message.edit_caption(
            callback.message.caption + f"\n\n✅ <b>APPROVED</b> by @{callback.from_user.username}"
        )
        await callback.answer("Transaction approved!")
    else:
        detail = response.json().get("detail", "Unknown error")
        await callback.answer(f"Error: {detail}", show_alert=True)


@router.callback_query(F.data.startswith("reject:"))
async def handle_reject(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Access denied.", show_alert=True)
        return

    transaction_uid = callback.data.split(":", 1)[1]

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{settings.BACKEND_URL}/api/v1/admin/transactions/{transaction_uid}/reject",
            headers={"X-Admin-Secret": settings.ADMIN_SECRET},
            json={"admin_telegram_id": callback.from_user.id},
        )

    if response.status_code == 200:
        await callback.message.edit_caption(
            callback.message.caption + f"\n\n❌ <b>REJECTED</b> by @{callback.from_user.username}"
        )
        await callback.answer("Transaction rejected.")
    else:
        detail = response.json().get("detail", "Unknown error")
        await callback.answer(f"Error: {detail}", show_alert=True)
```

---

## 9. Frontend (WebApp) Architecture

### 9.1 Telegram WebApp SDK Integration

```javascript
// src/lib/telegram.js
const tg = window.Telegram.WebApp;

export const initTelegram = () => {
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();
};

export const getTelegramInitData = () => tg.initData;

export const getTelegramUser = () => tg.initDataUnsafe?.user;

export const closeTelegramApp = () => tg.close();

export const getThemeParams = () => tg.themeParams;

export const isDarkTheme = () => tg.colorScheme === "dark";
```

### 9.2 Step Wizard Component

```
src/
  components/
    wizard/
      CurrencyStep.jsx        // Step 1: UZS / USDT
      PaymentMethodStep.jsx   // Step 2: HUMO/UZCARD or VISA/MC
      AmountStep.jsx          // Step 3: amount input + validation
      ReceiptStep.jsx         // Step 4: file upload
      ReviewStep.jsx          // Step 5: review + submit
      SuccessStep.jsx         // Step 6: confirmation screen
    shared/
      StepIndicator.jsx       // progress dots (1-2-3-4-5)
      BackButton.jsx          // uses tg.BackButton API
      PrimaryButton.jsx
      ErrorMessage.jsx
  pages/
    PaymentWizard.jsx         // orchestrates all steps, holds state
  services/
    api.js                    // axios instance with initData header
  hooks/
    usePaymentForm.js
    useTelegramTheme.js
  App.jsx
```

### 9.3 API Service

```javascript
// src/services/api.js
import axios from "axios";
import { getTelegramInitData } from "../lib/telegram";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const initData = getTelegramInitData();
  if (initData) {
    config.headers["X-Telegram-Init-Data"] = initData;
  }
  return config;
});

export const submitTransaction = async (formData) => {
  const response = await apiClient.post(
    "/api/v1/transactions/submit",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};
```

### 9.4 Amount Validation

```javascript
// src/utils/validation.js
export const LIMITS = {
  UZS:  { min: 10_000,   max: 50_000_000 },
  USDT: { min: 1,        max: 10_000      },
};

export const validateAmount = (value, currency) => {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0)
    return "Amount must be a positive number";
  if (num < LIMITS[currency].min)
    return `Minimum amount is ${LIMITS[currency].min.toLocaleString()} ${currency}`;
  if (num > LIMITS[currency].max)
    return `Maximum amount is ${LIMITS[currency].max.toLocaleString()} ${currency}`;
  if (currency === "USDT" && !/^\d+(\.\d{1,2})?$/.test(value))
    return "Maximum 2 decimal places for USDT";
  return null;
};
```

### 9.5 Theme Support

The WebApp reads Telegram's native theme variables to provide seamless dark/light mode:

```javascript
// src/hooks/useTelegramTheme.js
import { useEffect } from "react";
import { getThemeParams } from "../lib/telegram";

export const useTelegramTheme = () => {
  useEffect(() => {
    const params = getThemeParams();
    const root = document.documentElement;
    if (params.bg_color)          root.style.setProperty("--tg-bg",       params.bg_color);
    if (params.text_color)        root.style.setProperty("--tg-text",     params.text_color);
    if (params.button_color)      root.style.setProperty("--tg-button",   params.button_color);
    if (params.button_text_color) root.style.setProperty("--tg-btn-text", params.button_text_color);
    if (params.hint_color)        root.style.setProperty("--tg-hint",     params.hint_color);
    if (params.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", params.secondary_bg_color);
  }, []);
};
```

---

## 10. Security Requirements

### 10.1 Telegram initData Validation (MANDATORY)

Every API request from the WebApp **must** include `X-Telegram-Init-Data` header.

The backend **must**:
1. Parse the `initData` string
2. Sort all fields alphabetically (except `hash`)
3. Build data-check-string with `\n` separator
4. Compute `HMAC-SHA256(data_check_string, secret_key)`
5. Where `secret_key = HMAC-SHA256(bot_token, "WebAppData")`
6. Compare with the provided `hash` using `hmac.compare_digest` (constant-time)
7. Reject if `auth_date` is older than 5 minutes (configurable)

### 10.2 Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| Transaction submission per user | 3 requests | 10 minutes |
| Admin callbacks | 60 requests | 1 minute |
| General API per IP | 100 requests | 1 minute |

Implementation: Redis `INCR` + `EXPIRE` (sliding window).

### 10.3 Double-Spend / Double-Approval Protection

- Before creating a transaction: check if user has any `PENDING` transaction → reject with 409
- Before approving: use `SELECT ... FOR UPDATE` row lock in PostgreSQL → if status != PENDING, reject
- This prevents two admins from simultaneously approving the same transaction

### 10.4 Admin Authentication

- Admin identity verified by `telegram_id` against `ADMIN_IDS` environment variable (comma-separated list)
- Internal API calls (bot → backend) use `X-Admin-Secret` header (random 64-char secret)
- Never expose admin endpoints to the public WebApp

### 10.5 File Upload Security

| Check | Implementation |
|---|---|
| MIME type validation | `python-magic` (reads file magic bytes, not Content-Type header) |
| File size limit | 10 MB hard limit, checked after reading content |
| Filename sanitization | Replace with random `secrets.token_hex(16)` + extension |
| Storage location | Outside web root / private S3 bucket |
| No executable files | Whitelist only: JPEG, PNG, WEBP, PDF |

### 10.6 Admin Action Logging

All admin actions (approve/reject) **must** be recorded in `admin_action_logs`:

```python
await db.execute(
    insert(AdminActionLog).values(
        admin_id=admin_telegram_id,
        action="APPROVE" or "REJECT",
        transaction_uid=transaction_uid,
        detail=f"Balance updated: +{amount} {currency}",
    )
)
```

### 10.7 Input Validation Summary

| Field | Validation |
|---|---|
| `currency` | Enum: `UZS`, `USDT` |
| `payment_method` | Enum: `HUMO`, `UZCARD`, `VISA`, `MASTERCARD` |
| `amount` | Decimal > 0, within currency limits |
| `receipt` | MIME check, size check, extension check |
| `telegram_id` | Integer, extracted from validated initData only |

---

## 11. Project Structure

```
payment-bot/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── routes/
│   │   │   │   │   ├── transactions.py
│   │   │   │   │   ├── admin.py
│   │   │   │   │   └── users.py
│   │   │   │   └── __init__.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── rate_limiter.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   ├── user.py
│   │   │   ├── transaction.py
│   │   │   └── admin_log.py
│   │   ├── schemas/
│   │   │   ├── transaction.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   ├── transaction_service.py
│   │   │   ├── user_service.py
│   │   │   └── notification_service.py
│   │   ├── database/
│   │   │   ├── session.py
│   │   │   └── init_db.py
│   │   ├── middleware/
│   │   │   └── logging_middleware.py
│   │   └── main.py
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── uploads/
│   │   └── receipts/          # receipt files stored here
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── bot/
│   ├── handlers/
│   │   ├── user.py
│   │   ├── admin.py
│   │   └── __init__.py
│   ├── keyboards/
│   │   ├── user_kb.py
│   │   └── admin_kb.py
│   ├── services/
│   │   └── notification.py
│   ├── config.py
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── wizard/
│   │   │   │   ├── CurrencyStep.jsx
│   │   │   │   ├── PaymentMethodStep.jsx
│   │   │   │   ├── AmountStep.jsx
│   │   │   │   ├── ReceiptStep.jsx
│   │   │   │   ├── ReviewStep.jsx
│   │   │   │   └── SuccessStep.jsx
│   │   │   └── shared/
│   │   │       ├── StepIndicator.jsx
│   │   │       ├── BackButton.jsx
│   │   │       └── PrimaryButton.jsx
│   │   ├── pages/
│   │   │   └── PaymentWizard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── hooks/
│   │   │   ├── usePaymentForm.js
│   │   │   └── useTelegramTheme.js
│   │   ├── utils/
│   │   │   └── validation.js
│   │   ├── lib/
│   │   │   └── telegram.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── nginx/
│   └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 12. API Endpoints

### 12.1 User Endpoints (WebApp → Backend)

#### `POST /api/v1/transactions/submit`

Submit a new top-up transaction.

**Headers:**
```
X-Telegram-Init-Data: <raw initData string>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|---|---|---|---|
| `currency` | string | YES | `UZS` or `USDT` |
| `payment_method` | string | YES | `HUMO`, `UZCARD`, `VISA`, `MASTERCARD` |
| `amount` | number | YES | Positive decimal |
| `receipt` | file | YES | JPEG/PNG/WEBP/PDF, max 10MB |

**Response 200:**
```json
{
  "transaction_uid": "TXN-A1B2C3",
  "status": "PENDING",
  "created_at": "2026-03-05T14:30:22Z"
}
```

**Error Responses:**
| Code | Meaning |
|---|---|
| 401 | Invalid or expired initData |
| 409 | User already has a pending transaction |
| 413 | File too large |
| 415 | Unsupported MIME type |
| 422 | Validation error (amount out of range, etc.) |
| 429 | Rate limit exceeded |

---

#### `GET /api/v1/users/me`

Get current user's wallet balance.

**Headers:**
```
X-Telegram-Init-Data: <raw initData string>
```

**Response 200:**
```json
{
  "telegram_id": 123456789,
  "username": "johndoe",
  "wallet_balance": "1250000.00",
  "currency": "UZS"
}
```

---

### 12.2 Admin Endpoints (Bot → Backend)

These endpoints are **not public** — protected by `X-Admin-Secret` header.

#### `PATCH /api/v1/admin/transactions/{transaction_uid}/approve`

**Headers:**
```
X-Admin-Secret: <ADMIN_SECRET>
Content-Type: application/json
```

**Body:**
```json
{ "admin_telegram_id": 987654321 }
```

**Response 200:**
```json
{
  "transaction_uid": "TXN-A1B2C3",
  "status": "APPROVED",
  "new_balance": "1750000.00"
}
```

---

#### `PATCH /api/v1/admin/transactions/{transaction_uid}/reject`

**Headers:**
```
X-Admin-Secret: <ADMIN_SECRET>
Content-Type: application/json
```

**Body:**
```json
{
  "admin_telegram_id": 987654321,
  "note": "Receipt is blurry"
}
```

**Response 200:**
```json
{
  "transaction_uid": "TXN-A1B2C3",
  "status": "REJECTED"
}
```

---

#### `GET /api/v1/admin/transactions?status=PENDING`

List transactions with optional filter.

**Query Params:** `status`, `limit` (default 20), `offset` (default 0)

---

## 13. Environment Configuration

### 13.1 Backend `.env`

```env
# Application
APP_ENV=production
SECRET_KEY=change_this_to_random_64_chars

# Database
DATABASE_URL=postgresql+asyncpg://user:password@db:5432/paymentbot

# Redis
REDIS_URL=redis://redis:6379/0

# Telegram
BOT_TOKEN=<your_bot_token_here>

# Admin
ADMIN_SECRET=change_this_to_random_64_chars
ADMIN_IDS=123456789,987654321

# File uploads
UPLOAD_DIR=./uploads/receipts
MAX_FILE_SIZE_MB=10

# Rate limiting
RATE_LIMIT_MAX_REQUESTS=3
RATE_LIMIT_WINDOW_SECONDS=600

# CORS
ALLOWED_ORIGINS=https://your-webapp-domain.com
```

### 13.2 Bot `.env`

```env
BOT_TOKEN=<your_bot_token_here>
BACKEND_URL=http://backend:8000
WEBAPP_URL=https://your-webapp-domain.com
ADMIN_CHAT_ID=-100xxxxxxxxxx
ADMIN_IDS=123456789,987654321
ADMIN_SECRET=change_this_to_random_64_chars
```

### 13.3 Frontend `.env`

```env
VITE_API_URL=https://your-backend-domain.com
```

---

## 14. Scaling Recommendations

### 14.1 Application Layer

| Concern | Recommendation |
|---|---|
| Multiple backend instances | Run behind a load balancer (Nginx upstream / Railway replicas) |
| WebApp CDN | Deploy frontend to Vercel/Cloudflare Pages for global edge delivery |
| Bot polling → webhook | Switch aiogram to webhook mode for lower latency at scale |

### 14.2 Database

| Concern | Recommendation |
|---|---|
| Read replicas | Add PostgreSQL read replica for analytics queries |
| Connection pooling | Use PgBouncer between app and DB |
| Indexes | Ensure indexes on `telegram_id`, `status`, `created_at` |
| Partitioning | Partition `transactions` by month when > 1M rows |

### 14.3 File Storage

| Concern | Recommendation |
|---|---|
| Local FS | OK for development and small scale |
| Production | Move to AWS S3 or Cloudflare R2 |
| CDN delivery | Serve receipt images via signed S3 URLs (time-limited) |

### 14.4 Redis

| Concern | Recommendation |
|---|---|
| High availability | Redis Sentinel or Redis Cluster |
| Persistence | Enable AOF persistence to survive restarts |

### 14.5 Future: Automatic Payment Integration

The system is designed so that manual confirmation can be replaced by automatic payment verification:

1. Replace `POST /api/v1/transactions/submit` logic — instead of saving as PENDING, verify with payment provider API
2. Auto-approve if payment confirmed by provider
3. Keep the admin review flow as fallback for failed/disputed transactions

---

## 15. Deployment Guide

### 15.1 docker-compose.yml (Development)

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: paybot
      POSTGRES_PASSWORD: paybot_secret
      POSTGRES_DB: paymentbot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    env_file: ./backend/.env
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"
    volumes:
      - ./backend/uploads:/app/uploads

  bot:
    build: ./bot
    env_file: ./bot/.env
    depends_on:
      - backend
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

### 15.2 Dockerfile (Backend)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libmagic1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN alembic upgrade head

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker",
     "--bind", "0.0.0.0:8000", "--access-logfile", "-"]
```

### 15.3 Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-backend-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

    client_max_body_size 15M;

    location /api/ {
        proxy_pass         http://backend:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        # Do NOT serve uploads publicly
        deny all;
    }
}
```

### 15.4 Deployment Checklist

- [ ] Regenerate `BOT_TOKEN` via @BotFather if previously exposed
- [ ] Set strong random `SECRET_KEY` and `ADMIN_SECRET` (min 64 chars)
- [ ] Configure `ADMIN_IDS` with correct admin Telegram user IDs
- [ ] Run `alembic upgrade head` before first start
- [ ] Configure HTTPS (required for Telegram WebApp)
- [ ] Register WebApp URL in @BotFather: `/mybots` → bot → `Menu Button` → set URL
- [ ] Test rate limiting behavior
- [ ] Test double-approval scenario manually
- [ ] Verify receipt file upload and MIME validation
- [ ] Confirm admin notifications are delivered to correct chat
- [ ] Set up log monitoring (Sentry, Datadog, or self-hosted Loki)
- [ ] Configure DB backups (daily minimum)

---

## Appendix A: Required Python Packages

```
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
gunicorn==22.0.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.29.0
alembic==1.13.3
pydantic==2.9.0
pydantic-settings==2.5.0
redis[hiredis]==5.1.0
python-multipart==0.0.12
aiofiles==24.1.0
python-magic==0.4.27
httpx==0.27.0
structlog==24.4.0

# bot/requirements.txt
aiogram==3.13.0
httpx==0.27.0
pydantic-settings==2.5.0
```

## Appendix B: Frontend Packages

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "axios": "^1.7.0",
    "@twa-dev/sdk": "^7.10.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "react-dropzone": "^14.3.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

*Document maintained by WibeStore Engineering Team.*
*For questions, contact the technical lead responsible for the payment infrastructure.*
