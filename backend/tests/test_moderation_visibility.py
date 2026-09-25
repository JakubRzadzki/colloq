"""
Regression tests for moderation visibility: content with is_approved=False is
visible only to admins (and, for notes, to the author). Everyone else gets 404
and does not see it in listings.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.models import Faculty, FieldOfStudy, Note, Review, Subject, University, User


def _login(client: TestClient, email: str, password: str) -> dict:
    r = client.post("/token", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _user(db_session, email: str, is_admin: bool = False) -> User:
    u = User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"), is_admin=is_admin)
    db_session.add(u)
    db_session.commit()
    return u


@pytest.fixture
def author(db_session) -> User:
    return _user(db_session, "vis_author@example.com")


@pytest.fixture
def author_headers(client, author) -> dict:
    return _login(client, author.email, "password123")


@pytest.fixture
def other_headers(client, db_session) -> dict:
    u = _user(db_session, "vis_other@example.com")
    return _login(client, u.email, "password123")


@pytest.fixture
def admin_headers(client, db_session) -> dict:
    u = _user(db_session, "vis_admin@example.com", is_admin=True)
    return _login(client, u.email, "password123")


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Visibility Uni", city="City", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


@pytest.fixture
def pending_note(db_session, author, university) -> Note:
    note = Note(title="Secret pending note", content="Body", user_id=author.id, university_id=university.id, is_approved=False)
    db_session.add(note)
    db_session.commit()
    return note


# --- notes -------------------------------------------------------------------

def test_pending_note_hidden_from_anonymous(client, pending_note):
    assert client.get(f"/notes/{pending_note.id}").status_code == 404
    assert client.get(f"/notes/{pending_note.id}/comments").status_code == 404


def test_pending_note_hidden_from_other_user(client, pending_note, other_headers):
    assert client.get(f"/notes/{pending_note.id}", headers=other_headers).status_code == 404
    assert client.get(f"/notes/{pending_note.id}/comments", headers=other_headers).status_code == 404


def test_pending_note_visible_to_author(client, pending_note, author_headers):
    assert client.get(f"/notes/{pending_note.id}", headers=author_headers).status_code == 200
    assert client.get(f"/notes/{pending_note.id}/comments", headers=author_headers).status_code == 200


def test_pending_note_visible_to_admin(client, pending_note, admin_headers):
    assert client.get(f"/notes/{pending_note.id}", headers=admin_headers).status_code == 200
    assert client.get(f"/notes/{pending_note.id}/comments", headers=admin_headers).status_code == 200


def test_pending_note_not_on_home(client, db_session, pending_note, author):
    db_session.add(Review(rating=5, content="Review of pending note", user_id=author.id, note_id=pending_note.id))
    db_session.commit()

    data = client.get("/home").json()

    assert pending_note.id not in [n["id"] for n in data["recent_notes"]]
    assert data["stats"]["notes_count"] == 0
    latest = data["stats"]["latest_activity"]
    assert latest["latest_note"] is None
    assert latest["latest_review"] is None
    assert "Secret pending note" not in str(data["activity_feed"])
    assert "Review of pending note" not in str(data["activity_feed"])


# --- universities and hierarchy ----------------------------------------------

def test_pending_university_hidden_except_for_admin(client, db_session, admin_headers):
    uni = University(name="Pending Visibility Uni", city="City", region="", is_approved=False)
    db_session.add(uni)
    db_session.commit()

    assert client.get(f"/universities/{uni.id}").status_code == 404
    assert client.get(f"/universities/{uni.id}", headers=admin_headers).status_code == 200


@pytest.fixture
def hierarchy(db_session, university):
    """An approved faculty/field with a pending faculty, field and subject next to them."""
    faculty = Faculty(name="Approved Faculty", university_id=university.id, is_approved=True)
    pending_faculty = Faculty(name="Pendingfac Faculty", university_id=university.id, is_approved=False)
    db_session.add_all([faculty, pending_faculty])
    db_session.flush()
    field = FieldOfStudy(name="Approved Field", faculty_id=faculty.id, is_approved=True)
    pending_field = FieldOfStudy(name="Pendingfield Field", faculty_id=faculty.id, is_approved=False)
    db_session.add_all([field, pending_field])
    db_session.flush()
    pending_subject = Subject(name="Pendingsubj Subject", semester=1, field_of_study_id=field.id, is_approved=False)
    db_session.add(pending_subject)
    db_session.commit()
    return {"university": university, "faculty": faculty, "field": field}


def test_pending_hierarchy_items_not_listed(client, hierarchy):
    faculties = client.get(f"/universities/{hierarchy['university'].id}/faculties").json()
    fields = client.get(f"/faculties/{hierarchy['faculty'].id}/fields").json()
    subjects = client.get(f"/fields/{hierarchy['field'].id}/subjects").json()

    assert [f["name"] for f in faculties] == ["Approved Faculty"]
    assert [f["name"] for f in fields] == ["Approved Field"]
    assert subjects == []


def test_pending_hierarchy_items_not_in_global_search(client, hierarchy):
    for q in ("Pendingfield", "Pendingsubj"):
        data = client.get("/search/global", params={"q": q}).json()
        assert data["fields"] == []
        assert data["subjects"] == []
