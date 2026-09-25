"""
Regression tests for upload handling: size limits, error codes and stored path
normalization.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Faculty, University, User


@pytest.fixture
def admin_headers(client: TestClient, db_session) -> dict:
    db_session.add(User(
        email="uploads_admin@example.com",
        nickname="uploads_admin",
        hashed_password=get_password_hash("adminpass123"),
        is_admin=True,
    ))
    db_session.commit()
    r = client.post("/token", data={"username": "uploads_admin@example.com", "password": "adminpass123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Uploads Uni", city="City", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


def test_note_attachment_over_size_limit_is_rejected(client, admin_headers, university, monkeypatch):
    monkeypatch.setattr(settings, "MAX_FILE_SIZE", 10)

    resp = client.post(
        "/notes",
        data={"title": "Too big", "university_id": university.id},
        files={"files": ("big.pdf", b"x" * 11, "application/pdf")},
        headers=admin_headers,
    )

    assert resp.status_code == 400
