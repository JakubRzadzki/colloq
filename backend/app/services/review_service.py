"""Reviews of notes and universities."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Note, Review, User
from app.schemas import ReviewCreate


class ReviewService:
    def __init__(self, db: Session):
        self.db = db

    def add_review(self, user: User, data: ReviewCreate) -> Review:
        review = Review(
            rating=data.rating,
            content=data.content,
            user_id=user.id,
            note_id=data.note_id,
            university_id=data.university_id,
        )
        self.db.add(review)
        if data.note_id:
            note = self.db.query(Note).filter(Note.id == data.note_id).first()
            if note:
                reviews = self.db.query(Review).filter(Review.note_id == data.note_id).all()
                total = sum(r.rating for r in reviews) + data.rating
                count = len(reviews) + 1
                note.avg_rating = total / count
                note.rating_count = count
                author = self.db.query(User).filter(User.id == note.user_id).first()
                if author:
                    author.reputation_points = (author.reputation_points or 0) + 1
        self.db.commit()
        self.db.refresh(review)
        return review
