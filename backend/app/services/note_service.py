"""Business logic for notes. Owns the transaction; raises domain exceptions only."""
from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.exceptions import ConflictError, DomainError, NotFoundError, PermissionDeniedError
from app.models import (
    Comment,
    Note,
    NoteFile,
    NoteHistory,
    NoteImage,
    NoteTag,
    Notification,
    Subject,
    Tag,
    University,
    User,
    UserFavorite,
    Vote,
)
from app.repositories.note_repository import NoteRepository
from app.schemas import NoteFilters, PageParams
from app.services import reputation
from app.services.storage import LocalFileStorage, Upload, commit_or_discard, delete_files

MAX_FILES_PER_NOTE = 10
NOTE_NOT_FOUND = "Note not found"


def collect_note_files(note: Note) -> list[str]:
    """Every stored file that belongs to a note: legacy image, gallery images and attachments."""
    paths = [note.image_url] + [img.image_url for img in note.images] + [f.file_url for f in note.files]
    return [p for p in paths if p]


def increment_view_count(note_id: int) -> None:
    """Background task. Opens its own session because the request session is closed by then."""
    with SessionLocal() as db:
        NoteRepository(db).increment_view_count(note_id)
        db.commit()


def _present(uploads: Sequence[Upload | None]) -> list[Upload]:
    """Browsers send empty file parts for untouched inputs; ignore them."""
    return [u for u in uploads if u is not None and u.filename]


