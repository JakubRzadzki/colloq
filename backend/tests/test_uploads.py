"""
Regression tests for upload handling: size limits, error codes and stored path
normalization.
"""
import pytest
from fastapi.testclient import TestClient

from pathlib import Path

from app.core.config import settings
from app.services.file_manager import delete_file, resolve_physical_path
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


def test_create_university_with_disallowed_image_returns_400(client, admin_headers):
    resp = client.post(
        "/universities",
        data={"name": "Bad Image Uni", "city": "City"},
        files={"image": ("logo.html", b"<script>alert(1)</script>", "text/html")},
        headers=admin_headers,
    )

    assert resp.status_code == 400


def test_faculty_https_image_url_is_returned_unchanged(client, db_session, university):
    url = "https://example.com/a.png"
    db_session.add(Faculty(name="Remote Logo Faculty", image_url=url, university_id=university.id, is_approved=True))
    db_session.commit()

    resp = client.get(f"/universities/{university.id}/faculties")

    assert resp.status_code == 200
    assert [f["image_url"] for f in resp.json()] == [url]


@pytest.mark.parametrize("stored", ["/uploads/notes/pic.png", "notes/pic.png"])
def test_delete_file_resolves_stored_urls_inside_upload_dir(stored):
    target = Path(settings.UPLOAD_DIR) / "notes" / "pic.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"x")

    assert delete_file(stored) is True
    assert not target.exists()


@pytest.mark.parametrize("path", ["../../etc/passwd", "notes/../../outside.txt", "/../outside.txt"])
def test_resolve_physical_path_rejects_traversal(path):
    with pytest.raises(ValueError):
        resolve_physical_path(path)


def test_resolve_physical_path_keeps_paths_inside_upload_dir():
    resolved = resolve_physical_path("notes/1/file.pdf")

    assert resolved.is_relative_to(Path(settings.UPLOAD_DIR).resolve())
    assert resolved.name == "file.pdf"


def test_delete_file_does_not_touch_files_outside_upload_dir():
    outside = Path(settings.UPLOAD_DIR).parent / "outside.txt"
    outside.write_text("keep me")

    assert delete_file("../outside.txt") is False
    assert outside.exists()
