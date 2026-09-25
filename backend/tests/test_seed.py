"""
Regression tests for the startup seed: admin accounts must only be created in
dev, from explicitly provided credentials, and never duplicated.
"""
import pytest
from sqlalchemy import func

from app.core.config import settings
from app.core.security import verify_password
from app.models import University, User
from app.seed import PK_UNIVERSITY_NAME, run_seed

SEED_EMAIL = "seed-admin@example.com"
SEED_PASSWORD = "seed-admin-password-123"


@pytest.fixture
def seed_env(monkeypatch):
    def _set(env: str, email: str | None = SEED_EMAIL, password: str | None = SEED_PASSWORD):
        monkeypatch.setattr(settings, "ENV", env)
        monkeypatch.setattr(settings, "SEED_ADMIN_EMAIL", email)
        monkeypatch.setattr(settings, "SEED_ADMIN_PASSWORD", password)

    return _set


def _admin_count(db_session) -> int:
    return db_session.query(func.count(User.id)).filter(User.is_admin.is_(True)).scalar()


def test_prod_seed_creates_no_admin(db_session, seed_env):
    seed_env("prod")
    run_seed(db_session)

    assert _admin_count(db_session) == 0
    assert db_session.query(User).filter(User.email.in_(["admin@pk.edu.pl", "admin@colloq.pl"])).count() == 0
    # Reference data is still seeded in prod.
    assert db_session.query(University).filter(University.name == PK_UNIVERSITY_NAME).count() == 1


def test_dev_seed_without_credentials_creates_no_admin(db_session, seed_env):
    seed_env("dev", email=None, password=None)
    run_seed(db_session)

    assert _admin_count(db_session) == 0


def test_dev_seed_creates_exactly_one_admin(db_session, seed_env):
    seed_env("dev")
    run_seed(db_session)

    admins = db_session.query(User).filter(User.is_admin.is_(True)).all()
    assert [a.email for a in admins] == [SEED_EMAIL]
    assert verify_password(SEED_PASSWORD, admins[0].hashed_password)


def test_seed_twice_does_not_duplicate(db_session, seed_env):
    seed_env("dev")
    run_seed(db_session)
    run_seed(db_session)

    assert _admin_count(db_session) == 1
    assert db_session.query(University).filter(University.name == PK_UNIVERSITY_NAME).count() == 1
