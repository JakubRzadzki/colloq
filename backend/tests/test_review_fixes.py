"""
Regression tests for the code-review fixes:
  C1 - public endpoints must not leak user emails
  C3 - votes and reviews write to separate fields (score vs avg_rating)
  C4 - regular users' content needs admin approval before it is public
"""
import pytest
from fastapi.testclient import TestClient


def _make_admin(db_session, email="rf_admin@example.com", password="adminpass123"):
    from app.models import User
    from app.core.security import get_password_hash

    admin = User(
        email=email,
        nickname=email.split("@")[0],
        hashed_password=get_password_hash(password),
        is_admin=True,
    )
    db_session.add(admin)
    db_session.commit()
    return password


@pytest.fixture
def admin_headers(client: TestClient, db_session):
    password = _make_admin(db_session)
    r = client.post("/token", data={"username": "rf_admin@example.com", "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def regular_headers(client: TestClient):
    client.post(
        "/register",
        json={"user": {"email": "rf_user@example.com", "password": "userpass123", "university_id": None}},
    )
    r = client.post("/token", data={"username": "rf_user@example.com", "password": "userpass123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def university_id(client: TestClient, admin_headers: dict) -> int:
    r = client.post(
        "/universities",
        data={"name": "RF Uni", "city": "City", "region": "", "country": "Poland"},
        headers=admin_headers,
    )
    return r.json()["id"]


def test_c1_notes_listing_has_no_email(client: TestClient, admin_headers: dict, university_id: int):
    """GET /notes must not expose any email field in the response tree."""
    client.post(
        "/notes",
        data={"title": "Visible", "content": "Body", "university_id": university_id},
        headers=admin_headers,
    )
    resp = client.get(f"/notes?university_id={university_id}")
    assert resp.status_code == 200
    assert "email" not in resp.text  # no author email anywhere in the JSON


def test_c4_regular_user_note_is_pending(client: TestClient, admin_headers: dict, regular_headers: dict, university_id: int):
    """A regular user's note is hidden from public listing but appears in pending_items."""
    created = client.post(
        "/notes",
        data={"title": "Needs approval", "content": "Body", "university_id": university_id},
        headers=regular_headers,
    )
    assert created.status_code == 200
    note_id = created.json()["id"]
    assert created.json()["is_approved"] is False

    # Not in public listing
    public = client.get(f"/notes?university_id={university_id}")
    assert all(n["id"] != note_id for n in public.json()["items"])

    # Present in admin pending items
    pending = client.get("/admin/pending_items", headers=admin_headers)
    assert any(n["id"] == note_id for n in pending.json()["notes"])


def test_h4_rejects_disallowed_file_type(client: TestClient, admin_headers: dict, university_id: int):
    """Uploading a .html attachment is rejected with HTTP 400."""
    resp = client.post(
        "/notes",
        data={"title": "Bad upload", "university_id": university_id},
        files={"files": ("evil.html", b"<script>alert(1)</script>", "text/html")},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_c3_vote_and_review_write_separate_fields(client: TestClient, admin_headers: dict, university_id: int):
    """Voting changes score (not avg_rating); reviewing changes avg_rating (not score)."""
    created = client.post(
        "/notes",
        data={"title": "Scored", "content": "Body", "university_id": university_id},
        headers=admin_headers,
    )
    note_id = created.json()["id"]

    # Vote: score goes up, avg_rating untouched
    client.post(f"/notes/{note_id}/vote", headers=admin_headers)
    after_vote = client.get(f"/notes/{note_id}").json()
    assert after_vote["score"] == 1.0
    assert after_vote["avg_rating"] == 0.0
    assert after_vote["rating_count"] == 0

    # Review: avg_rating goes up, score untouched
    client.post("/reviews", json={"rating": 4, "note_id": note_id}, headers=admin_headers)
    after_review = client.get(f"/notes/{note_id}").json()
    assert after_review["avg_rating"] == 4.0
    assert after_review["rating_count"] == 1
    assert after_review["score"] == 1.0
