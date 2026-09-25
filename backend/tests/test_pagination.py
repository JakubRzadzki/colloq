"""limit/offset pagination with X-Total-Count for comments and admin listings."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.models import Comment, Feedback, Note, Report, University, User


@pytest.fixture
def admin(db_session) -> User:
    user = User(email="pg_admin@example.com", nickname="pg_admin", hashed_password=get_password_hash("password123"), is_admin=True)
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def headers(client: TestClient, admin) -> dict:
    r = client.post("/token", data={"username": admin.email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def note(db_session, admin) -> Note:
    uni = University(name="PG Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.flush()
    n = Note(title="Paged", user_id=admin.id, university_id=uni.id, is_approved=True)
    db_session.add(n)
    db_session.commit()
    return n


def test_comments_are_paginated(client, db_session, note, admin):
    db_session.add_all([Comment(content=f"c{i}", user_id=admin.id, note_id=note.id) for i in range(7)])
    db_session.commit()

    first = client.get(f"/notes/{note.id}/comments", params={"limit": 3})
    rest = client.get(f"/notes/{note.id}/comments", params={"limit": 3, "offset": 6})

    assert first.status_code == 200
    assert isinstance(first.json(), list) and len(first.json()) == 3
    assert first.headers["x-total-count"] == "7"
    assert len(rest.json()) == 1


def test_default_page_size_is_50(client, db_session, note, admin):
    db_session.add_all([Comment(content=f"c{i}", user_id=admin.id, note_id=note.id) for i in range(55)])
    db_session.commit()

    resp = client.get(f"/notes/{note.id}/comments")

    assert len(resp.json()) == 50
    assert resp.headers["x-total-count"] == "55"


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}])
def test_invalid_page_params_return_422(client, headers, params):
    assert client.get("/admin/users", params=params, headers=headers).status_code == 422


def test_admin_users_paginated(client, db_session, headers):
    db_session.add_all([User(email=f"pg{i}@example.com", nickname=f"pg{i}", hashed_password="x") for i in range(4)])
    db_session.commit()

    resp = client.get("/admin/users", params={"limit": 2}, headers=headers)

    assert len(resp.json()) == 2
    assert int(resp.headers["x-total-count"]) >= 5


def test_admin_reports_paginated_with_status_filter(client, db_session, headers, admin, note):
    db_session.add_all([Report(reporter_id=admin.id, note_id=note.id, reason="spam", status="pending") for _ in range(3)])
    db_session.add(Report(reporter_id=admin.id, note_id=note.id, reason="old", status="resolved"))
    db_session.commit()

    resp = client.get("/admin/reports", params={"limit": 2, "status_filter": "pending"}, headers=headers)

    assert len(resp.json()) == 2
    assert resp.headers["x-total-count"] == "3"


def test_admin_feedback_paginated(client, db_session, headers, admin):
    db_session.add_all([Feedback(user_id=admin.id, rating=5) for _ in range(3)])
    db_session.commit()

    resp = client.get("/admin/feedback", params={"offset": 1}, headers=headers)

    assert len(resp.json()) == 2
    assert resp.headers["x-total-count"] == "3"
