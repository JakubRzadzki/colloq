"""
NoteService tests with an in-memory fake storage: transaction/file ordering,
file limits, history and tag handling.
"""
import io
from dataclasses import dataclass, field

import pytest

from app.core.exceptions import DomainError
from app.core.security import get_password_hash
from app.models import Note, NoteFile, NoteHistory, NoteTag, Tag, University, User
from app.repositories.note_repository import NoteRepository
from app.services.note_service import MAX_FILES_PER_NOTE, NoteService, collect_note_files
from app.services.storage import SavedFile


@dataclass
class FakeUpload:
    filename: str
    content_type: str = "application/pdf"
    file: io.BytesIO = field(default_factory=lambda: io.BytesIO(b"data"))


class FakeStorage:
    def __init__(self):
        self.saved: list[str] = []
        self.deleted: list[str] = []
        self._n = 0

    def save_image(self, file, directory="notes"):
        self._n += 1
        url = f"/uploads/{directory}/fake-{self._n}.png"
        self.saved.append(url)
        return url

    def save_note_attachment(self, file, note_id):
        self._n += 1
        url = f"notes/{note_id}/fake-{self._n}_{file.filename}"
        self.saved.append(url)
        return SavedFile(url=url, type="pdf", name=file.filename)

    def delete(self, path):
        self.deleted.append(path)


class CommitFailed(Exception):
    pass


@pytest.fixture
def storage():
    return FakeStorage()


@pytest.fixture
def service(db_session, storage):
    return NoteService(db_session, NoteRepository(db_session), storage)


@pytest.fixture
def author(db_session):
    user = User(email="svc_author@example.com", nickname="svc_author", hashed_password=get_password_hash("x" * 8))
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def university(db_session):
    uni = University(name="Service Uni", city="City", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    return uni


def _fail_commit(monkeypatch, db_session):
    def boom():
        raise CommitFailed()

    monkeypatch.setattr(db_session, "commit", boom)


def _create(service, author, university, **kwargs):
    return service.create(
        author, title=kwargs.pop("title", "Title"), content=kwargs.pop("content", "Body"),
        university_id=university.id, subject_id=None, **kwargs,
    )


# --- create -------------------------------------------------------------------

def test_create_commit_failure_rolls_back_and_removes_saved_files(service, storage, db_session, author, university, monkeypatch):
    _fail_commit(monkeypatch, db_session)

    with pytest.raises(CommitFailed):
        _create(service, author, university, title="Doomed", image=FakeUpload("a.png"),
                images=[FakeUpload("b.png")], files=[FakeUpload("c.pdf")])

    assert len(storage.saved) == 3
    assert sorted(storage.deleted) == sorted(storage.saved)
    assert db_session.query(Note).filter(Note.title == "Doomed").count() == 0


def test_create_validation_failure_removes_files_saved_so_far(service, storage, db_session, author, university, monkeypatch):
    def reject(file, note_id):
        raise DomainError("File type .exe not allowed")

    monkeypatch.setattr(storage, "save_note_attachment", reject)

    with pytest.raises(DomainError):
        _create(service, author, university, title="Half saved", images=[FakeUpload("a.png")], files=[FakeUpload("x.exe")])

    assert storage.deleted == storage.saved and len(storage.saved) == 1
    assert db_session.query(Note).filter(Note.title == "Half saved").count() == 0


def test_create_ignores_empty_file_parts(service, author, university):
    note = _create(service, author, university, files=[FakeUpload(""), FakeUpload("real.pdf")])

    assert [f.file_name for f in note.files] == ["real.pdf"]


# --- delete ---------------------------------------------------------------------

def test_delete_removes_files_only_after_commit(service, storage, db_session, author, university, monkeypatch):
    note = _create(service, author, university, image=FakeUpload("a.png"), files=[FakeUpload("c.pdf")])
    paths = collect_note_files(note)
    note_id = note.id
    _fail_commit(monkeypatch, db_session)

    with pytest.raises(CommitFailed):
        service.delete(author, note_id)

    assert storage.deleted == []
    monkeypatch.undo()
    assert db_session.get(Note, note_id) is not None

    service.delete(author, note_id)

    assert sorted(storage.deleted) == sorted(paths)
    assert db_session.get(Note, note_id) is None


# --- update ---------------------------------------------------------------------

def test_update_deletes_replaced_image_after_commit(service, storage, author, university):
    note = _create(service, author, university, image=FakeUpload("old.png"))
    old_url = note.image_url

    updated = service.update(author, note.id, image=FakeUpload("new.png"))

    assert updated.image_url != old_url
    assert storage.deleted == [old_url]


def test_update_keeps_old_image_when_commit_fails(service, storage, db_session, author, university, monkeypatch):
    note = _create(service, author, university, image=FakeUpload("old.png"))
    old_url = note.image_url
    _fail_commit(monkeypatch, db_session)

    with pytest.raises(CommitFailed):
        service.update(author, note.id, image=FakeUpload("new.png"))

    new_url = storage.saved[-1]
    assert storage.deleted == [new_url]
    assert old_url not in storage.deleted


def test_update_file_limit_counts_existing_files(service, author, university):
    note = _create(service, author, university, files=[FakeUpload(f"{i}.pdf") for i in range(MAX_FILES_PER_NOTE - 1)])

    with pytest.raises(DomainError):
        service.update(author, note.id, files=[FakeUpload("a.pdf"), FakeUpload("b.pdf")])

    service.update(author, note.id, files=[FakeUpload("last.pdf")])
    assert len(service.repo.get(note.id).files) == MAX_FILES_PER_NOTE


def test_update_records_history_only_on_real_change(service, db_session, author, university):
    note = _create(service, author, university, title="Same", content="Same body")

    service.update(author, note.id, title="Same", content="Same body")
    assert db_session.query(NoteHistory).filter(NoteHistory.note_id == note.id).count() == 0

    service.update(author, note.id, title="Changed")
    history = db_session.query(NoteHistory).filter(NoteHistory.note_id == note.id).all()
    assert [(h.title, h.content) for h in history] == [("Same", "Same body")]


# --- tags -------------------------------------------------------------------------

def test_set_tags_deduplicates_and_returns_assigned_ids(service, db_session, author, university):
    note = _create(service, author, university)
    t1, t2 = Tag(name="svc-t1"), Tag(name="svc-t2")
    db_session.add_all([t1, t2])
    db_session.commit()

    assigned = service.set_tags(author, note.id, [t1.id, t2.id, t1.id, 999_999])

    assert assigned == [t1.id, t2.id]
    rows = db_session.query(NoteTag.tag_id).filter(NoteTag.note_id == note.id).order_by(NoteTag.tag_id).all()
    assert [r.tag_id for r in rows] == sorted([t1.id, t2.id])


def test_collect_note_files_includes_all_stored_files(service, author, university):
    note = _create(service, author, university, image=FakeUpload("a.png"),
                   images=[FakeUpload("b.png")], files=[FakeUpload("c.pdf")])

    assert len(collect_note_files(note)) == 3
    assert all(isinstance(p, str) and p for p in collect_note_files(note))
    assert isinstance(note.files[0], NoteFile)
