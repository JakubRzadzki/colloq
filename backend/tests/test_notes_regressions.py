"""
HTTP-level regression tests for notes: LIKE escaping, file limits on update,
history, tag assignment, filter validation and N+1 queries.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.core.security import get_password_hash
from app.models import Note, NoteFile, NoteHistory, NoteTag, Tag, University, User, UserFavorite


@pytest.fixture
def owner(db_session) -> User:
    user = User(email="reg_owner@example.com", nickname="reg_owner", hashed_password=get_password_hash("password123"), is_admin=True)
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def headers(client: TestClient, owner) -> dict:
    r = client.post("/token", data={"username": owner.email, "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def university(db_session) -> University:
    uni = University(name="Regression Uni", city="City", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


def _note(db_session, owner, university, title="Note", content="Body") -> Note:
    note = Note(title=title, content=content, user_id=owner.id, university_id=university.id, is_approved=True)
    db_session.add(note)
    db_session.commit()
    return note


# --- LIKE escaping --------------------------------------------------------------

def test_notes_search_treats_wildcards_literally(client, db_session, owner, university):
    _note(db_session, owner, university, title="100% ready")
    _note(db_session, owner, university, title="Unrelated")

    items = client.get("/notes", params={"search": "%", "university_id": university.id}).json()["items"]

    assert [n["title"] for n in items] == ["100% ready"]


def test_global_search_treats_underscore_literally(client, db_session, owner, university):
    _note(db_session, owner, university, title="snake_case notes")
    _note(db_session, owner, university, title="snakeXcase notes")

    notes = client.get("/search/global", params={"q": "snake_case"}).json()["notes"]

    assert [n["title"] for n in notes] == ["snake_case notes"]


# --- update ------------------------------------------------------------------------

def test_update_rejects_files_over_limit_including_existing(client, db_session, owner, university, headers):
    note = _note(db_session, owner, university)
    db_session.add_all([NoteFile(note_id=note.id, file_url=f"notes/{note.id}/{i}.pdf", file_type="pdf", file_name=f"{i}.pdf") for i in range(9)])
    db_session.commit()

    resp = client.put(
        f"/notes/{note.id}",
        files=[("files", ("a.pdf", b"a", "application/pdf")), ("files", ("b.pdf", b"b", "application/pdf"))],
        headers=headers,
    )

    assert resp.status_code == 400
    assert db_session.query(NoteFile).filter(NoteFile.note_id == note.id).count() == 9


def test_update_without_changes_does_not_create_history(client, db_session, owner, university, headers):
    note = _note(db_session, owner, university, title="Same", content="Same body")

    resp = client.put(f"/notes/{note.id}", data={"title": "Same", "content": "Same body"}, headers=headers)

    assert resp.status_code == 200
    assert db_session.query(NoteHistory).filter(NoteHistory.note_id == note.id).count() == 0


# --- tags -----------------------------------------------------------------------------

def test_set_tags_deduplicates_and_reports_assigned_ids(client, db_session, owner, university, headers):
    note = _note(db_session, owner, university)
    tag = Tag(name="regression-tag")
    db_session.add(tag)
    db_session.commit()

    resp = client.put(f"/notes/{note.id}/tags", json={"tag_ids": [tag.id, tag.id, 999_999]}, headers=headers)

    assert resp.status_code == 200
    assert resp.json()["tag_ids"] == [tag.id]
    assert db_session.query(NoteTag).filter(NoteTag.note_id == note.id).count() == 1


# --- filters ------------------------------------------------------------------------------

def test_invalid_date_filter_returns_422(client):
    assert client.get("/notes", params={"date_from": "yesterday"}).status_code == 422


def test_tag_ids_filter_accepts_comma_separated_ids(client, db_session, owner, university):
    tagged = _note(db_session, owner, university, title="Tagged")
    _note(db_session, owner, university, title="Untagged")
    tag = Tag(name="filter-tag")
    db_session.add(tag)
    db_session.flush()
    db_session.add(NoteTag(note_id=tagged.id, tag_id=tag.id))
    db_session.commit()

    items = client.get("/notes", params={"tag_ids": f"{tag.id},999999"}).json()["items"]

    assert [n["title"] for n in items] == ["Tagged"]


# --- N+1 -------------------------------------------------------------------------------------

def _count_queries(db_session, fn) -> int:
    engine = db_session.get_bind().engine
    statements: list[str] = []

    def record(conn, cursor, statement, *args):
        if not statement.lstrip().upper().startswith(("SAVEPOINT", "RELEASE", "ROLLBACK")):
            statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        fn()
    finally:
        event.remove(engine, "before_cursor_execute", record)
    return len(statements)


@pytest.mark.parametrize("path", ["/users/me/favorites", "/users/me/dashboard"])
def test_favorites_and_dashboard_do_not_issue_query_per_note(client, db_session, owner, university, headers, path):
    def add_favorites(n: int):
        for i in range(n):
            note = _note(db_session, owner, university, title=f"Fav {path} {i}")
            db_session.add(NoteFile(note_id=note.id, file_url=f"notes/{note.id}/f.pdf", file_type="pdf", file_name="f.pdf"))
            db_session.add(UserFavorite(user_id=owner.id, note_id=note.id))
        db_session.commit()
        db_session.expire_all()

    add_favorites(1)
    few = _count_queries(db_session, lambda: client.get(path, headers=headers))
    add_favorites(4)
    many = _count_queries(db_session, lambda: client.get(path, headers=headers))

    assert many == few
