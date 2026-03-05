# Railway: build context = wallet_topup/bot/ (service root)
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Build wallet_topup package structure so `python -m wallet_topup.bot.main` works
RUN mkdir -p wallet_topup/bot

# Parent package init (created inline — no file needed from context)
RUN touch wallet_topup/__init__.py

# Copy bot source into wallet_topup/bot/
COPY __init__.py      wallet_topup/bot/
COPY config.py        wallet_topup/bot/
COPY main.py          wallet_topup/bot/
COPY handlers/        wallet_topup/bot/handlers/
COPY keyboards/       wallet_topup/bot/keyboards/
COPY services/        wallet_topup/bot/services/

ENV PYTHONPATH=/app

CMD ["python", "-m", "wallet_topup.bot.main"]
