"""
Moderation: rejecting removes items and their local files, only pending items can
be moderated, image requests can be decided once, reputation is granted on approval.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Faculty, ImageRequest, Note, NoteFile, University, User
from app.services.moderation import HANDLERS, ItemType
from app.services.reputation import NOTE_APPROVED

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 16


def _user(db_session, email: str, is_admin: bool = False) -> User:
    user = User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"), is_admin=is_admin)
    db_session.add(user)
    db_session.commit()
    return user


def _login(client: TestClient, email: str) -> dict:
    r = client.post("/token", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _disk(stored: str) -> Path:
    if stored.startswith("/uploads/"):
        return Path(settings.UPLOAD_DIR) / stored.removeprefix("/uploads/")
    return Path(settings.PRIVATE_UPLOAD_DIR) / stored  # note attachments


@pytest.fixture
def author(db_session) -> User:
    return _user(db_session, "mod_author@example.com")


@pytest.fixture
def author_headers(client, author) -> dict:
    return _login(client, author.email)


@pytest.fixture
def admin_headers(client, db_session) -> dict:
    admin = _user(db_session, "mod_admin@example.com", is_admin=True)
    return _login(client, admin.email)


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Moderation Uni", city="City", region="", is_approved=True,
                     image_url="https://example.com/logo.png")
    db_session.add(uni)
    db_session.commit()
    return uni


@pytest.fixture
def pending_note_id(client, author_headers, university) -> int:
    resp = client.post(
        "/notes",
        data={"title": "Pending with files", "university_id": university.id},
        files=[("image", ("cover.png", PNG, "image/png")), ("files", ("notes.pdf", b"%PDF-1.4", "application/pdf"))],
        headers=author_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["is_approved"] is False
    return resp.json()["id"]


def test_handlers_cover_every_item_type():
    assert set(HANDLERS) == set(ItemType)


def test_reject_note_deletes_note_files_and_rows(client, db_session, admin_headers, pending_note_id):
    note = db_session.get(Note, pending_note_id)
    stored = [note.image_url] + [f.file_url for f in note.files]
    assert all(_disk(p).is_file() for p in stored)

    resp = client.delete(f"/admin/reject/note/{pending_note_id}", headers=admin_headers)

    assert resp.status_code == 200
    db_session.expire_all()
    assert db_session.get(Note, pending_note_id) is None
    assert db_session.query(NoteFile).filter(NoteFile.note_id == pending_note_id).count() == 0
    assert not any(_disk(p).exists() for p in stored)


def test_reject_university_deletes_cascaded_files_but_never_external_urls(client, db_session, admin_headers, monkeypatch):
    deleted: list[str] = []
    monkeypatch.setattr("app.services.file_manager.delete_file", lambda path: deleted.append(path) or True)
    uni = University(name="Pending Uni", city="C", region="", is_approved=False, image_url="https://cdn.example.com/u.png")
    db_session.add(uni)
    db_session.flush()
    db_session.add(Faculty(name="F", university_id=uni.id, image_url="/uploads/faculties/f.png", is_approved=False))
    owner = _user(db_session, "cascade_owner@example.com")
    db_session.add(Note(title="N", user_id=owner.id, university_id=uni.id, image_url="/uploads/notes/n.png", is_approved=False))
    db_session.commit()

    resp = client.delete(f"/admin/reject/university/{uni.id}", headers=admin_headers)

    assert resp.status_code == 200
    assert sorted(deleted) == ["/uploads/faculties/f.png", "/uploads/notes/n.png"]


def test_reject_approved_item_returns_409(client, db_session, admin_headers, university):
    resp = client.delete(f"/admin/reject/university/{university.id}", headers=admin_headers)

    assert resp.status_code == 409
    assert db_session.get(University, university.id) is not None


def test_approve_twice_returns_409(client, admin_headers, pending_note_id):
    assert client.post(f"/admin/approve/note/{pending_note_id}", headers=admin_headers).status_code == 200
    assert client.post(f"/admin/approve/note/{pending_note_id}", headers=admin_headers).status_code == 409


def test_unknown_item_type_is_rejected(client, admin_headers):
    assert client.post("/admin/approve/planet/1", headers=admin_headers).status_code == 422


# --- reputation ------------------------------------------------------------------

def test_reputation_granted_only_on_approval(client, db_session, author, admin_headers, pending_note_id):
    db_session.refresh(author)
    assert (author.reputation_points or 0) == 0
    assert (author.uploads_count or 0) == 0

    client.post(f"/admin/approve/note/{pending_note_id}", headers=admin_headers)

    db_session.refresh(author)
    assert author.reputation_points == NOTE_APPROVED
    assert author.uploads_count == 1


def test_admin_note_is_credited_immediately(client, db_session, university):
    admin = _user(db_session, "credited_admin@example.com", is_admin=True)
    headers = _login(client, admin.email)

    client.post("/notes", data={"title": "Admin note", "university_id": university.id}, headers=headers)

    db_session.refresh(admin)
    assert admin.reputation_points == NOTE_APPROVED
    assert admin.uploads_count == 1


# --- image requests ----------------------------------------------------------------

@pytest.fixture
def image_request_id(client, author_headers, university) -> int:
    resp = client.post(
        f"/universities/{university.id}/image_request",
        files={"image": ("logo.png", PNG, "image/png")},
        headers=author_headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_approve_rejected_image_request_returns_409(client, admin_headers, image_request_id):
    assert client.post(f"/admin/reject_image_request/{image_request_id}", headers=admin_headers).status_code == 200
    assert client.post(f"/admin/approve_image_request/{image_request_id}", headers=admin_headers).status_code == 409


def test_image_request_decided_only_once(client, admin_headers, image_request_id):
    assert client.post(f"/admin/approve_image_request/{image_request_id}", headers=admin_headers).status_code == 200
    assert client.post(f"/admin/reject_image_request/{image_request_id}", headers=admin_headers).status_code == 409


def test_approve_image_request_replaces_and_deletes_old_local_image(client, db_session, admin_headers, author_headers, university):
    old = "/uploads/universities/old.png"
    _disk(old).parent.mkdir(parents=True, exist_ok=True)
    _disk(old).write_bytes(PNG)
    university.image_url = old
    db_session.commit()
    req_id = client.post(
        f"/universities/{university.id}/image_request",
        files={"image": ("logo.png", PNG, "image/png")},
        headers=author_headers,
    ).json()["id"]

    assert client.post(f"/admin/approve_image_request/{req_id}", headers=admin_headers).status_code == 200

    db_session.expire_all()
    assert db_session.get(University, university.id).image_url == db_session.get(ImageRequest, req_id).new_image_url
    assert not _disk(old).exists()


def test_image_request_for_missing_university_writes_no_file(client, author_headers):
    resp = client.post(
        "/universities/999999/image_request",
        files={"image": ("logo.png", PNG, "image/png")},
        headers=author_headers,
    )

    assert resp.status_code == 404
    uploads = Path(settings.UPLOAD_DIR)
    assert not uploads.exists() or not any(p.is_file() for p in uploads.rglob("*"))


# --- deleting a university with dependent rows ------------------------------------

def test_reject_university_removes_its_image_requests_and_their_files(client, db_session, admin_headers, author):
    uni = University(name="Pending With Request", city="C", region="", is_approved=False)
    db_session.add(uni)
    db_session.flush()
    requested = "/uploads/universities/requested.png"
    _disk(requested).parent.mkdir(parents=True, exist_ok=True)
    _disk(requested).write_bytes(PNG)
    db_session.add(ImageRequest(university_id=uni.id, new_image_url=requested, submitted_by_id=author.id))
    db_session.commit()
    uni_id = uni.id

    resp = client.delete(f"/admin/reject/university/{uni_id}", headers=admin_headers)

    assert resp.status_code == 200
    db_session.expire_all()
    assert db_session.query(ImageRequest).filter(ImageRequest.university_id == uni_id).count() == 0
    assert not _disk(requested).exists()


def test_reject_university_keeps_users_registered_with_it(client, db_session, admin_headers):
    uni = University(name="Pending Home Uni", city="C", region="", is_approved=False)
    db_session.add(uni)
    db_session.flush()
    student = User(email="student-of-pending@example.com", nickname="pending_student",
                   hashed_password="x", university_id=uni.id)
    db_session.add(student)
    db_session.commit()

    resp = client.delete(f"/admin/reject/university/{uni.id}", headers=admin_headers)

    assert resp.status_code == 200
    db_session.expire_all()
    assert db_session.get(User, student.id).university_id is None
