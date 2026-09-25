"""Registration and login rules."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.models import User
from app.services import auth_service
from app.services.auth_service import pick_free_nickname


def _register(client: TestClient, email: str, password: str = "password123", university_id=None):
    return client.post("/register", json={"user": {"email": email, "password": password, "university_id": university_id}})


def _login(client: TestClient, email: str, password: str = "password123"):
    return client.post("/token", data={"username": email, "password": password})


def test_register_stores_lowercase_email_and_login_is_case_insensitive(client):
    assert _register(client, "Mixed.Case@Example.COM").json()["email"] == "mixed.case@example.com"

    assert _login(client, "MIXED.case@example.com").status_code == 200


def test_register_same_email_different_case_is_rejected(client):
    _register(client, "dup-case@example.com")

    assert _register(client, "DUP-CASE@example.com").status_code == 400


def test_register_race_on_email_returns_409(client, monkeypatch):
    _register(client, "race@example.com")
    # Simulate the other request winning the race: the pre-check sees no user.
    monkeypatch.setattr(auth_service, "find_user_by_email", lambda db, email: None)

    assert _register(client, "race@example.com").status_code == 409


def test_register_rejects_password_over_72_bytes(client):
    assert _register(client, "long@example.com", password="ą" * 37).status_code == 422  # 74 bytes


def test_register_accepts_password_of_exactly_72_bytes(client):
    assert _register(client, "exact@example.com", password="x" * 72).status_code == 200


def test_register_with_missing_university_returns_404(client):
    assert _register(client, "nouni@example.com", university_id=999_999).status_code == 404


def test_register_picks_free_nickname(client, db_session):
    for nickname in ("student", "student1", "student2"):
        db_session.add(User(email=f"{nickname}@other.com", nickname=nickname, hashed_password="x"))
    db_session.commit()

    assert _register(client, "student@example.com").json()["nickname"] == "student3"


def test_pick_free_nickname_treats_wildcards_literally(db_session):
    db_session.add(User(email="a@x.com", nickname="a_b", hashed_password="x"))
    db_session.commit()

    assert pick_free_nickname(db_session, "a%") == "a%"
    assert pick_free_nickname(db_session, "a_b") == "a_b1"


@pytest.mark.parametrize("flag", ["is_banned", "is_active"])
def test_login_of_disabled_account_returns_403_without_token(client, db_session, flag):
    user = User(email=f"{flag}@example.com", nickname=flag, hashed_password=get_password_hash("password123"))
    setattr(user, flag, flag == "is_banned")
    db_session.add(user)
    db_session.commit()

    resp = _login(client, user.email)

    assert resp.status_code == 403
    assert "access_token" not in resp.json()


def test_login_unknown_email_still_verifies_a_password(client, monkeypatch):
    calls = []
    real_verify = auth_service.verify_password
    monkeypatch.setattr(auth_service, "verify_password", lambda p, h: calls.append(h) or real_verify(p, h))

    assert _login(client, "nobody@example.com").status_code == 401
    assert len(calls) == 1


def test_reset_password_validates_new_password_in_schema(client):
    resp = client.post("/reset-password", json={"token": "whatever", "new_password": "short"})

    assert resp.status_code == 422


def test_database_rejects_emails_differing_only_in_case(db_session):
    from sqlalchemy.exc import IntegrityError

    db_session.add(User(email="Case.Only@example.com", nickname="case_a", hashed_password="x"))
    db_session.commit()
    db_session.add(User(email="case.only@example.com", nickname="case_b", hashed_password="x"))

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_token_issued_for_mixed_case_email_still_authenticates(client, db_session):
    from app.core.security import create_access_token

    db_session.add(User(email="legacy@example.com", nickname="legacy", hashed_password=get_password_hash("password123")))
    db_session.commit()
    # Tokens issued before emails were normalized carry the original spelling.
    token = create_access_token({"sub": "Legacy@Example.com"})

    assert client.get("/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
