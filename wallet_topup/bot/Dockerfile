# Build from wallet_topup/ (context in docker-compose)
FROM python:3.12-slim

WORKDIR /app

COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY __init__.py wallet_topup/
COPY bot/ wallet_topup/bot/

ENV PYTHONPATH=/app
CMD ["python", "-m", "wallet_topup.bot.main"]
