"""
Colloq API — Production-ready MVP.
Minimal entry point: config, upload dirs, CORS, routers, static files.
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func

from app.core.config import settings
from app.core.exceptions import DomainError

from app.models import (
    User,
    University,
    Faculty,
    FieldOfStudy,
    Subject,
    Note,
    Review,
    Comment,
    Notification,
    Report,
    Feedback,
    Vote,
    PasswordResetToken,
)
from app.schemas import NoteOut, UniversityOut, NotificationOut, ReportCreate, ReportOut, FeedbackCreate, FeedbackOut
from app.seed import run_seed

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.core.deps import CurrentUser, DbSession

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown tasks.

    The database schema is managed by Alembic (run via docker-entrypoint.sh
    before the app starts), so we no longer create tables or run ad-hoc
    migrations here. On startup we validate config and seed default data.
    Both are skipped while running the test suite.
    """
    if not settings.TESTING:
        settings.validate_secret_key()
        try:
            run_seed()
        except Exception:
            # A failed seed must not keep the API from starting.
            logger.exception("Database seeding failed")
    yield


app = FastAPI(title="Colloq API", version="2.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Prevent MIME-sniffing of user-uploaded files served from /uploads."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# Ensure upload directories exist (cross-platform)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "universities"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "notes"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "faculties"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
from app.routers import auth, users, universities, notes, admin, password_reset  # noqa: E402
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(universities.router)
app.include_router(notes.router)
app.include_router(admin.router)
app.include_router(password_reset.router)


@app.get("/")
def root():
    return {"message": "Colloq API v2.1 is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/home")
def get_home(db: DbSession):
    """Single endpoint for home: stats, leaderboard, activity feed, recent notes, universities."""
    from app.services.home_service import get_home_data
    return get_home_data(db)


@app.get("/notifications", response_model=list)
def get_notifications(current_user: CurrentUser, db: DbSession, unread_only: bool = False):
    """List current user notifications."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(desc(Notification.created_at)).limit(50).all()


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: CurrentUser, db: DbSession):
    """Mark a notification as read."""
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"msg": "Marked as read"}


@app.patch("/notifications/read-all")
def mark_all_notifications_read(current_user: CurrentUser, db: DbSession):
    """Mark all notifications as read."""
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at.is_(None)).update({Notification.read_at: datetime.now(timezone.utc)})
    db.commit()
    return {"msg": "All marked as read"}


@app.post("/reports", response_model=ReportOut)
def create_report(payload: ReportCreate, current_user: CurrentUser, db: DbSession):
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


@app.post("/feedback", response_model=FeedbackOut)
def submit_feedback(payload: FeedbackCreate, current_user: CurrentUser, db: DbSession):
    """Submit user feedback (1-5 rating + optional comment)."""
    f = Feedback(user_id=current_user.id, rating=payload.rating, comment=payload.comment)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@app.get("/search/global")
def global_search(db: DbSession, q: str = ""):
    """Search across notes, universities, fields of study, and subjects."""
    if not q.strip():
        return {"notes": [], "universities": [], "fields": [], "subjects": []}
    # Strip wildcard characters to prevent SQL injection pattern exploitation
    search_term = q.strip()[:100].replace("%", "").replace("_", "")
    pattern = f"%{search_term}%"

    # Search notes
    notes_q = db.query(Note).options(
        joinedload(Note.author), joinedload(Note.subject),
    ).filter(
        Note.is_approved == True,
        Note.title.ilike(pattern),
    ).limit(20).all()

    # Search universities
    unis = db.query(University).filter(
        University.is_approved == True,
        University.name.ilike(pattern),
    ).limit(20).all()

    # Search fields
    fields = db.query(FieldOfStudy).options(joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(
        FieldOfStudy.is_approved == True,
        FieldOfStudy.name.ilike(pattern),
    ).limit(20).all()

    # Search subjects
    subjects = db.query(Subject).options(joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(
        Subject.is_approved == True,
        Subject.name.ilike(pattern),
    ).limit(20).all()

    return {
        "notes": [{"id": n.id, "title": n.title, "score": n.score, "university_id": n.university_id, "user_nickname": n.author.nickname if n.author else None} for n in notes_q],
        "universities": [{"id": u.id, "name": u.name, "city": u.city, "region": u.region, "image_url": u.image_url} for u in unis],
        "fields": [{"id": f.id, "name": f.name, "degree_level": f.degree_level, "faculty_id": f.faculty_id, "faculty_name": f.faculty.name if f.faculty else None, "university_id": f.faculty.university_id if f.faculty else None, "university_name": f.faculty.university.name if f.faculty and f.faculty.university else None} for f in fields],
        "subjects": [{"id": s.id, "name": s.name, "semester": s.semester, "field_of_study_id": s.field_of_study_id, "field_name": s.field_of_study.name if s.field_of_study else None, "faculty_name": s.field_of_study.faculty.name if s.field_of_study and s.field_of_study.faculty else None, "university_id": s.field_of_study.faculty.university_id if s.field_of_study and s.field_of_study.faculty else None, "university_name": s.field_of_study.faculty.university.name if s.field_of_study and s.field_of_study.faculty and s.field_of_study.faculty.university else None} for s in subjects],
    }

