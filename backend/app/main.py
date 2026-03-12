"""
Colloq API — Production-ready MVP.
Minimal entry point: config, upload dirs, CORS, routers, static files.
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
import os
import time
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.core.config import settings
from app.core.database import Base, engine, get_db

# Warn about insecure SECRET_KEY (don't crash tests or dev environments)
if settings.SECRET_KEY == "change-me-in-production":
    import warnings
    warnings.warn(
        "SECRET_KEY is set to the insecure default value. "
        "Set the SECRET_KEY environment variable to a secure random string.",
        UserWarning,
        stacklevel=1,
    )
from app.core.security import get_current_user
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
from app.migrate import run_migrations
from app.seed import run_seed

# Create tables and run migrations on startup (retry if DB not ready)
for attempt in range(5):
    try:
        Base.metadata.create_all(bind=engine)
        run_migrations(engine)
        break
    except Exception as e:
        if attempt == 4:
            raise
        time.sleep(2)
run_seed()

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

app = FastAPI(title="Colloq API", version="2.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://frontend:5173",
    ] + settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def root():
    return {"message": "Colloq API v2.1 is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/home")
async def get_home(db: Session = Depends(get_db)):
    """Single endpoint for home: stats, leaderboard, activity feed, recent notes, universities."""
    users_count = db.query(func.count(User.id)).scalar() or 0
    notes_count = db.query(func.count(Note.id)).scalar() or 0
    universities_count = db.query(func.count(University.id)).filter(University.is_approved == True).scalar() or 0
    latest_note = db.query(Note).order_by(desc(Note.created_at)).first()
    latest_user = db.query(User).order_by(desc(User.created_at)).first()
    latest_review = db.query(Review).order_by(desc(Review.created_at)).first()
    latest_activity = {
        "latest_note": {"id": latest_note.id, "title": latest_note.title, "created_at": str(latest_note.created_at) if latest_note else None, "university_id": latest_note.university_id} if latest_note else None,
        "latest_user": {"id": latest_user.id, "nickname": latest_user.nickname, "created_at": str(latest_user.created_at) if latest_user else None} if latest_user else None,
        "latest_review": {"id": latest_review.id, "content": latest_review.content, "created_at": str(latest_review.created_at) if latest_review else None, "university_id": latest_review.university_id} if latest_review else None,
    }
    top_users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    user_ids = [u.id for u in top_users]
    notes_per_user = {}
    reviews_per_user = {}
    comments_per_user = {}
    if user_ids:
        for uid, c in db.query(Note.user_id, func.count(Note.id)).filter(Note.user_id.in_(user_ids)).group_by(Note.user_id).all():
            notes_per_user[uid] = c
        for uid, c in db.query(Review.user_id, func.count(Review.id)).filter(Review.user_id.in_(user_ids)).group_by(Review.user_id).all():
            reviews_per_user[uid] = c
        for uid, c in db.query(Comment.user_id, func.count(Comment.id)).filter(Comment.user_id.in_(user_ids)).group_by(Comment.user_id).all():
            comments_per_user[uid] = c
    leaderboard = []
    for rank, user in enumerate(top_users, start=1):
        nc = notes_per_user.get(user.id, 0)
        rvc = reviews_per_user.get(user.id, 0)
        cc = comments_per_user.get(user.id, 0)
        leaderboard.append({
            "rank": rank, "user_id": user.id, "nickname": user.nickname, "avatar_url": user.avatar_url,
            "reputation_points": user.reputation_points, "uploads_count": user.uploads_count,
            "notes_count": nc, "total_score": user.reputation_points, "reviews_count": rvc, "comments_count": cc,
            "total_activity": nc + rvc + cc,
        })
    recent_notes_act = db.query(Note).options(joinedload(Note.author)).order_by(desc(Note.created_at)).limit(5).all()
    recent_reviews_act = db.query(Review).options(joinedload(Review.user), joinedload(Review.note)).order_by(desc(Review.created_at)).limit(5).all()
    activities = []
    for note in recent_notes_act:
        activities.append({"type": "note", "title": note.title, "description": note.content[:200] if note.content else None, "created_at": str(note.created_at) if note.created_at else None, "user_nickname": note.author.nickname if note.author else "Anonymous"})
    for review in recent_reviews_act:
        activities.append({"type": "review", "rating": review.rating, "comment": review.content, "created_at": str(review.created_at) if review.created_at else None, "user_nickname": review.user.nickname if review.user else "Anonymous", "note_title": review.note.title if review.note else None})
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    activity_feed = activities[:5]
    recent_notes = db.query(Note).options(joinedload(Note.author), joinedload(Note.subject), joinedload(Note.images), joinedload(Note.files)).order_by(desc(Note.created_at)).limit(6).all()
    universities_list = db.query(University).filter(University.is_approved == True).all()
    from app.services.file_manager import normalize_stored_path
    recent_notes_out = []
    for n in recent_notes:
        o = NoteOut.model_validate(n)
        if o.image_url:
            o.image_url = normalize_stored_path(o.image_url)
        recent_notes_out.append(o.model_dump())
    unis_out = [UniversityOut.model_validate(u).model_dump() for u in universities_list]
    return {
        "stats": {"users": users_count, "notes": notes_count, "universities": universities_count, "users_count": users_count, "notes_count": notes_count, "universities_count": universities_count, "latest_activity": latest_activity},
        "leaderboard": {"leaderboard": leaderboard, "total_users": users_count},
        "activity_feed": activity_feed,
        "recent_notes": recent_notes_out,
        "universities": unis_out,
    }


@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Platform-wide statistics."""
    users_count = db.query(func.count(User.id)).scalar() or 0
    notes_count = db.query(func.count(Note.id)).scalar() or 0
    universities_count = db.query(func.count(University.id)).scalar() or 0
    latest_note = db.query(Note).order_by(desc(Note.created_at)).first()
    latest_user = db.query(User).order_by(desc(User.created_at)).first()
    latest_review = db.query(Review).order_by(desc(Review.created_at)).first()
    return {
        "users": users_count, "notes": notes_count, "universities": universities_count,
        "users_count": users_count, "notes_count": notes_count, "universities_count": universities_count,
        "latest_activity": {
            "latest_note": {"id": latest_note.id, "title": latest_note.title, "created_at": str(latest_note.created_at) if latest_note else None, "university_id": latest_note.university_id} if latest_note else None,
            "latest_user": {"id": latest_user.id, "nickname": latest_user.nickname, "created_at": str(latest_user.created_at) if latest_user else None} if latest_user else None,
            "latest_review": {"id": latest_review.id, "content": latest_review.content, "created_at": str(latest_review.created_at) if latest_review else None, "university_id": latest_review.university_id} if latest_review else None,
        },
    }


