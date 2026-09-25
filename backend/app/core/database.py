"""
Database engine and session management.
Sync SQLAlchemy: SessionLocal and get_db for FastAPI dependency.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,          # extra connections allowed under load, closed when returned
    pool_pre_ping=True,       # detects connections dropped by the server before they are used
    pool_recycle=1800,        # recycle before managed databases/proxies close idle connections
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
