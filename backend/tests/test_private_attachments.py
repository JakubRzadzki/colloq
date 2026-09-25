"""
Note attachments are private: stored outside the public /uploads mount and served
only through the authenticated download endpoint to users who can see the note.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Note, NoteFile, University, User
from app.scripts.move_note_attachments import move_note_attachments

PDF = b"%PDF-1.4 test attachment"


def _user(db_session, email: str, is_admin: bool = False) -> User:
    user = User(email=email, nickname=email.split("@")[0], hashed_password=get_password_hash("password123"), is_admin=is_admin)
    db_session.add(user)
    db_session.commit()
    return user


def _headers(client: TestClient, email: str) -> dict:
    r = client.post("/token", data={"username": email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Private Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


@pytest.fixture
def admin_headers(client, db_session) -> dict:
    return _headers(client, _user(db_session, "pa_admin@example.com", is_admin=True).email)


@pytest.fixture
def reader_headers(client, db_session) -> dict:
    return _headers(client, _user(db_session, "pa_reader@example.com").email)


def _create_note(client, headers, university) -> dict:
    resp = client.post(
        "/notes",
        data={"title": "With attachment", "university_id": university.id},
        files={"files": ("lecture.pdf", PDF, "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_attachment_is_stored_privately_and_exposed_as_download_url(client, db_session, admin_headers, university):
    note = _create_note(client, admin_headers, university)
    out = note["files"][0]

    assert out["download_url"] == f"/notes/{note['id']}/download/{out['id']}"
    assert "file_url" not in out
    stored = db_session.get(NoteFile, out["id"]).file_url
    assert (Path(settings.PRIVATE_UPLOAD_DIR) / stored).is_file()
    assert not (Path(settings.UPLOAD_DIR) / stored).exists()
    assert client.get(f"/uploads/{stored}").status_code == 404


def test_download_requires_login(client, admin_headers, university):
    note = _create_note(client, admin_headers, university)

    assert client.get(note["files"][0]["download_url"]).status_code == 401


def test_download_counts_and_returns_file(client, db_session, admin_headers, reader_headers, university):
    note = _create_note(client, admin_headers, university)

    resp = client.get(note["files"][0]["download_url"], headers=reader_headers)

    assert resp.status_code == 200
    assert resp.content == PDF
    assert resp.headers["content-type"] == "application/octet-stream"
    assert db_session.get(Note, note["id"]).download_count == 1


def test_inline_preview_uses_media_type_and_is_not_counted(client, db_session, admin_headers, reader_headers, university):
    note = _create_note(client, admin_headers, university)

    resp = client.get(note["files"][0]["download_url"], params={"inline": "true"}, headers=reader_headers)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.headers["content-disposition"].startswith("inline")
    assert (db_session.get(Note, note["id"]).download_count or 0) == 0


def test_download_of_pending_note_is_hidden_from_other_users(client, db_session, reader_headers, university):
    author = _user(db_session, "pa_author@example.com")
    author_headers = _headers(client, author.email)
    note = _create_note(client, author_headers, university)
    assert note["is_approved"] is False
    url = note["files"][0]["download_url"]

    assert client.get(url, headers=reader_headers).status_code == 404
    assert client.get(url, headers=author_headers).status_code == 200


def test_download_rejects_stored_path_outside_private_dir(client, db_session, admin_headers, reader_headers, university):
    note = _create_note(client, admin_headers, university)
    file_row = db_session.get(NoteFile, note["files"][0]["id"])
    file_row.file_url = "../../etc/passwd"
    db_session.commit()

    assert client.get(note["files"][0]["download_url"], headers=reader_headers).status_code == 404


def test_legacy_public_attachment_is_still_downloadable(client, db_session, admin_headers, reader_headers, university):
    note = _create_note(client, admin_headers, university)
    stored = db_session.get(NoteFile, note["files"][0]["id"]).file_url
    legacy = Path(settings.UPLOAD_DIR) / stored
    legacy.parent.mkdir(parents=True, exist_ok=True)
    (Path(settings.PRIVATE_UPLOAD_DIR) / stored).replace(legacy)

    assert client.get(note["files"][0]["download_url"], headers=reader_headers).status_code == 200


# --- migration script -----------------------------------------------------------

def test_move_note_attachments_is_idempotent(tmp_path):
    public, private = tmp_path / "public", tmp_path / "private"
    (public / "notes" / "12").mkdir(parents=True)
    (public / "notes" / "12" / "a_file.pdf").write_bytes(b"a")
    (public / "notes" / "cover.png").write_bytes(b"img")  # a note image, stays public
    (private / "notes" / "13").mkdir(parents=True)
    (private / "notes" / "13" / "b_file.pdf").write_bytes(b"b")
    (public / "notes" / "13").mkdir()
    (public / "notes" / "13" / "b_file.pdf").write_bytes(b"b")  # leftover of an interrupted run

    first = move_note_attachments(public, private)
    second = move_note_attachments(public, private)

    assert first == {"moved": 1, "already_private": 1}
    assert second == {"moved": 0, "already_private": 0}
    assert (private / "notes" / "12" / "a_file.pdf").read_bytes() == b"a"
    assert not (public / "notes" / "12").exists()
    assert not (public / "notes" / "13").exists()
    assert (public / "notes" / "cover.png").exists()


def test_move_note_attachments_dry_run_changes_nothing(tmp_path):
    public, private = tmp_path / "public", tmp_path / "private"
    (public / "notes" / "5").mkdir(parents=True)
    (public / "notes" / "5" / "x.pdf").write_bytes(b"x")

    assert move_note_attachments(public, private, dry_run=True) == {"moved": 1, "already_private": 0}
    assert (public / "notes" / "5" / "x.pdf").exists()
    assert not private.exists()
