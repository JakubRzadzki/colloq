"""Reports of hidden notes and the home leaderboard."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.models import Note, University, User


def _user(db_session, email: str) -> User:
    user = User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"))
    db_session.add(user)
    db_session.commit()
    return user


def _headers(client: TestClient, email: str) -> dict:
    r = client.post("/token", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Reports Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


def test_reporting_a_hidden_note_returns_404(client, db_session, university):
    author = _user(db_session, "hidden_author@example.com")
    reporter = _user(db_session, "reporter@example.com")
    note = Note(title="Pending", user_id=author.id, university_id=university.id, is_approved=False)
    db_session.add(note)
    db_session.commit()

    resp = client.post("/reports", json={"note_id": note.id, "reason": "spam"}, headers=_headers(client, reporter.email))

    assert resp.status_code == 404


def test_reporting_a_visible_note_works(client, db_session, university):
    author = _user(db_session, "visible_author@example.com")
    reporter = _user(db_session, "reporter2@example.com")
    note = Note(title="Public", user_id=author.id, university_id=university.id, is_approved=True)
    db_session.add(note)
    db_session.commit()

    resp = client.post("/reports", json={"note_id": note.id, "reason": "spam"}, headers=_headers(client, reporter.email))

    assert resp.status_code == 200


def test_leaderboard_counts_only_approved_notes(client, db_session, university):
    leader = _user(db_session, "leader@example.com")
    leader.reputation_points = 10_000
    db_session.add_all([
        Note(title="Approved", user_id=leader.id, university_id=university.id, is_approved=True),
        Note(title="Pending", user_id=leader.id, university_id=university.id, is_approved=False),
    ])
    db_session.commit()

    board = client.get("/home").json()["leaderboard"]["leaderboard"]
    entry = next(e for e in board if e["user_id"] == leader.id)

    assert entry["notes_count"] == 1
