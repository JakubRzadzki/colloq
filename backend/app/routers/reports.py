"""User reports of notes and other users."""
from fastapi import APIRouter, HTTPException, Request

from app.core.deps import CurrentUser, DbSession
from app.core.rate_limit import limiter
from app.models import Note, Report, User
from app.schemas import ReportCreate, ReportOut

router = APIRouter(tags=["reports"])


@router.post("/reports", response_model=ReportOut)
@limiter.limit("5/minute")
def create_report(request: Request, payload: ReportCreate, current_user: CurrentUser, db: DbSession):
    """Report a note or user."""
    if not payload.note_id and not payload.reported_user_id:
        raise HTTPException(status_code=400, detail="Provide note_id or reported_user_id")
    if payload.note_id and not db.query(Note).filter(Note.id == payload.note_id).first():
        raise HTTPException(status_code=404, detail="Note not found")
    if payload.reported_user_id and not db.query(User).filter(User.id == payload.reported_user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    r = Report(reporter_id=current_user.id, note_id=payload.note_id, reported_user_id=payload.reported_user_id, reason=payload.reason)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r
