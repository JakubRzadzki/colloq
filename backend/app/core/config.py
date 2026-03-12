"""
Application configuration loaded from environment variables.
Defaults to local SQLite and local uploads directory.
"""
from __future__ import annotations

import os

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class Settings:
    """Centralized settings. Load from .env or environment."""

    # Database: default SQLite (local file); set DATABASE_URL for PostgreSQL
    _raw_db: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(_BASE_DIR, "data", "colloq.db").replace("\\", "/"),
    )
    DATABASE_URL: str = _raw_db

    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    
    def validate_secret_key(self):
        """Validate that SECRET_KEY is not using the insecure default."""
        if self.SECRET_KEY == "change-me-in-production":
            raise ValueError(
                "SECRET_KEY is set to the insecure default value. "
                "Set the SECRET_KEY environment variable to a secure random string."
            )

    # Local file storage: base directory for uploads (universities, notes, avatars)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(_BASE_DIR, "uploads"))
    API_URL: str = os.getenv("API_URL", "http://localhost:8000").rstrip("/")
    
    # File upload limits (in bytes)
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", "5242880"))  # 5MB default
    
    # Rate Limiting & Security
    RATE_LIMIT_PER_MINUTE: str = os.getenv("RATE_LIMIT_PER_MINUTE", "60/minute")
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://frontend:5173"
    ).split(",")


settings = Settings()
