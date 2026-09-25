"""
Application configuration loaded from environment variables and .env files.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_DIR.parent

INSECURE_DEFAULT_SECRET_KEY = "change-me-in-production"
MIN_PROD_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    # Later files win, so backend/.env overrides the repo-root .env.
    model_config = SettingsConfigDict(
        env_file=(_REPO_ROOT / ".env", _BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Defaults to "prod" so a missing variable never enables dev-only behaviour.
    ENV: Literal["dev", "prod"] = "prod"
    TESTING: bool = False

    # Dev-only seed admin; ignored unless ENV == "dev" and both are set.
    SEED_ADMIN_EMAIL: str | None = None
    SEED_ADMIN_PASSWORD: str | None = None

    DATABASE_URL: str = "postgresql://colloq_user:colloq_password@localhost:5432/colloq_dev"

    SECRET_KEY: str = INSECURE_DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    # Set when the frontend and the API run on different subdomains (e.g. ".example.com"),
    # so the frontend can read the csrf_token cookie. Leave empty for a single host.
    COOKIE_DOMAIN: str | None = None

    # Served publicly under /uploads (images).
    UPLOAD_DIR: str = str(_REPO_ROOT / "uploads")
    # Never mounted: note attachments, served only through the authenticated download endpoint.
    PRIVATE_UPLOAD_DIR: str = str(_REPO_ROOT / "private_uploads")
    API_URL: str = "http://localhost:8000"

    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    MAX_IMAGE_SIZE: int = 5 * 1024 * 1024

    RATE_LIMIT_PER_MINUTE: str = "60/minute"
    # Counters live in this process by default. With several uvicorn workers or
    # replicas use shared storage, e.g. redis://redis:6379/0 (needs the `redis` package).
    RATE_LIMIT_STORAGE_URI: str = "memory://"
    # Kept as a comma-separated string: pydantic-settings would expect JSON for list[str].
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,"
        "http://127.0.0.1:3000,http://localhost:4173,http://frontend:5173"
    )

    @field_validator("ENV", mode="before")
    @classmethod
    def _normalize_env(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("API_URL")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def validate_secret_key(self) -> None:
        """Refuse to start with an insecure SECRET_KEY. Called on application startup."""
        if self.SECRET_KEY == INSECURE_DEFAULT_SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY is set to the insecure default value. "
                "Set the SECRET_KEY environment variable to a secure random string."
            )
        if self.ENV == "prod" and len(self.SECRET_KEY) < MIN_PROD_SECRET_KEY_LENGTH:
            raise RuntimeError(
                f"SECRET_KEY must be at least {MIN_PROD_SECRET_KEY_LENGTH} characters long when ENV=prod."
            )


settings = Settings()
