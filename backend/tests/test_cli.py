"""Tests for the `python -m app.cli create-admin` management command."""
import pytest

from app.cli import create_admin
from app.core.security import get_password_hash, verify_password
from app.models import User


def test_create_admin_creates_new_admin(db_session):
    user, created = create_admin(db_session, "New.Admin@Example.com", "strong-password-1")

    assert created is True
    assert user.email == "new.admin@example.com"
    assert user.is_admin is True
    assert verify_password("strong-password-1", user.hashed_password)


def test_create_admin_promotes_existing_user_and_resets_password(db_session):
    existing = User(email="someone@example.com", nickname="someone", hashed_password=get_password_hash("old-password"))
    db_session.add(existing)
    db_session.commit()

    user, created = create_admin(db_session, "someone@example.com", "new-password-1")

    assert created is False
    assert user.id == existing.id
    assert user.is_admin is True
    assert verify_password("new-password-1", user.hashed_password)
    assert db_session.query(User).filter(User.email == "someone@example.com").count() == 1


@pytest.mark.parametrize("password", ["short", "x" * 73])
def test_create_admin_rejects_invalid_password(db_session, password):
    with pytest.raises(ValueError):
        create_admin(db_session, "bad@example.com", password)