@app.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    """Top 5 users by reputation with activity counts."""
    users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    total_users = db.query(func.count(User.id)).scalar() or 0
    user_ids = [u.id for u in users]
    notes_per_user = {}
    reviews_per_user = {}
    comments_per_user = {}
    if user_ids:
        for uid, c in db.query(Note.user_id, func.count(Note.id)).filter(Note.user_id.in_(user_ids)).group_by(Note.user_id).all():
            notes_per_user[uid] = c
        for uid, c in db.query(Review.user_id, func.count(Review.id)).filter(Review.user_id.in_(user_ids)).group_by(Review.user_id).all():
            reviews_per_user[uid] = c
        for uid, c in db.query(Comment.user_id, func.count(Comment.id)).filter(Comment.user_id.in_(user_ids)).group_by(Comment.user_id).all():
            comments_per_user[uid] = c
    leaderboard = []
    for rank, user in enumerate(users, start=1):
        nc = notes_per_user.get(user.id, 0)
        rvc = reviews_per_user.get(user.id, 0)
        cc = comments_per_user.get(user.id, 0)
        leaderboard.append({"rank": rank, "user_id": user.id, "nickname": user.nickname, "avatar_url": user.avatar_url, "reputation_points": user.reputation_points, "uploads_count": user.uploads_count, "notes_count": nc, "total_score": user.reputation_points, "reviews_count": rvc, "comments_count": cc, "total_activity": nc + rvc + cc})
    return {"leaderboard": leaderboard, "total_users": total_users}


