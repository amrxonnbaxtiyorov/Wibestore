# Build from wallet_topup/ (context in docker-compose)
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY __init__.py wallet_topup/
COPY backend/ wallet_topup/backend/

ENV PYTHONPATH=/app
RUN mkdir -p uploads/receipts

EXPOSE 8001
CMD ["uvicorn", "wallet_topup.backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
