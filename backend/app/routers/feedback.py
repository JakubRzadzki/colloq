"""User feedback about the platform."""
from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.models import Feedback
from app.schemas import FeedbackCreate, FeedbackOut

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackOut)
def submit_feedback(payload: FeedbackCreate, current_user: CurrentUser, db: DbSession):
    """Submit user feedback (1-5 rating + optional comment)."""
    f = Feedback(user_id=current_user.id, rating=payload.rating, comment=payload.comment)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f
