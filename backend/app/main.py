"""
Colloq API - Main Application
FastAPI backend for the student note-sharing platform.
Handles CRUD operations, file uploads, gamification, and statistics.

Key fixes applied:
- CORS allows all common dev origins
- joinedload used everywhere to prevent N+1 queries
- Multi-image upload for notes (Rich Notes feature)
- UniversityOut schema matches model exactly (no more 422 errors)
"""
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sql_func, desc, or_
from typing import List, Optional
from pydantic import BaseModel
import os
import uuid

from .database import get_db, engine, Base
from .models import (
    User, University, Faculty, FieldOfStudy, Subject,
    Note, NoteImage, NoteHistory, Review, Comment, ImageRequest,
    UserFavorite, Notification, Report, Tag, NoteTag, Feedback,
)
from .schemas import (
    UserCreate, UserOut, UserResponse, UniversityOut, FacultyOut,
    FieldOfStudyOut, SubjectOut, NoteOut, NoteHistoryOut, NoteImageOut, TagOut,
    ReviewCreate, ReviewOut, CommentCreate, CommentOut,
    ImageRequestOut, PendingItemsResponse, RegisterRequest,
    FieldOfStudyCreate, SubjectCreate, Token,
    NotificationOut, ReportCreate, ReportOut, FeedbackCreate, FeedbackOut, TagCreate,
)
from .auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_user_optional, pwd_context,
)

# Create database tables and run migrations on startup (retry if DB not ready)
import time
from .migrate import run_migrations

for attempt in range(5):
    try:
        Base.metadata.create_all(bind=engine)
        run_migrations(engine)
        break
    except Exception as e:
        if attempt == 4:
            raise
        time.sleep(2)

# Run database seeder (default University + Admin if empty)
from .seed import run_seed
run_seed()

app = FastAPI(title="Colloq API", version="2.1.0")

