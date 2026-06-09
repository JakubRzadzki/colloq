#!/bin/sh
set -e

# Apply database migrations before starting the application.
# Schema changes are managed by Alembic (no create_all / ad-hoc migration at runtime).
echo "[entrypoint] Running database migrations (alembic upgrade head)..."
alembic upgrade head

# Hand off to the container command (uvicorn by default; see Dockerfile CMD).
exec "$@"
