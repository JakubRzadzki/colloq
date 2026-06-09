FROM python:3.11-slim

WORKDIR /app

# Instalacja zależności systemowych
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Kopiowanie plików z wymaganiami
COPY requirements.txt .

# Instalacja zależności Pythona
RUN pip install --no-cache-dir -r requirements.txt

# Kopiowanie kodu aplikacji
COPY . .

# Utworzenie folderu na uploady
RUN mkdir -p uploads

# Entrypoint runs `alembic upgrade head` before the app starts
RUN chmod +x docker-entrypoint.sh

# Eksponowanie portu
EXPOSE 8000

# Apply migrations, then run the container command
ENTRYPOINT ["./docker-entrypoint.sh"]

# Komenda startowa
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]