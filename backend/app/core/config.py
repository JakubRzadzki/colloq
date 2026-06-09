"""
Application configuration loaded from environment variables.
Defaults to PostgreSQL database and local uploads directory.
"""
from __future__ import annotations

import os
from dotenv import load_dotenv

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
load_dotenv(os.path.join(_BASE_DIR, ".env")) # Wymuszamy załadowanie .env

class Settings:
    """Centralized settings. Load from .env or environment."""

    # Database: default PostgreSQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://colloq_user:colloq_password@localhost:5432/colloq_dev"
    )

    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    
    def validate_secret_key(self):
        """Validate that SECRET_KEY is not using the insecure default."""
        if self.SECRET_KEY == "change-me-in-production":
            raise RuntimeError(
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
