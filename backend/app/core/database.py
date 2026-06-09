"""
Database engine and session management.
Sync SQLAlchemy: SessionLocal and get_db for FastAPI dependency.
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

# Profesjonalna konfiguracja pule połączeń z PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,             # Ilość permanentnie otwartych połączeń
    max_overflow=20,          # Dodatkowe połączenia gdy aplikacja się przeciąży
    pool_pre_ping=True,       # Pinguje bazę przed użyciem z puli (zapobiega zerwanym połączeniom!)
    pool_recycle=1800         # Resetuje połączenie co 30 min (idealne dla AWS RDS / chmury)
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
