"""Parent validation for created content and admin university updates."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Faculty, FieldOfStudy, University, User

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 16


def _headers(client: TestClient, db_session, email: str, is_admin: bool = False) -> dict:
    db_session.add(User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"), is_admin=is_admin))
    db_session.commit()
    r = client.post("/token", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def user_headers(client, db_session) -> dict:
    return _headers(client, db_session, "ur_user@example.com")


@pytest.fixture
def admin_headers(client, db_session) -> dict:
    return _headers(client, db_session, "ur_admin@example.com", is_admin=True)


@pytest.fixture
def pending_university(db_session) -> University:
    uni = University(name="Hidden Uni", city="C", region="", is_approved=False)
    db_session.add(uni)
    db_session.commit()
    return uni


def test_create_faculty_under_missing_university_returns_404(client, user_headers):
    resp = client.post("/faculties", data={"name": "F", "university_id": 999_999}, headers=user_headers)
    assert resp.status_code == 404


def test_create_faculty_under_pending_university_returns_404_for_users(client, user_headers, pending_university):
    resp = client.post("/faculties", data={"name": "F", "university_id": pending_university.id}, headers=user_headers)
    assert resp.status_code == 404


def test_admin_can_create_under_pending_parent(client, admin_headers, pending_university):
    resp = client.post("/faculties", data={"name": "F", "university_id": pending_university.id}, headers=admin_headers)
    assert resp.status_code == 200


def test_create_subject_under_pending_field_returns_404(client, db_session, user_headers):
    uni = University(name="U", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.flush()
    faculty = Faculty(name="F", university_id=uni.id, is_approved=True)
    db_session.add(faculty)
    db_session.flush()
    field = FieldOfStudy(name="Pending field", faculty_id=faculty.id, is_approved=False)
    db_session.add(field)
    db_session.commit()

    resp = client.post("/subjects", json={"name": "S", "semester": 1, "field_of_study_id": field.id}, headers=user_headers)
    assert resp.status_code == 404


@pytest.mark.parametrize("field", ["university_id", "subject_id"])
def test_create_note_with_missing_reference_returns_404(client, db_session, user_headers, field):
    uni = University(name="Note Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    data = {"title": "T", "university_id": uni.id, field: 999_999}

    assert client.post("/notes", data=data, headers=user_headers).status_code == 404


def test_admin_update_university_replaces_files_and_deletes_old_ones(client, db_session, admin_headers):
    old_image = "/uploads/universities/old-logo.png"
    old_path = Path(settings.UPLOAD_DIR) / "universities" / "old-logo.png"
    old_path.parent.mkdir(parents=True, exist_ok=True)
    old_path.write_bytes(PNG)
    uni = University(name="Old", city="C", region="", is_approved=True, image_url=old_image,
                     banner_url="https://example.com/banner.jpg")
    db_session.add(uni)
    db_session.commit()

    resp = client.put(
        f"/admin/universities/{uni.id}",
        data={"name": "  New name "},
        files=[("image", ("logo.png", PNG, "image/png")), ("banner", ("banner.png", PNG, "image/png"))],
        headers=admin_headers,
    )

    assert resp.status_code == 200
    body = resp.json()["university"]
    assert body["name"] == "New name"
    assert body["image_url"] != old_image
    assert not old_path.exists()
    assert (Path(settings.UPLOAD_DIR) / body["image_url"].removeprefix("/uploads/")).is_file()
