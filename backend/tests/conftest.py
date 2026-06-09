"""
Pytest fixtures: temporary PostgreSQL DB, test client, and dependencies override.
"""
import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Mark this process as a test run BEFORE importing the app so that the rate
# limiter is disabled and secret-key enforcement is skipped.
os.environ["TESTING"] = "1"

# Use the test PostgreSQL database. Honour an externally-provided DATABASE_URL
# (e.g. in CI) and fall back to the local default otherwise.
os.environ.setdefault("DATABASE_URL", "postgresql://colloq_user:colloq_password@localhost:5432/colloq_test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-minimum-32-chars")

from app.core.database import Base, get_db
from app.main import app

test_engine_url = os.environ["DATABASE_URL"]
engine = create_engine(test_engine_url, pool_pre_ping=True)

# Dla testów sessionmaker bez autocommitu
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Tworzy schemat bazy DOKŁADNIE RAZ przed wszystkimi testami"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Szybkie czyszczenie danych: odpala wszystko w transakcji, która na koniec robi ROLLBACK"""
    connection = engine.connect()
    transaction = connection.begin()
    
    # Tworzymy sesję przypiętą do konkretnego połączenia i transakcji
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback() # Dane dodane w teście magicznie znikają!
        connection.close()

@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient z podmienioną bazą. Tabele i schemat już istnieją."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
