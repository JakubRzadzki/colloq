FROM python:3.11-slim

WORKDIR /app

# System packages: gcc for building wheels, psql client for debugging
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first, so this layer is cached until requirements.txt changes
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Public images and private note attachments
RUN mkdir -p uploads private_uploads

# Entrypoint runs `alembic upgrade head` before the app starts
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Apply migrations, then run the container command
ENTRYPOINT ["./docker-entrypoint.sh"]

# Trust X-Forwarded-* only from FORWARDED_ALLOW_IPS (the reverse proxy), so rate
# limits see the real client IP instead of the proxy's.
ENV FORWARDED_ALLOW_IPS=127.0.0.1
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips \"$FORWARDED_ALLOW_IPS\""]