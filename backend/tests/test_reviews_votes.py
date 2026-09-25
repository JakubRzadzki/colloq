"""Reviews and votes: targets, ownership, uniqueness and aggregate ratings."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.security import get_password_hash
from app.models import Note, University, User
from app.repositories.note_repository import NoteRepository
from app.services.reputation import REVIEW_RECEIVED, VOTE_RECEIVED


def _user(db_session, email: str) -> User:
    user = User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"))
    db_session.add(user)
    db_session.commit()
    return user


def _headers(client: TestClient, email: str) -> dict:
    r = client.post("/token", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def author(db_session) -> User:
    return _user(db_session, "rv_author@example.com")


@pytest.fixture
def author_headers(client, author) -> dict:
    return _headers(client, author.email)


@pytest.fixture
def reader_headers(client, db_session) -> dict:
    return _headers(client, _user(db_session, "rv_reader@example.com").email)


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Review Uni", city="City", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


@pytest.fixture
def note(db_session, author, university) -> Note:
    n = Note(title="Reviewed", user_id=author.id, university_id=university.id, is_approved=True)
    db_session.add(n)
    db_session.commit()
    return n


# --- reviews -----------------------------------------------------------------------

@pytest.mark.parametrize("payload", [{"rating": 5}, {"rating": 5, "note_id": 1, "university_id": 1}])
def test_review_needs_exactly_one_target(client, reader_headers, payload):
    assert client.post("/reviews", json=payload, headers=reader_headers).status_code == 422


@pytest.mark.parametrize("target", ["note_id", "university_id"])
def test_review_of_missing_target_returns_404(client, reader_headers, target):
    assert client.post("/reviews", json={"rating": 5, target: 999_999}, headers=reader_headers).status_code == 404


def test_double_review_of_note_returns_409(client, reader_headers, note):
    assert client.post("/reviews", json={"rating": 5, "note_id": note.id}, headers=reader_headers).status_code == 200
    assert client.post("/reviews", json={"rating": 1, "note_id": note.id}, headers=reader_headers).status_code == 409


def test_double_review_of_university_returns_409(client, reader_headers, university):
    body = {"rating": 4, "university_id": university.id}
    assert client.post("/reviews", json=body, headers=reader_headers).status_code == 200
    assert client.post("/reviews", json=body, headers=reader_headers).status_code == 409


def test_review_own_note_returns_403(client, author_headers, note):
    assert client.post("/reviews", json={"rating": 5, "note_id": note.id}, headers=author_headers).status_code == 403


def test_note_rating_is_aggregated_in_sql(client, db_session, reader_headers, note, author):
    other = _headers(client, _user(db_session, "rv_other@example.com").email)
    client.post("/reviews", json={"rating": 5, "note_id": note.id}, headers=reader_headers)
    client.post("/reviews", json={"rating": 2, "note_id": note.id}, headers=other)

    db_session.refresh(note)
    db_session.refresh(author)
    assert note.avg_rating == 3.5
    assert note.rating_count == 2
    assert author.reputation_points == 2 * REVIEW_RECEIVED


# --- votes ----------------------------------------------------------------------------

def test_vote_on_own_note_returns_403(client, author_headers, note):
    assert client.post(f"/notes/{note.id}/vote", headers=author_headers).status_code == 403


def test_vote_gives_and_takes_back_author_reputation(client, db_session, reader_headers, note, author):
    client.post(f"/notes/{note.id}/vote", headers=reader_headers)
    db_session.refresh(author)
    assert author.reputation_points == VOTE_RECEIVED

    client.post(f"/notes/{note.id}/vote", headers=reader_headers)
    db_session.refresh(author)
    assert author.reputation_points == 0


def test_concurrent_duplicate_vote_returns_409(client, reader_headers, note, monkeypatch):
    assert client.post(f"/notes/{note.id}/vote", headers=reader_headers).status_code == 200
    # The second request does not see the first vote yet, as in a race; the DB constraint catches it.
    monkeypatch.setattr(NoteRepository, "get_vote", lambda self, user_id, note_id: None)

    resp = client.post(f"/notes/{note.id}/vote", headers=reader_headers)

    assert resp.status_code == 409


def test_integrity_error_is_the_race_signal(db_session, note, author):
    """Sanity check that uq_user_vote really rejects a second row."""
    from app.models import Vote

    db_session.add_all([Vote(user_id=author.id, note_id=note.id), Vote(user_id=author.id, note_id=note.id)])
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
