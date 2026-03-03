# Telegram Bot — Railway: Railpack/mise xatosiz build
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV TELEGRAM_BOT_DB_PATH=/tmp/bot_wallet.db

CMD ["python", "-u", "bot.py"]
