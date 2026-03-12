"""
Database engine and session management.
Sync SQLAlchemy: SessionLocal and get_db for FastAPI dependency.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

kwargs = {}
if "sqlite" in settings.DATABASE_URL:
    kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=("sqlite" not in settings.DATABASE_URL),
    **kwargs
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped DB session. Use as FastAPI Depends(get_db)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