@app.get("/activity-feed")
async def get_activity_feed(db: Session = Depends(get_db)):
    """Five most recent activities (notes and reviews)."""
    recent_notes = db.query(Note).options(joinedload(Note.author)).order_by(desc(Note.created_at)).limit(5).all()
    recent_reviews = db.query(Review).options(joinedload(Review.user), joinedload(Review.note)).order_by(desc(Review.created_at)).limit(5).all()
    activities = []
    for note in recent_notes:
        activities.append({"type": "note", "title": note.title, "description": note.content[:200] if note.content else None, "created_at": str(note.created_at) if note.created_at else None, "user_nickname": note.author.nickname if note.author else "Anonymous"})
    for review in recent_reviews:
        activities.append({"type": "review", "rating": review.rating, "comment": review.content, "created_at": str(review.created_at) if review.created_at else None, "user_nickname": review.user.nickname if review.user else "Anonymous", "note_title": review.note.title if review.note else None})
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return activities[:5]


@app.get("/notifications", response_model=list)
async def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db), unread_only: bool = False):
    """List current user notifications."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(desc(Notification.created_at)).limit(50).all()


@app.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark a notification as read."""
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"msg": "Marked as read"}


@app.patch("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark all notifications as read."""
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at.is_(None)).update({Notification.read_at: datetime.now(timezone.utc)})
    db.commit()
    return {"msg": "All marked as read"}


@app.post("/reports", response_model=ReportOut)
async def create_report(payload: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Report a note or user."""
    if not payload.note_id and not payload.reported_user_id:
        raise HTTPException(status_code=400, detail="Provide note_id or reported_user_id")
    if payload.note_id and not db.query(Note).filter(Note.id == payload.note_id).first():
        raise HTTPException(status_code=404, detail="Note not found")
    if payload.reported_user_id and not db.query(User).filter(User.id == payload.reported_user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    r = Report(reporter_id=current_user.id, note_id=payload.note_id, reported_user_id=payload.reported_user_id, reason=payload.reason[:100])
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@app.post("/feedback", response_model=FeedbackOut)
async def submit_feedback(payload: FeedbackCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Submit user feedback (1-5 rating + optional comment)."""
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    f = Feedback(user_id=current_user.id, rating=payload.rating, comment=(payload.comment[:2000] if payload.comment else None))
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@app.get("/search/global")
async def global_search(q: str = "", db: Session = Depends(get_db)):
    """Search across notes, universities, fields of study, and subjects."""
    if not q.strip():
        return {"notes": [], "universities": [], "fields": [], "subjects": []}
    search_term = q.strip()[:100]  # Limit search term length
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
    fields = db.query(FieldOfStudy).options(joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(FieldOfStudy.name.ilike(pattern)).limit(20).all()

    # Search subjects
    subjects = db.query(Subject).options(joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(Subject.name.ilike(pattern)).limit(20).all()

    return {
        "notes": [{"id": n.id, "title": n.title, "score": n.score, "university_id": n.university_id, "user_nickname": n.author.nickname if n.author else None} for n in notes_q],
        "universities": [{"id": u.id, "name": u.name, "city": u.city, "region": u.region, "image_url": u.image_url} for u in unis],
        "fields": [{"id": f.id, "name": f.name, "degree_level": f.degree_level, "faculty_id": f.faculty_id, "faculty_name": f.faculty.name if f.faculty else None, "university_id": f.faculty.university_id if f.faculty else None, "university_name": f.faculty.university.name if f.faculty and f.faculty.university else None} for f in fields],
        "subjects": [{"id": s.id, "name": s.name, "semester": s.semester, "field_of_study_id": s.field_of_study_id, "field_name": s.field_of_study.name if s.field_of_study else None, "faculty_name": s.field_of_study.faculty.name if s.field_of_study and s.field_of_study.faculty else None, "university_id": s.field_of_study.faculty.university_id if s.field_of_study and s.field_of_study.faculty else None, "university_name": s.field_of_study.faculty.university.name if s.field_of_study and s.field_of_study.faculty and s.field_of_study.faculty.university else None} for s in subjects],
    }