# CORS configuration - allow all common dev origins and Docker networking
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://frontend:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directories exist
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/notes", exist_ok=True)
os.makedirs("uploads/universities", exist_ok=True)
os.makedirs("uploads/faculties", exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# =============================================================================
# UTILITY: Save uploaded file to disk
# =============================================================================

async def save_upload(file: UploadFile, directory: str) -> str:
    """Save an uploaded file and return the relative URL path."""
    filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    filepath = f"uploads/{directory}/{filename}"
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    return f"/uploads/{directory}/{filename}"


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/")
async def root():
    return {"message": "Colloq API v2.1 is running"}


# =============================================================================
# HOME (batched payload - reduces 5+ requests to 1)
# =============================================================================

@app.get("/home")
async def get_home(db: Session = Depends(get_db)):
    """Single endpoint for home page data: stats, leaderboard, activity feed, recent notes, universities."""

    # 1) Counts in one pass via scalar subqueries
    users_count = db.query(sql_func.count(User.id)).scalar() or 0
    notes_count = db.query(sql_func.count(Note.id)).scalar() or 0
    universities_count = db.query(sql_func.count(University.id)).filter(
        University.is_approved == True
    ).scalar() or 0

    # 2) Latest activity (3 lightweight queries)
    latest_note = db.query(Note).order_by(desc(Note.created_at)).first()
    latest_user = db.query(User).order_by(desc(User.created_at)).first()
    latest_review = db.query(Review).order_by(desc(Review.created_at)).first()

    latest_activity = {
        "latest_note": {
            "id": latest_note.id,
            "title": latest_note.title,
            "created_at": str(latest_note.created_at) if latest_note.created_at else None,
            "university_id": latest_note.university_id,
        } if latest_note else None,
        "latest_user": {
            "id": latest_user.id,
            "nickname": latest_user.nickname,
            "created_at": str(latest_user.created_at) if latest_user.created_at else None,
        } if latest_user else None,
        "latest_review": {
            "id": latest_review.id,
            "content": latest_review.content,
            "created_at": str(latest_review.created_at) if latest_review.created_at else None,
            "university_id": latest_review.university_id,
        } if latest_review else None,
    }

    # 3) Leaderboard: top 5 users + batch counts
    top_users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    user_ids = [u.id for u in top_users]
    notes_per_user = {}
    reviews_per_user = {}
    comments_per_user = {}

    if user_ids:
        for uid, c in db.query(
            Note.user_id, sql_func.count(Note.id)
        ).filter(Note.user_id.in_(user_ids)).group_by(Note.user_id).all():
            notes_per_user[uid] = c
        for uid, c in db.query(
            Review.user_id, sql_func.count(Review.id)
        ).filter(Review.user_id.in_(user_ids)).group_by(Review.user_id).all():
            reviews_per_user[uid] = c
        for uid, c in db.query(
            Comment.user_id, sql_func.count(Comment.id)
        ).filter(Comment.user_id.in_(user_ids)).group_by(Comment.user_id).all():
            comments_per_user[uid] = c

    leaderboard = []
    for rank, user in enumerate(top_users, start=1):
        nc = notes_per_user.get(user.id, 0)
        rvc = reviews_per_user.get(user.id, 0)
        cc = comments_per_user.get(user.id, 0)
        leaderboard.append({
            "rank": rank,
            "user_id": user.id,
            "nickname": user.nickname,
            "avatar_url": user.avatar_url,
            "reputation_points": user.reputation_points,
            "uploads_count": user.uploads_count,
            "notes_count": nc,
            "total_score": user.reputation_points,
            "reviews_count": rvc,
            "comments_count": cc,
            "total_activity": nc + rvc + cc,
        })

    # 4) Activity feed: notes + reviews with joinedload, merge and take 5
    recent_notes_act = db.query(Note).options(
        joinedload(Note.author)
    ).order_by(desc(Note.created_at)).limit(5).all()

    recent_reviews_act = db.query(Review).options(
        joinedload(Review.user), joinedload(Review.note)
    ).order_by(desc(Review.created_at)).limit(5).all()

    activities = []
    for note in recent_notes_act:
        activities.append({
            "type": "note",
            "title": note.title,
            "description": note.content[:200] if note.content else None,
            "created_at": str(note.created_at) if note.created_at else None,
            "user_nickname": note.author.nickname if note.author else "Anonymous",
        })
    for review in recent_reviews_act:
        activities.append({
            "type": "review",
            "rating": review.rating,
            "comment": review.content,
            "created_at": str(review.created_at) if review.created_at else None,
            "user_nickname": review.user.nickname if review.user else "Anonymous",
            "note_title": review.note.title if review.note else None,
        })
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    activity_feed = activities[:5]

    # 5) Recent notes (6) with author, subject, and images
    recent_notes = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
    ).order_by(desc(Note.created_at)).limit(6).all()

    # 6) Universities (approved only)
    universities = db.query(University).filter(University.is_approved == True).all()

    return {
        "stats": {
            "users": users_count,
            "notes": notes_count,
            "universities": universities_count,
            "users_count": users_count,
            "notes_count": notes_count,
            "universities_count": universities_count,
            "latest_activity": latest_activity,
        },
        "leaderboard": {"leaderboard": leaderboard, "total_users": users_count},
        "activity_feed": activity_feed,
        "recent_notes": [NoteOut.model_validate(n).model_dump() for n in recent_notes],
        "universities": [UniversityOut.model_validate(u).model_dump() for u in universities],
    }