class NoteService:
    def __init__(self, db: Session, repo: NoteRepository, storage: LocalFileStorage):
        self.db = db
        self.repo = repo
        self.storage = storage

    # --- helpers -----------------------------------------------------------

    def _get_visible(self, note_id: int, user: User | None) -> Note:
        note = self.repo.get_visible(note_id, user)
        if note is None:
            raise NotFoundError(NOTE_NOT_FOUND)
        return note

    def _reload(self, note_id: int) -> Note:
        """Fetch a note again with everything NoteOut needs, e.g. after a commit."""
        note = self.repo.get(note_id)
        if note is None:
            raise NotFoundError(NOTE_NOT_FOUND)
        return note

    def _get_owned(self, note_id: int, user: User) -> Note:
        note = self.repo.get(note_id)
        if note is None:
            raise NotFoundError(NOTE_NOT_FOUND)
        if note.user_id != user.id and not user.is_admin:
            raise PermissionDeniedError("Not authorized")
        return note

    def _delete_files(self, paths: list[str]) -> None:
        delete_files(self.storage, paths)

    def _commit_or_discard(self, saved: list[str]) -> None:
        commit_or_discard(self.db, self.storage, saved)

    def _check_references(self, user: User, university_id: int, subject_id: int | None) -> None:
        university = self.db.get(University, university_id)
        if university is None or not (university.is_approved or user.is_admin):
            raise NotFoundError("University not found")
        if subject_id is not None:
            subject = self.db.get(Subject, subject_id)
            if subject is None or not (subject.is_approved or user.is_admin):
                raise NotFoundError("Subject not found")

    def _check_file_limit(self, count: int) -> None:
        if count > MAX_FILES_PER_NOTE:
            raise DomainError(f"Maximum {MAX_FILES_PER_NOTE} files per note allowed.")

    def _attach_uploads(self, note: Note, images: list[Upload], files: list[Upload], saved: list[str]) -> None:
        first_position = len(note.images)
        for offset, upload in enumerate(images):
            url = self.storage.save_image(upload)
            saved.append(url)
            self.repo.add(NoteImage(note_id=note.id, image_url=url, position=first_position + offset))
        for upload in files:
            stored = self.storage.save_note_attachment(upload, note.id)
            saved.append(stored.url)
            self.repo.add(NoteFile(note_id=note.id, file_url=stored.url, file_type=stored.type, file_name=stored.name))

    # --- notes -----------------------------------------------------------------

    def create(
        self,
        user: User,
        *,
        title: str | None,
        content: str | None,
        university_id: int,
        subject_id: int | None,
        image: Upload | None = None,
        images: Sequence[Upload | None] = (),
        files: Sequence[Upload | None] = (),
    ) -> Note:
        new_images, new_files = _present(images), _present(files)
        self._check_file_limit(len(new_files))
        self._check_references(user, university_id, subject_id)

        saved: list[str] = []
        try:
            image_url = None
            if image is not None and image.filename:
                image_url = self.storage.save_image(image)
                saved.append(image_url)
            note = Note(
                title=title,
                content=content,
                image_url=image_url,
                user_id=user.id,
                university_id=university_id,
                subject_id=subject_id,
                is_approved=user.is_admin,
            )
            self.repo.add(note)
            self.repo.flush()
            self._attach_uploads(note, new_images, new_files, saved)
            # Regular users are credited when an admin approves the note.
            if note.is_approved:
                reputation.note_approved(user)
        except Exception:
            self.db.rollback()
            self._delete_files(saved)
            raise
        self._commit_or_discard(saved)
        return self._reload(note.id)

    def update(
        self,
        user: User,
        note_id: int,
        *,
        title: str | None = None,
        content: str | None = None,
        image: Upload | None = None,
        images: Sequence[Upload | None] = (),
        files: Sequence[Upload | None] = (),
    ) -> Note:
        note = self._get_owned(note_id, user)
        new_images, new_files = _present(images), _present(files)
        self._check_file_limit(len(note.files) + len(new_files))

        title_changed = title is not None and title != note.title
        content_changed = content is not None and content != note.content
        if title_changed or content_changed:
            self.repo.add(NoteHistory(note_id=note.id, title=note.title, content=note.content, edited_by=user.id))
        if title_changed:
            note.title = title
        if content_changed:
            note.content = content

        saved: list[str] = []
        replaced_image = None
        try:
            if image is not None and image.filename:
                new_url = self.storage.save_image(image)
                saved.append(new_url)
                replaced_image, note.image_url = note.image_url, new_url
            self._attach_uploads(note, new_images, new_files, saved)
        except Exception:
            self.db.rollback()
            self._delete_files(saved)
            raise
        self._commit_or_discard(saved)
        # The old image is only removed once the new path is safely committed.
        if replaced_image:
            self._delete_files([replaced_image])
        return self._reload(note_id)

    def delete(self, user: User, note_id: int) -> None:
        note = self._get_owned(note_id, user)
        paths = collect_note_files(note)
        self.repo.delete(note)
        self._commit_or_discard([])
        # Files go only after the commit: a failed commit must not leave a note without its files.
        self._delete_files(paths)

    def get_for_view(self, note_id: int, user: User | None) -> Note:
        return self._get_visible(note_id, user)

    def list_public(self, filters: NoteFilters) -> tuple[list[Note], int]:
        return self.repo.list_public(filters)

    def history(self, user: User, note_id: int) -> list[NoteHistory]:
        self._get_owned(note_id, user)
        return self.repo.list_history(note_id)

    def get_download(self, user: User, note_id: int, file_id: int, *, count: bool = True) -> tuple[Path, str]:
        """Attachment path and original name. `count=False` is for inline previews."""
        note = self._get_visible(note_id, user)
        note_file = self.repo.get_file(note_id, file_id)
        if note_file is None:
            raise NotFoundError("File not found")
        try:
            path = self.storage.attachment_path(note_file.file_url)
        except ValueError:
            raise NotFoundError("File not found") from None
        if not path.is_file():
            raise NotFoundError("File not found on disk")
        if count:
            note.download_count = (note.download_count or 0) + 1
            self.db.commit()
        return path, note_file.file_name

    # --- comments ------------------------------------------------------------------

    def list_comments(self, note_id: int, user: User | None, page: PageParams) -> tuple[list[Comment], int]:
        self._get_visible(note_id, user)
        return self.repo.list_comments(note_id, page.limit, page.offset)

    def add_comment(self, user: User, note_id: int, content: str) -> Comment:
        note = self._get_visible(note_id, user)
        comment = Comment(content=content, user_id=user.id, note_id=note_id)
        self.repo.add(comment)
        if note.user_id != user.id:
            message = f"{user.nickname} commented on your note: {(note.title or 'Untitled')[:50]}"
            self.repo.add(Notification(user_id=note.user_id, type="comment", message=message, related_id=note_id))
        self.db.commit()
        return comment

    # --- votes, favorites ------------------------------------------------------------

    def vote(self, user: User, note_id: int) -> tuple[float, bool]:
        """Toggle the user's upvote. Returns (new score, whether the user now has a vote)."""
        note = self._get_visible(note_id, user)
        if note.user_id == user.id:
            raise PermissionDeniedError("You cannot vote on your own note")
        existing = self.repo.get_vote(user.id, note_id)
        if existing:
            self.repo.delete(existing)
            reputation.vote_withdrawn(note.author)
        else:
            self.repo.add(Vote(user_id=user.id, note_id=note_id, value=1))
            reputation.vote_received(note.author)
        # Flush so the vote change is visible to the SUM below.
        try:
            self.repo.flush()
        except IntegrityError:
            # A concurrent request from the same user added the vote first (uq_user_vote).
            self.db.rollback()
            raise ConflictError("Vote already registered") from None
        score = float(self.repo.sum_votes(note_id))
        note.score = score
        self.db.commit()
        return score, existing is None

    def toggle_favorite(self, user: User, note_id: int) -> bool:
        """Returns whether the note is now a favorite."""
        self._get_visible(note_id, user)
        existing = self.repo.get_favorite(user.id, note_id)
        if existing:
            self.repo.delete(existing)
        else:
            self.repo.add(UserFavorite(user_id=user.id, note_id=note_id))
        self.db.commit()
        return existing is None

    # --- tags ---------------------------------------------------------------------------

    def list_tags(self) -> list[Tag]:
        return self.repo.list_tags()

    def create_tag(self, name: str) -> Tag:
        name = name.strip()
        if not name:
            raise DomainError("Tag name required")
        existing = self.repo.get_tag_by_name(name)
        if existing:
            return existing
        tag = Tag(name=name)
        self.repo.add(tag)
        self.db.commit()
        return tag

    def set_tags(self, user: User, note_id: int, tag_ids: list[int]) -> list[int]:
        """Replace the note's tags. Unknown ids are skipped; returns the ids actually assigned."""
        self._get_owned(note_id, user)
        requested = list(dict.fromkeys(tag_ids))
        existing = self.repo.get_existing_tag_ids(requested)
        assigned = [tag_id for tag_id in requested if tag_id in existing]
        self.repo.delete_note_tags(note_id)
        for tag_id in assigned:
            self.repo.add(NoteTag(note_id=note_id, tag_id=tag_id))
        self.db.commit()
        return assigned
