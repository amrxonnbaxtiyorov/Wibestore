FROM python:3.11-slim

# Ishchi papka
WORKDIR /app

# Paketlar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kod
COPY . .

# Kerakli papkalarni yaratish
RUN mkdir -p receipts logs

# Botni ishga tushirish
CMD ["python", "-m", "bot.main"]
