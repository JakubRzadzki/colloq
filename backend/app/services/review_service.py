"""Reviews of notes and universities."""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.models import Note, Review, University, User
from app.repositories.note_repository import NoteRepository
from app.schemas import ReviewCreate
from app.services import reputation

ALREADY_REVIEWED = "You have already reviewed this item"


class ReviewService:
    def __init__(self, db: Session):
        self.db = db

    def _check_note_target(self, user: User, note_id: int) -> Note:
        note = NoteRepository(self.db).get_visible(note_id, user)
        if note is None:
            raise NotFoundError("Note not found")
        if note.user_id == user.id:
            raise PermissionDeniedError("You cannot review your own note")
        return note

    def _check_university_target(self, user: User, university_id: int) -> None:
        university = self.db.get(University, university_id)
        if university is None or not (university.is_approved or user.is_admin):
            raise NotFoundError("University not found")

    def _already_reviewed(self, user: User, data: ReviewCreate) -> bool:
        query = self.db.query(Review.id).filter(Review.user_id == user.id)
        if data.note_id is not None:
            query = query.filter(Review.note_id == data.note_id)
        else:
            query = query.filter(Review.university_id == data.university_id)
        return query.first() is not None

    def _refresh_note_rating(self, note: Note) -> None:
        avg, count = (
            self.db.query(func.avg(Review.rating), func.count(Review.id))
            .filter(Review.note_id == note.id)
            .one()
        )
        note.avg_rating = float(avg or 0)
        note.rating_count = count

    def add_review(self, user: User, data: ReviewCreate) -> Review:
        note = None
        if data.note_id is not None:
            note = self._check_note_target(user, data.note_id)
        elif data.university_id is not None:
            self._check_university_target(user, data.university_id)
        if self._already_reviewed(user, data):
            raise ConflictError(ALREADY_REVIEWED)

        review = Review(
            rating=data.rating,
            content=data.content,
            user_id=user.id,
            note_id=data.note_id,
            university_id=data.university_id,
        )
        self.db.add(review)
        try:
            self.db.flush()
        except IntegrityError:
            # A concurrent request inserted the same review first.
            self.db.rollback()
            raise ConflictError(ALREADY_REVIEWED) from None
        if note is not None:
            self._refresh_note_rating(note)
            reputation.review_received(note.author)
        self.db.commit()
        self.db.refresh(review)
        return review
