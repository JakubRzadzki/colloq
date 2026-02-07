"""
Application configuration via environment variables.
Uses pydantic-settings for validation and type safety (optional fallback to os.getenv).
"""
from __future__ import annotations

import os
from typing import Optional


class Settings:
    """Centralized settings. Extend with pydantic-settings if desired."""

    # Database (async: use postgresql+asyncpg)
    _raw_db: str = os.getenv(
        "DATABASE_URL",
        "postgresql://colloq:colloq123@localhost:5432/colloq",
    )
    DATABASE_URL: str = (
        _raw_db if _raw_db.startswith("postgresql+asyncpg") else _raw_db.replace("postgresql://", "postgresql+asyncpg://", 1)
    )

    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # S3 / object storage (optional; when missing, presigned URLs are mocked)
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = os.getenv("AWS_REGION", "eu-central-1")
    S3_BUCKET: Optional[str] = os.getenv("S3_BUCKET")
    S3_UPLOAD_PREFIX: str = os.getenv("S3_UPLOAD_PREFIX", "uploads")

    @property
    def s3_configured(self) -> bool:
        return bool(self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY and self.S3_BUCKET)


settings = Settings()
