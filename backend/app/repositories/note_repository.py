"""Database access for notes and the entities hanging off them.

The repository only builds queries and adds/flushes objects. Committing and
rolling back is the caller's (service's) job.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import UnaryExpression, desc, func, or_
from sqlalchemy.orm import Query, Session, joinedload, selectinload

from app.core.sql import LIKE_ESCAPE, escape_like, paginate
from app.models import (
    Comment,
    Note,
    NoteFile,
    NoteHistory,
    NoteTag,
    Subject,
    Tag,
    User,
    UserFavorite,
    Vote,
)
from app.schemas import NoteFilters, NoteSort

SORT_ORDER: dict[NoteSort, tuple[UnaryExpression[Any], ...]] = {
    NoteSort.date: (desc(Note.created_at),),
    NoteSort.score: (desc(Note.score), desc(Note.created_at)),
    NoteSort.views: (desc(Note.view_count), desc(Note.created_at)),
}


def is_note_visible(note: Note, user: User | None) -> bool:
    """Unapproved notes are visible only to their author and to admins."""
    if note.is_approved:
        return True
    return user is not None and (user.is_admin or user.id == note.user_id)


class NoteRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base(self) -> Query:
        # Everything NoteOut serializes, loaded up front to avoid N+1 queries.
        return self.db.query(Note).options(
            joinedload(Note.author),
            joinedload(Note.subject),
            selectinload(Note.images),
            selectinload(Note.files),
            selectinload(Note.tags),
        )

    def _public(self) -> Query:
        return self._base().filter(Note.is_approved.is_(True))

    # --- notes -----------------------------------------------------------

    def get(self, note_id: int) -> Note | None:
        return self._base().filter(Note.id == note_id).first()

    def get_visible(self, note_id: int, user: User | None) -> Note | None:
        note = self.get(note_id)
        if note is None or not is_note_visible(note, user):
            return None
        return note

    def list_public(self, filters: NoteFilters) -> tuple[list[Note], int]:
        query = self._public()
        if filters.university_id:
            query = query.filter(Note.university_id == filters.university_id)
        if filters.subject_id:
            query = query.filter(Note.subject_id == filters.subject_id)
        if filters.semester is not None:
            query = query.join(Note.subject).filter(Subject.semester == filters.semester)
        if filters.tag_ids:
            query = query.join(NoteTag).filter(NoteTag.tag_id.in_(filters.tag_ids))
        if filters.date_from:
            query = query.filter(Note.created_at >= filters.date_from)
        if filters.date_to:
            query = query.filter(Note.created_at <= filters.date_to)
        if filters.search:
            pattern = f"%{escape_like(filters.search)}%"
            query = query.filter(or_(
                Note.title.ilike(pattern, escape=LIKE_ESCAPE),
                Note.content.ilike(pattern, escape=LIKE_ESCAPE),
            ))

        # Count distinct ids without ORDER BY: the tag join can duplicate rows.
        total = query.order_by(None).with_entities(func.count(func.distinct(Note.id))).scalar() or 0
        notes = (
            query.order_by(*SORT_ORDER[filters.sort])
            .distinct()
            .offset((filters.page - 1) * filters.page_size)
            .limit(filters.page_size)
            .all()
        )
        return notes, total

    def list_recent_public(self, limit: int) -> list[Note]:
        return self._public().order_by(desc(Note.created_at)).limit(limit).all()

    def search_public(self, term: str, limit: int) -> list[Note]:
        pattern = f"%{escape_like(term)}%"
        return self._public().filter(Note.title.ilike(pattern, escape=LIKE_ESCAPE)).limit(limit).all()

    def list_by_author(self, user_id: int, limit: int | None = None) -> list[Note]:
        query = self._base().filter(Note.user_id == user_id).order_by(desc(Note.created_at))
        return query.limit(limit).all() if limit else query.all()

    def list_favorites(self, user_id: int, limit: int | None = None) -> list[Note]:
        query = (
            self._base()
            .join(UserFavorite, UserFavorite.note_id == Note.id)
            .filter(UserFavorite.user_id == user_id)
            .order_by(desc(UserFavorite.created_at))
        )
        return query.limit(limit).all() if limit else query.all()

    def list_pending(self) -> list[Note]:
        return self._base().filter(Note.is_approved.is_(False)).all()

    def increment_view_count(self, note_id: int) -> None:
        self.db.query(Note).filter(Note.id == note_id).update(
            {Note.view_count: Note.view_count + 1}, synchronize_session=False
        )

    def add(self, obj: object) -> None:
        self.db.add(obj)

    def delete(self, obj: object) -> None:
        self.db.delete(obj)

    def flush(self) -> None:
        self.db.flush()

    # --- history, comments ------------------------------------------------

    def list_history(self, note_id: int) -> list[NoteHistory]:
        return (
            self.db.query(NoteHistory)
            .filter(NoteHistory.note_id == note_id)
            .order_by(desc(NoteHistory.edited_at))
            .all()
        )

    def list_comments(self, note_id: int, limit: int, offset: int) -> tuple[list[Comment], int]:
        query = (
            self.db.query(Comment)
            .options(joinedload(Comment.user))
            .filter(Comment.note_id == note_id)
            .order_by(desc(Comment.created_at), desc(Comment.id))
        )
        return paginate(query, limit, offset)

    # --- files -------------------------------------------------------------

    def get_file(self, note_id: int, file_id: int) -> NoteFile | None:
        return self.db.query(NoteFile).filter(NoteFile.id == file_id, NoteFile.note_id == note_id).first()

    # --- votes, favorites ----------------------------------------------------

    def get_vote(self, user_id: int, note_id: int) -> Vote | None:
        return self.db.query(Vote).filter(Vote.user_id == user_id, Vote.note_id == note_id).first()

    def sum_votes(self, note_id: int) -> int:
        return self.db.query(func.coalesce(func.sum(Vote.value), 0)).filter(Vote.note_id == note_id).scalar()

    def get_favorite(self, user_id: int, note_id: int) -> UserFavorite | None:
        return (
            self.db.query(UserFavorite)
            .filter(UserFavorite.user_id == user_id, UserFavorite.note_id == note_id)
            .first()
        )

    # --- tags ------------------------------------------------------------------

    def list_tags(self) -> list[Tag]:
        return self.db.query(Tag).order_by(Tag.name).all()

    def get_tag_by_name(self, name: str) -> Tag | None:
        return self.db.query(Tag).filter(Tag.name == name).first()

    def get_existing_tag_ids(self, tag_ids: list[int]) -> set[int]:
        if not tag_ids:
            return set()
        return {tag_id for (tag_id,) in self.db.query(Tag.id).filter(Tag.id.in_(tag_ids))}

    def delete_note_tags(self, note_id: int) -> None:
        self.db.query(NoteTag).filter(NoteTag.note_id == note_id).delete(synchronize_session=False)