# =============================================================================
# AUTHENTICATION
# =============================================================================

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/register", response_model=UserOut)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user_data = payload.user
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate nickname from email prefix
    nickname = user_data.email.split("@")[0]
    counter = 1
    base_nickname = nickname
    while db.query(User).filter(User.nickname == nickname).first():
        nickname = f"{base_nickname}{counter}"
        counter += 1

    new_user = User(
        email=user_data.email,
        nickname=nickname,
        hashed_password=get_password_hash(user_data.password),
        university_id=user_data.university_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# =============================================================================
# USER ENDPOINTS
# =============================================================================

@app.get("/users/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user data."""
    return current_user


@app.put("/users/me", response_model=UserOut)
async def update_me(
    nickname: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile, including avatar upload."""
    if nickname:
        current_user.nickname = nickname
    if bio is not None:
        current_user.bio = bio
    if avatar and avatar.filename:
        url = await save_upload(avatar, "avatars")
        current_user.avatar_url = url

    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# =============================================================================
# UNIVERSITY ENDPOINTS
# =============================================================================

DEFAULT_UNIVERSITY_IMAGE = "https://placehold.co/400x200/5e5ce6/ffffff?text=Colloq"


@app.post("/universities", response_model=UniversityOut)
async def create_university(
    name: str = Form(...),
    city: str = Form(...),
    region: str = Form(""),
    country: str = Form("Poland"),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Create a new university entry. Works with or without login."""
    image_url = DEFAULT_UNIVERSITY_IMAGE
    if image and image.filename:
        try:
            image_url = await save_upload(image, "universities")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    try:
        university = University(
            name=name.strip(),
            city=city.strip(),
            region=(region or "").strip(),
            country=(country or "Poland").strip(),
            description=description.strip() if (description and isinstance(description, str)) else None,
            image_url=image_url,
        )
        db.add(university)
        db.commit()
        db.refresh(university)
        return university
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create university: {str(e)}")


@app.get("/universities", response_model=List[UniversityOut])
async def get_universities(region: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all approved universities. Optional region filter (case-insensitive)."""
    q = db.query(University).filter(University.is_approved == True)
    if region and region.strip():
        q = q.filter(sql_func.lower(University.region) == region.strip().lower())
    return q.order_by(University.name).all()


@app.get("/universities/{uni_id}", response_model=UniversityOut)
async def get_university(uni_id: int, db: Session = Depends(get_db)):
    """Get a single university by ID with eager-loaded relationships."""
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    return uni


@app.put("/universities/{uni_id}", response_model=UniversityOut)
async def update_university(
    uni_id: int,
    description: Optional[str] = Form(None),
    banner: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update university details (admin only)."""
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    if description is not None:
        uni.description = description
    if banner and banner.filename:
        uni.banner_url = await save_upload(banner, "universities")
    db.commit()
    db.refresh(uni)
    return uni


# =============================================================================
# FACULTY ENDPOINTS
# =============================================================================

@app.get("/universities/{uni_id}/faculties", response_model=List[FacultyOut])
async def get_faculties(uni_id: int, db: Session = Depends(get_db)):
    """Get all faculties for a specific university."""
    return db.query(Faculty).filter(Faculty.university_id == uni_id).all()


@app.post("/faculties", response_model=FacultyOut)
async def create_faculty(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    university_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new faculty within a university."""
    image_url = None
    if image and image.filename:
        image_url = await save_upload(image, "faculties")

    faculty = Faculty(
        name=name,
        description=description,
        image_url=image_url,
        university_id=university_id,
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


# =============================================================================
# FIELD OF STUDY ENDPOINTS
# =============================================================================

@app.get("/faculties/{fac_id}/fields", response_model=List[FieldOfStudyOut])
async def get_fields(fac_id: int, db: Session = Depends(get_db)):
    """Get all fields of study for a specific faculty."""
    return db.query(FieldOfStudy).filter(FieldOfStudy.faculty_id == fac_id).all()


@app.post("/fields", response_model=FieldOfStudyOut)
async def create_field(data: FieldOfStudyCreate, db: Session = Depends(get_db)):
    """Create a new field of study."""
    field = FieldOfStudy(name=data.name, degree_level=data.degree_level, faculty_id=data.faculty_id)
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


# =============================================================================
# SUBJECT ENDPOINTS
# =============================================================================

@app.get("/fields/{field_id}/subjects", response_model=List[SubjectOut])
async def get_subjects(field_id: int, db: Session = Depends(get_db)):
    """Get all subjects for a specific field of study."""
    return db.query(Subject).filter(Subject.field_of_study_id == field_id).all()


@app.post("/subjects", response_model=SubjectOut)
async def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    """Create a new subject."""
    subject = Subject(name=data.name, semester=data.semester, field_of_study_id=data.field_of_study_id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


# =============================================================================
# NOTE ENDPOINTS (Rich Notes with Multiple Images)
# =============================================================================

@app.post("/notes", response_model=NoteOut)
async def create_note(
    title: str = Form(None),
    content: Optional[str] = Form(None),
    university_id: int = Form(...),
    subject_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new note with optional single image OR multiple images.
    - 'image' field: legacy single-image upload (stored in image_url column)
    - 'images' field: multiple images (stored in note_images table)
    Increments user uploads_count and adds +10 reputation points.
    """
    # Handle legacy single image
    image_url = None
    if image and image.filename:
        image_url = await save_upload(image, "notes")

    note = Note(
        title=title,
        content=content,
        image_url=image_url,
        user_id=current_user.id,
        university_id=university_id,
        subject_id=subject_id,
    )
    db.add(note)
    db.flush()  # Get the note.id before adding images

    # Handle multiple images (Rich Notes feature)
    for idx, img_file in enumerate(images):
        if img_file and img_file.filename:
            url = await save_upload(img_file, "notes")
            note_image = NoteImage(
                note_id=note.id,
                image_url=url,
                position=idx,
            )
            db.add(note_image)

    # Gamification: reward the uploader
    current_user.uploads_count += 1
    current_user.reputation_points += 10

    db.commit()
    db.refresh(note)

    # Re-query with relationships loaded for proper serialization
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
    ).filter(Note.id == note.id).first()

    return note


@app.get("/notes", response_model=List[NoteOut])
async def get_notes(
    university_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    semester: Optional[int] = None,
    tag_ids: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get notes with filters: university, subject, semester, tags, date range, full-text search (title/content), sort (date|score|views)."""
    query = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.tags),
    ).filter(Note.is_approved == True)
    if university_id:
        query = query.filter(Note.university_id == university_id)
    if subject_id:
        query = query.filter(Note.subject_id == subject_id)
    if semester is not None:
        query = query.join(Note.subject).filter(Subject.semester == semester)
    if tag_ids:
        ids = [int(x) for x in tag_ids.split(",") if x.strip().isdigit()]
        if ids:
            query = query.join(NoteTag).filter(NoteTag.tag_id.in_(ids))
    if date_from:
        try:
            from datetime import datetime
            query = query.filter(Note.created_at >= datetime.fromisoformat(date_from.replace("Z", "+00:00")))
        except Exception:
            pass
    if date_to:
        try:
            from datetime import datetime
            query = query.filter(Note.created_at <= datetime.fromisoformat(date_to.replace("Z", "+00:00")))
        except Exception:
            pass
    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Note.title.ilike(q),
                Note.content.ilike(q),
            )
        )
    if sort == "score":
        query = query.order_by(desc(Note.score), desc(Note.created_at))
    elif sort == "views":
        query = query.order_by(desc(Note.view_count), desc(Note.created_at))
    else:
        query = query.order_by(desc(Note.created_at))
    return query.distinct().all()


@app.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a single note by ID; increments view_count."""
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.tags),
    ).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.view_count = (note.view_count or 0) + 1
    db.commit()
    return note


@app.put("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a note (owner only). Saves previous version to NoteHistory before updating.
    Supports adding new images to the note.
    """
    note = db.query(Note).options(
        joinedload(Note.images),
    ).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Git-style: save current version to history before updating
    history_entry = NoteHistory(
        note_id=note.id,
        title=note.title,
        content=note.content,
        edited_by=current_user.id,
    )
    db.add(history_entry)

    if title is not None:
        note.title = title
    if content is not None:
        note.content = content

    # Handle legacy single image update
    if image and image.filename:
        note.image_url = await save_upload(image, "notes")

    # Handle multiple new images
    existing_count = len(note.images) if note.images else 0
    for idx, img_file in enumerate(images):
        if img_file and img_file.filename:
            url = await save_upload(img_file, "notes")
            note_image = NoteImage(
                note_id=note.id,
                image_url=url,
                position=existing_count + idx,
            )
            db.add(note_image)

    db.commit()
    db.refresh(note)

    # Re-query with relationships for proper serialization
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
    ).filter(Note.id == note.id).first()

    return note


@app.get("/notes/{note_id}/history", response_model=List[NoteHistoryOut])
async def get_note_history(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get version history for a note (owner or admin only)."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    history = db.query(NoteHistory).filter(
        NoteHistory.note_id == note_id
    ).order_by(desc(NoteHistory.edited_at)).all()
    return history


@app.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note (owner or admin only). Cascading deletes images and history."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(note)
    db.commit()
    return {"msg": "Note deleted"}


# =============================================================================
# VOTING (UPVOTE)
# =============================================================================

@app.post("/notes/{note_id}/vote")
async def vote_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upvote a note. Adds +1 score to the note and +1 reputation to the author."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.score += 1

    # Award reputation to note author
    author = db.query(User).filter(User.id == note.user_id).first()
    if author:
        author.reputation_points += 1

    db.commit()
    return {"msg": "Vote recorded", "new_score": note.score, "user_has_voted": True}


@app.post("/notes/{note_id}/favorite")
async def toggle_favorite(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle favorite: add if not favorited, remove if already favorited."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    existing = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.note_id == note_id,
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"msg": "Removed from favorites", "is_favorited": False}
    fav = UserFavorite(user_id=current_user.id, note_id=note_id)
    db.add(fav)
    db.commit()
    return {"msg": "Added to favorites", "is_favorited": True}


@app.get("/users/me/favorites", response_model=List[NoteOut])
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List current user's favorite notes."""
    notes = (
        db.query(Note)
        .options(
            joinedload(Note.author),
            joinedload(Note.subject),
            joinedload(Note.images),
            joinedload(Note.tags),
        )
        .join(UserFavorite, UserFavorite.note_id == Note.id)
        .filter(UserFavorite.user_id == current_user.id)
        .order_by(desc(UserFavorite.created_at))
        .all()
    )
    return notes


# =============================================================================
# REVIEW ENDPOINTS
# =============================================================================

@app.get("/universities/{uni_id}/reviews", response_model=List[ReviewOut])
async def get_university_reviews(uni_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a university."""
    return db.query(Review).options(
        joinedload(Review.user)
    ).filter(Review.university_id == uni_id).order_by(desc(Review.created_at)).all()


@app.post("/reviews", response_model=ReviewOut)
async def add_review(
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a review to a note or university. Awards +1 reputation to note author."""
    new_review = Review(
        rating=review.rating,
        content=review.content,
        user_id=current_user.id,
        note_id=review.note_id,
        university_id=review.university_id,
    )
    db.add(new_review)

    # If reviewing a note, update score and give reputation to author
    if review.note_id:
        note = db.query(Note).filter(Note.id == review.note_id).first()
        if note:
            reviews = db.query(Review).filter(Review.note_id == review.note_id).all()
            total = sum(r.rating for r in reviews) + review.rating
            note.score = total / (len(reviews) + 1)
            author = db.query(User).filter(User.id == note.user_id).first()
            if author:
                author.reputation_points += 1

    db.commit()
    db.refresh(new_review)
    return new_review


# =============================================================================
# COMMENT ENDPOINTS
# =============================================================================

@app.get("/notes/{note_id}/comments", response_model=List[CommentOut])
async def get_comments(note_id: int, db: Session = Depends(get_db)):
    """Get all comments for a note."""
    return db.query(Comment).options(
        joinedload(Comment.user)
    ).filter(Comment.note_id == note_id).order_by(desc(Comment.created_at)).all()


@app.post("/notes/{note_id}/comments", response_model=CommentOut)
async def add_comment(
    note_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to a note."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    comment = Comment(content=payload.content, user_id=current_user.id, note_id=note_id)
    db.add(comment)
    if note.user_id != current_user.id:
        msg = f"{current_user.nickname} commented on your note: {(note.title or 'Untitled')[:50]}"
        db.add(Notification(user_id=note.user_id, type="comment", message=msg, related_id=note_id))
    db.commit()
    db.refresh(comment)
    return comment


# =============================================================================
# NOTIFICATIONS
# =============================================================================

@app.get("/notifications", response_model=List[NotificationOut])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = False,
):
    """List current user's notifications, newest first."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(desc(Notification.created_at)).limit(50).all()


@app.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    from datetime import datetime, timezone
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"msg": "Marked as read"}


@app.patch("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    from datetime import datetime, timezone
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at.is_(None)).update({Notification.read_at: datetime.now(timezone.utc)})
    db.commit()
    return {"msg": "All marked as read"}


# =============================================================================
# REPORTS
# =============================================================================

@app.post("/reports", response_model=ReportOut)
async def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Report a note or user (spam, abuse, etc.)."""
    if not payload.note_id and not payload.reported_user_id:
        raise HTTPException(status_code=400, detail="Provide note_id or reported_user_id")
    if payload.note_id:
        note = db.query(Note).filter(Note.id == payload.note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
    if payload.reported_user_id:
        u = db.query(User).filter(User.id == payload.reported_user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
    r = Report(reporter_id=current_user.id, note_id=payload.note_id, reported_user_id=payload.reported_user_id, reason=payload.reason[:100])
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# =============================================================================
# TAGS
# =============================================================================

@app.get("/tags", response_model=List[TagOut])
async def list_tags(db: Session = Depends(get_db)):
    """List all tags."""
    return db.query(Tag).order_by(Tag.name).all()


@app.post("/tags", response_model=TagOut)
async def create_tag(
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a tag (any logged-in user). Body: { \"name\": \"egzamin\" }."""
    name = (payload.name or "").strip()[:80]
    if not name:
        raise HTTPException(status_code=400, detail="Tag name required")
    existing = db.query(Tag).filter(Tag.name == name).first()
    if existing:
        return existing
    tag = Tag(name=name or "untitled")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


class NoteTagsUpdate(BaseModel):
    tag_ids: List[int] = []


@app.put("/notes/{note_id}/tags")
async def set_note_tags(
    note_id: int,
    payload: NoteTagsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set tags for a note (owner or admin). Body: { \"tag_ids\": [1, 2, 3] }."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.query(NoteTag).filter(NoteTag.note_id == note_id).delete()
    for tid in payload.tag_ids:
        if db.query(Tag).filter(Tag.id == tid).first():
            db.add(NoteTag(note_id=note_id, tag_id=tid))
    db.commit()
    return {"msg": "Tags updated", "tag_ids": payload.tag_ids}


# =============================================================================
# FEEDBACK
# =============================================================================

@app.post("/feedback", response_model=FeedbackOut)
async def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit user feedback (1-5 rating + optional comment)."""
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    f = Feedback(user_id=current_user.id, rating=payload.rating, comment=(payload.comment[:2000] if payload.comment else None))
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


# =============================================================================
# GLOBAL SEARCH
# =============================================================================

@app.get("/search/global")
async def global_search(q: str = "", db: Session = Depends(get_db)):
    """Search across fields of study and subjects. Uses joinedload to avoid N+1."""
    if not q.strip():
        return {"fields": [], "subjects": []}

    fields = db.query(FieldOfStudy).options(
        joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)
    ).filter(FieldOfStudy.name.ilike(f"%{q}%")).limit(20).all()

    subjects = db.query(Subject).options(
        joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)
    ).filter(Subject.name.ilike(f"%{q}%")).limit(20).all()

    return {
        "fields": [
            {
                "id": f.id,
                "name": f.name,
                "degree_level": f.degree_level,
                "faculty_id": f.faculty_id,
                "faculty_name": f.faculty.name if f.faculty else None,
                "university_id": f.faculty.university_id if f.faculty else None,
                "university_name": f.faculty.university.name if f.faculty and f.faculty.university else None,
            }
            for f in fields
        ],
        "subjects": [
            {
                "id": s.id,
                "name": s.name,
                "semester": s.semester,
                "field_of_study_id": s.field_of_study_id,
                "field_name": s.field_of_study.name if s.field_of_study else None,
                "faculty_name": (
                    s.field_of_study.faculty.name
                    if s.field_of_study and s.field_of_study.faculty else None
                ),
                "university_id": (
                    s.field_of_study.faculty.university_id
                    if s.field_of_study and s.field_of_study.faculty else None
                ),
                "university_name": (
                    s.field_of_study.faculty.university.name
                    if s.field_of_study and s.field_of_study.faculty and s.field_of_study.faculty.university else None
                ),
            }
            for s in subjects
        ],
    }


# =============================================================================
# STATISTICS & GAMIFICATION
# =============================================================================

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Return platform-wide statistics including latest activity."""
    users_count = db.query(sql_func.count(User.id)).scalar() or 0
    notes_count = db.query(sql_func.count(Note.id)).scalar() or 0
    universities_count = db.query(sql_func.count(University.id)).scalar() or 0

    latest_note = db.query(Note).order_by(desc(Note.created_at)).first()
    latest_user = db.query(User).order_by(desc(User.created_at)).first()
    latest_review = db.query(Review).order_by(desc(Review.created_at)).first()

    return {
        "users": users_count,
        "notes": notes_count,
        "universities": universities_count,
        "users_count": users_count,
        "notes_count": notes_count,
        "universities_count": universities_count,
        "latest_activity": {
            "latest_note": {
                "id": latest_note.id,
                "title": latest_note.title,
                "created_at": str(latest_note.created_at) if latest_note.created_at else None,
                "university_id": latest_note.university_id,
            } if latest_note else None,
            "latest_user": {
                "id": latest_user.id,
                "nickname": latest_user.nickname,
                "created_at": str(latest_user.created_at) if latest_user.created_at else None,
            } if latest_user else None,
            "latest_review": {
                "id": latest_review.id,
                "content": latest_review.content,
                "created_at": str(latest_review.created_at) if latest_review.created_at else None,
                "university_id": latest_review.university_id,
            } if latest_review else None,
        },
    }


@app.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    """Return top 5 users sorted by reputation, with batch activity counts."""
    users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    total_users = db.query(sql_func.count(User.id)).scalar() or 0

    user_ids = [u.id for u in users]
    notes_per_user = {}
    reviews_per_user = {}
    comments_per_user = {}

    if user_ids:
        for uid, c in db.query(
            Note.user_id, sql_func.count(Note.id)
        ).filter(Note.user_id.in_(user_ids)).group_by(Note.user_id).all():
            notes_per_user[uid] = c
        for uid, c in db.query(
            Review.user_id, sql_func.count(Review.id)
        ).filter(Review.user_id.in_(user_ids)).group_by(Review.user_id).all():
            reviews_per_user[uid] = c
        for uid, c in db.query(
            Comment.user_id, sql_func.count(Comment.id)
        ).filter(Comment.user_id.in_(user_ids)).group_by(Comment.user_id).all():
            comments_per_user[uid] = c

    leaderboard = []
    for rank, user in enumerate(users, start=1):
        nc = notes_per_user.get(user.id, 0)
        rvc = reviews_per_user.get(user.id, 0)
        cc = comments_per_user.get(user.id, 0)
        leaderboard.append({
            "rank": rank,
            "user_id": user.id,
            "nickname": user.nickname,
            "avatar_url": user.avatar_url,
            "reputation_points": user.reputation_points,
            "uploads_count": user.uploads_count,
            "notes_count": nc,
            "total_score": user.reputation_points,
            "reviews_count": rvc,
            "comments_count": cc,
            "total_activity": nc + rvc + cc,
        })

    return {"leaderboard": leaderboard, "total_users": total_users}


@app.get("/activity-feed")
async def get_activity_feed(db: Session = Depends(get_db)):
    """Return the 5 most recent activities (notes and reviews combined)."""
    recent_notes = db.query(Note).options(
        joinedload(Note.author)
    ).order_by(desc(Note.created_at)).limit(5).all()

    recent_reviews = db.query(Review).options(
        joinedload(Review.user), joinedload(Review.note)
    ).order_by(desc(Review.created_at)).limit(5).all()

    activities = []
    for note in recent_notes:
        activities.append({
            "type": "note",
            "title": note.title,
            "description": note.content[:200] if note.content else None,
            "created_at": str(note.created_at) if note.created_at else None,
            "user_nickname": note.author.nickname if note.author else "Anonymous",
        })
    for review in recent_reviews:
        activities.append({
            "type": "review",
            "rating": review.rating,
            "comment": review.content,
            "created_at": str(review.created_at) if review.created_at else None,
            "user_nickname": review.user.nickname if review.user else "Anonymous",
            "note_title": review.note.title if review.note else None,
        })

    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return activities[:5]


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@app.get("/admin/pending_items", response_model=PendingItemsResponse)
async def get_pending_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all pending items for admin review. Uses joinedload to avoid N+1."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    notes = db.query(Note).options(
        joinedload(Note.subject),
        joinedload(Note.university),
        joinedload(Note.author),
        joinedload(Note.images),
    ).filter(Note.is_approved == False).all()

    universities = db.query(University).filter(University.is_approved == False).all()
    faculties = db.query(Faculty).options(joinedload(Faculty.university)).filter(Faculty.is_approved == False).all()
    fields = db.query(FieldOfStudy).options(joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)).filter(FieldOfStudy.is_approved == False).all()
    subjects = db.query(Subject).options(
        joinedload(Subject.field_of_study).joinedload(FieldOfStudy.faculty).joinedload(Faculty.university)
    ).filter(Subject.is_approved == False).all()

    image_requests_raw = db.query(ImageRequest).options(
        joinedload(ImageRequest.university)
    ).filter(ImageRequest.status == "pending").all()

    image_requests = [
        ImageRequestOut(
            id=r.id,
            university_id=r.university_id,
            new_image_url=r.new_image_url,
            status=r.status,
            submitted_by_id=r.submitted_by_id,
            created_at=r.created_at,
            university_name=r.university.name if r.university else None,
        )
        for r in image_requests_raw
    ]

    return PendingItemsResponse(
        notes=notes,
        universities=universities,
        faculties=faculties,
        fields=fields,
        subjects=subjects,
        image_requests=image_requests,
    )


@app.get("/admin/users", response_model=List[UserOut])
async def admin_get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(User).order_by(User.created_at.desc()).all()


class BanUserBody(BaseModel):
    banned: bool


@app.patch("/admin/users/{user_id}/ban")
async def admin_ban_user(
    user_id: int,
    body: BanUserBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ban or unban a user (admin only). Cannot ban self or another admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    if target.is_admin:
        raise HTTPException(status_code=400, detail="Cannot ban an admin")
    target.is_banned = body.banned
    db.commit()
    return {"msg": "User banned" if body.banned else "User unbanned", "user_id": user_id}


@app.post("/admin/approve/{item_type}/{item_id}")
async def approve_item(
    item_type: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a pending item."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    model_map = {
        "university": University,
        "faculty": Faculty,
        "field": FieldOfStudy,
        "subject": Subject,
        "note": Note,
    }
    model = model_map.get(item_type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid item type")

    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_approved = True
    if item_type == "note" and hasattr(item, "user_id"):
        db.add(Notification(user_id=item.user_id, type="note_approved", message="Your note was approved.", related_id=item_id))
    db.commit()
    return {"msg": f"{item_type} approved"}


@app.delete("/admin/reject/{item_type}/{item_id}")
async def reject_item(
    item_type: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject and delete a pending item."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    model_map = {
        "university": University,
        "faculty": Faculty,
        "field": FieldOfStudy,
        "subject": Subject,
        "note": Note,
    }
    model = model_map.get(item_type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid item type")

    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"msg": f"{item_type} rejected"}


@app.get("/admin/reports", response_model=List[ReportOut])
async def admin_list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
):
    """List all reports (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    q = db.query(Report).order_by(desc(Report.created_at))
    if status_filter in ("pending", "resolved", "dismissed"):
        q = q.filter(Report.status == status_filter)
    return q.all()


@app.patch("/admin/reports/{report_id}")
async def admin_update_report(
    report_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set report status to resolved or dismissed (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    if status not in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Status must be resolved or dismissed")
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    r.status = status
    db.commit()
    return {"msg": "Report updated", "status": status}


@app.get("/admin/feedback", response_model=List[FeedbackOut])
async def admin_list_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all user feedback (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return db.query(Feedback).order_by(desc(Feedback.created_at)).all()


@app.post("/universities/{uni_id}/image_request")
async def request_image_change(
    uni_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an image change request for a university."""
    url = await save_upload(image, "universities")
    req = ImageRequest(
        university_id=uni_id,
        new_image_url=url,
        submitted_by_id=current_user.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"msg": "Image request submitted", "id": req.id}


@app.post("/admin/approve_image_request/{req_id}")
async def approve_image_request(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve an image change request."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    req = db.query(ImageRequest).filter(ImageRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    uni = db.query(University).filter(University.id == req.university_id).first()
    if uni:
        uni.image_url = req.new_image_url
    req.status = "approved"
    db.commit()
    return {"msg": "Image request approved"}


@app.post("/admin/reject_image_request/{req_id}")
async def reject_image_request(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject an image change request."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    req = db.query(ImageRequest).filter(ImageRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "rejected"
    db.commit()
    return {"msg": "Image request rejected"}


@app.patch("/admin/universities/{uni_id}/image")
async def admin_update_university_image(
    uni_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Directly update university image (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    uni = db.query(University).filter(University.id == uni_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    uni.image_url = await save_upload(image, "universities")
    db.commit()
    db.refresh(uni)
    return {"msg": "Image updated", "image_url": uni.image_url}
