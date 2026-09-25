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

# create_savepoint: session.commit()/rollback() inside the code under test only
# release/roll back a SAVEPOINT, so the outer per-test transaction stays intact.
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, join_transaction_mode="create_savepoint"
)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create the schema once for the whole test session."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path, monkeypatch):
    """Keep files written by tests out of the real uploads directory."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path / "uploads"))


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Run each test inside a transaction that is rolled back afterwards, so tests do not leak data."""
    connection = engine.connect()
    transaction = connection.begin()
    
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient whose get_db dependency yields the per-test session."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
