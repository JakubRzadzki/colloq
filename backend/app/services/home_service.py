"""Payload of GET /home: stats, leaderboard, activity feed, recent notes and universities."""
from __future__ import annotations

from typing import Any

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Query, Session, joinedload

from app.models import Comment, Note, Review, University, User
from app.repositories.note_repository import NoteRepository
from app.schemas import NoteOut, UniversityOut

LEADERBOARD_SIZE = 5
ACTIVITY_FEED_SIZE = 5
RECENT_NOTES = 6


def _public_reviews(db: Session) -> Query:
    """Reviews that are not attached to an unapproved note."""
    return db.query(Review).outerjoin(Note, Review.note_id == Note.id).filter(
        or_(Review.note_id.is_(None), Note.is_approved.is_(True))
    )


def _str_or_none(value: Any) -> str | None:
    return str(value) if value else None


def _latest_activity(db: Session, approved_notes: Query) -> dict:
    note = approved_notes.order_by(desc(Note.created_at)).first()
    user = db.query(User).order_by(desc(User.created_at)).first()
    review = _public_reviews(db).order_by(desc(Review.created_at)).first()
    return {
        "latest_note": {
            "id": note.id,
            "title": note.title,
            "created_at": str(note.created_at),
            "university_id": note.university_id,
        } if note else None,
        "latest_user": {
            "id": user.id,
            "nickname": user.nickname,
            "created_at": str(user.created_at),
        } if user else None,
        "latest_review": {
            "id": review.id,
            "content": review.content,
            "created_at": str(review.created_at),
            "university_id": review.university_id,
        } if review else None,
    }


def _counts_per_user(
    db: Session, model: type[Note] | type[Review] | type[Comment], user_ids: list[int], *filters: Any
) -> dict:
    rows = (
        db.query(model.user_id, func.count(model.id))
        .filter(model.user_id.in_(user_ids), *filters)
        .group_by(model.user_id)
    )
    return {user_id: count for user_id, count in rows}


def _leaderboard(db: Session) -> list[dict]:
    top_users = db.query(User).order_by(desc(User.reputation_points)).limit(LEADERBOARD_SIZE).all()
    user_ids = [u.id for u in top_users]
    notes = _counts_per_user(db, Note, user_ids, Note.is_approved.is_(True)) if user_ids else {}
    reviews = _counts_per_user(db, Review, user_ids) if user_ids else {}
    comments = _counts_per_user(db, Comment, user_ids) if user_ids else {}

    leaderboard = []
    for rank, user in enumerate(top_users, start=1):
        nc, rvc, cc = notes.get(user.id, 0), reviews.get(user.id, 0), comments.get(user.id, 0)
        leaderboard.append({
            "rank": rank, "user_id": user.id, "nickname": user.nickname, "avatar_url": user.avatar_url,
            "reputation_points": user.reputation_points, "uploads_count": user.uploads_count,
            "notes_count": nc, "total_score": user.reputation_points, "reviews_count": rvc, "comments_count": cc,
            "total_activity": nc + rvc + cc,
        })
    return leaderboard


def _activity_feed(db: Session, approved_notes: Query) -> list[dict]:
    notes = (
        approved_notes.options(joinedload(Note.author))
        .order_by(desc(Note.created_at))
        .limit(ACTIVITY_FEED_SIZE)
        .all()
    )
    reviews = (
        _public_reviews(db)
        .options(joinedload(Review.user), joinedload(Review.note))
        .order_by(desc(Review.created_at))
        .limit(ACTIVITY_FEED_SIZE)
        .all()
    )
    activities = [
        {
            "type": "note",
            "title": note.title,
            "description": note.content[:200] if note.content else None,
            "created_at": _str_or_none(note.created_at),
            "user_nickname": note.author.nickname if note.author else "Anonymous",
        }
        for note in notes
    ] + [
        {
            "type": "review",
            "rating": review.rating,
            "comment": review.content,
            "created_at": _str_or_none(review.created_at),
            "user_nickname": review.user.nickname if review.user else "Anonymous",
            "note_title": review.note.title if review.note else None,
        }
        for review in reviews
    ]
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return activities[:ACTIVITY_FEED_SIZE]


def get_home_data(db: Session) -> dict:
    approved_notes = db.query(Note).filter(Note.is_approved.is_(True))
    users_count = db.query(func.count(User.id)).scalar() or 0
    notes_count = approved_notes.with_entities(func.count(Note.id)).scalar() or 0
    universities = db.query(University).filter(University.is_approved.is_(True)).all()
    universities_count = len(universities)

    return {
        "stats": {
            "users": users_count,
            "notes": notes_count,
            "universities": universities_count,
            "users_count": users_count,
            "notes_count": notes_count,
            "universities_count": universities_count,
            "latest_activity": _latest_activity(db, approved_notes),
        },
        "leaderboard": {"leaderboard": _leaderboard(db), "total_users": users_count},
        "activity_feed": _activity_feed(db, approved_notes),
        "recent_notes": [
            NoteOut.model_validate(n).model_dump() for n in NoteRepository(db).list_recent_public(RECENT_NOTES)
        ],
        "universities": [UniversityOut.model_validate(u).model_dump() for u in universities],
    }
