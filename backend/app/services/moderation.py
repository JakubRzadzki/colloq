"""Admin moderation of user submissions.

Each moderated model has a ModerationHandler describing what happens on approval
and which stored files must go when a pending item is rejected. HANDLERS maps the
public item type to its handler, so the service never branches on the type.
"""
from __future__ import annotations

from enum import Enum

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Faculty, FieldOfStudy, ImageRequest, Note, Notification, Subject, University
from app.repositories.note_repository import NoteRepository
from app.services import reputation
from app.services.note_service import collect_note_files
from app.services.storage import LocalFileStorage, delete_files

IMAGE_REQUEST_PENDING = "pending"


class ItemType(str, Enum):
    university = "university"
    faculty = "faculty"
    field = "field"
    subject = "subject"
    note = "note"


def _notes_files(notes: list[Note]) -> list[str]:
    return [path for note in notes for path in collect_note_files(note)]


def _subject_files(subject: Subject) -> list[str]:
    return _notes_files(subject.notes)


def _field_files(field: FieldOfStudy) -> list[str]:
    return [path for subject in field.subjects for path in _subject_files(subject)]


def _faculty_files(faculty: Faculty) -> list[str]:
    own = [faculty.image_url] if faculty.image_url else []
    return own + [path for field in faculty.fields_of_study for path in _field_files(field)]


class ModerationHandler:
    model: type

    def on_approve(self, db: Session, item) -> None:
        """Side effects of approving the item. No-op by default."""

    def files_to_delete(self, item) -> list[str]:
        """Stored files owned by the item, including children removed by cascade."""
        return []


class NoteModeration(ModerationHandler):
    model = Note

    def on_approve(self, db: Session, item: Note) -> None:
        reputation.note_approved(item.author)
        db.add(Notification(
            user_id=item.user_id, type="note_approved", message="Your note was approved.", related_id=item.id
        ))

    def files_to_delete(self, item: Note) -> list[str]:
        return collect_note_files(item)


class UniversityModeration(ModerationHandler):
    model = University

    def files_to_delete(self, item: University) -> list[str]:
        own = [p for p in (item.image_url, item.banner_url) if p]
        # Notes and faculties are deleted by cascade together with the university.
        faculty_files = [path for faculty in item.faculties for path in _faculty_files(faculty)]
        return own + _notes_files(item.notes) + faculty_files


class FacultyModeration(ModerationHandler):
    model = Faculty

    def files_to_delete(self, item: Faculty) -> list[str]:
        return _faculty_files(item)


class FieldModeration(ModerationHandler):
    model = FieldOfStudy

    def files_to_delete(self, item: FieldOfStudy) -> list[str]:
        return _field_files(item)


class SubjectModeration(ModerationHandler):
    model = Subject

    def files_to_delete(self, item: Subject) -> list[str]:
        return _subject_files(item)


HANDLERS: dict[ItemType, ModerationHandler] = {
    ItemType.university: UniversityModeration(),
    ItemType.faculty: FacultyModeration(),
    ItemType.field: FieldModeration(),
    ItemType.subject: SubjectModeration(),
    ItemType.note: NoteModeration(),
}


class ModerationService:
    def __init__(self, db: Session, storage: LocalFileStorage):
        self.db = db
        self.storage = storage

    def _get_pending(self, item_type: ItemType, item_id: int):
        handler = HANDLERS[item_type]
        item = self.db.get(handler.model, item_id)
        if item is None:
            raise NotFoundError("Item not found")
        if item.is_approved:
            raise ConflictError(f"{item_type.value} is already approved")
        return handler, item

    def _delete_files(self, paths: list[str]) -> None:
        delete_files(self.storage, paths)

    def pending_items(self) -> dict:
        return {
            "notes": NoteRepository(self.db).list_pending(),
            "universities": self.db.query(University).filter(University.is_approved.is_(False)).all(),
            "faculties": self.db.query(Faculty).filter(Faculty.is_approved.is_(False)).all(),
            "fields": self.db.query(FieldOfStudy).filter(FieldOfStudy.is_approved.is_(False)).all(),
            "subjects": self.db.query(Subject).filter(Subject.is_approved.is_(False)).all(),
            "image_requests": (
                self.db.query(ImageRequest)
                .options(joinedload(ImageRequest.university))
                .filter(ImageRequest.status == IMAGE_REQUEST_PENDING)
                .all()
            ),
        }

    def approve(self, item_type: ItemType, item_id: int) -> None:
        handler, item = self._get_pending(item_type, item_id)
        item.is_approved = True
        handler.on_approve(self.db, item)
        self.db.commit()

    def reject(self, item_type: ItemType, item_id: int) -> None:
        """Delete a pending item. Files are removed only after the delete is committed."""
        handler, item = self._get_pending(item_type, item_id)
        paths = handler.files_to_delete(item)
        self.db.delete(item)
        self.db.commit()
        self._delete_files(paths)

    def _get_pending_image_request(self, req_id: int) -> ImageRequest:
        req = self.db.get(ImageRequest, req_id)
        if req is None:
            raise NotFoundError("Request not found")
        if req.status != IMAGE_REQUEST_PENDING:
            raise ConflictError(f"Image request is already {req.status}")
        return req

    def approve_image_request(self, req_id: int) -> None:
        req = self._get_pending_image_request(req_id)
        old_image = None
        if req.university is not None:
            old_image, req.university.image_url = req.university.image_url, req.new_image_url
        req.status = "approved"
        self.db.commit()
        if old_image:
            self._delete_files([old_image])

    def reject_image_request(self, req_id: int) -> None:
        req = self._get_pending_image_request(req_id)
        req.status = "rejected"
        self.db.commit()
        self._delete_files([req.new_image_url])
