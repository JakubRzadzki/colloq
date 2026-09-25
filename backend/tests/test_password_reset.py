"""
Regression tests for password reset: tokens are stored hashed, are single-use,
are invalidated by newer requests and expire.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash, verify_password
from app.models import PasswordResetToken, User
from app.routers import password_reset
from app.routers.password_reset import create_reset_token

NEW_PASSWORD = "brand-new-password"


@pytest.fixture
def user(db_session) -> User:
    u = User(email="reset@example.com", nickname="reset", hashed_password=get_password_hash("old-password"))
    db_session.add(u)
    db_session.commit()
    return u


def _reset(client: TestClient, token: str):
    return client.post("/reset-password", json={"token": token, "new_password": NEW_PASSWORD})


def test_raw_token_is_not_stored(db_session, user):
    raw = create_reset_token(db_session, user)

    stored = db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).one()
    assert stored.token != raw
    assert stored.token == hashlib.sha256(raw.encode()).hexdigest()


def test_forgot_password_does_not_log_or_store_raw_token(client, db_session, user, monkeypatch, caplog, capsys):
    raw = "known-raw-token-value"
    monkeypatch.setattr(password_reset.secrets, "token_urlsafe", lambda _n: raw)

    with caplog.at_level(logging.DEBUG):
        resp = client.post("/forgot-password", json={"email": user.email})

    assert resp.status_code == 200
    assert raw not in caplog.text
    assert raw not in capsys.readouterr().out
    assert db_session.query(PasswordResetToken).filter(PasswordResetToken.token == raw).count() == 0
    assert db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).count() == 1


def test_reset_with_raw_token_succeeds(client, db_session, user):
    raw = create_reset_token(db_session, user)

    resp = _reset(client, raw)

    assert resp.status_code == 200
    db_session.refresh(user)
    assert verify_password(NEW_PASSWORD, user.hashed_password)


def test_token_cannot_be_reused(client, db_session, user):
    raw = create_reset_token(db_session, user)
    assert _reset(client, raw).status_code == 200

    assert _reset(client, raw).status_code == 400


def test_old_token_invalid_after_new_request(client, db_session, user):
    old = create_reset_token(db_session, user)
    new = create_reset_token(db_session, user)

    assert _reset(client, old).status_code == 400
    assert _reset(client, new).status_code == 200


def test_successful_reset_invalidates_all_user_tokens(client, db_session, user):
    raw = create_reset_token(db_session, user)
    assert _reset(client, raw).status_code == 200

    unused = db_session.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used.is_(False)
    ).count()
    assert unused == 0


def test_expired_token_is_rejected(client, db_session, user):
    raw = create_reset_token(db_session, user)
    stored = db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).one()
    stored.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    assert _reset(client, raw).status_code == 400
