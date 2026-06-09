"""User profile and favorites."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Note, UserFavorite, Review, Comment
from app.schemas import UserOut, PublicUserOut, NoteOut
from app.services.file_manager import save_upload, normalize_stored_path, DIR_AVATARS

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    out = UserOut.model_validate(current_user)
    if out.avatar_url:
        out.avatar_url = normalize_stored_path(out.avatar_url)
    return out


@router.put("/me", response_model=UserOut)
async def update_me(
    nickname: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile, including avatar upload."""
    if nickname is not None:
        current_user.nickname = nickname
    if bio is not None:
        current_user.bio = bio
    if avatar and avatar.filename:
        current_user.avatar_url = save_upload(avatar, DIR_AVATARS)
    db.commit()
    db.refresh(current_user)
    out = UserOut.model_validate(current_user)
    if out.avatar_url:
        out.avatar_url = normalize_stored_path(out.avatar_url)
    return out


@router.get("/{user_id}", response_model=PublicUserOut)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get public user profile by ID (no email)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    out = PublicUserOut.model_validate(user)
    if out.avatar_url:
        out.avatar_url = normalize_stored_path(out.avatar_url)
    return out


@router.get("/me/favorites", response_model=List[NoteOut])
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
            selectinload(Note.images),
            selectinload(Note.tags),
        )
        .join(UserFavorite, UserFavorite.note_id == Note.id)
        .filter(UserFavorite.user_id == current_user.id)
        .order_by(desc(UserFavorite.created_at))
        .all()
    )
    return [_note_out_with_normalized_paths(n) for n in notes]


@router.get("/me/dashboard")
async def get_my_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User dashboard with stats, notes, favorites, and pending submissions."""
    from sqlalchemy import func as sqlfunc

    # User stats
    notes_count = db.query(sqlfunc.count(Note.id)).filter(Note.user_id == current_user.id).scalar() or 0
    reviews_count = db.query(sqlfunc.count(Review.id)).filter(Review.user_id == current_user.id).scalar() or 0
    comments_count = db.query(sqlfunc.count(Comment.id)).filter(Comment.user_id == current_user.id).scalar() or 0
    favorites_count = db.query(sqlfunc.count(UserFavorite.id)).filter(UserFavorite.user_id == current_user.id).scalar() or 0

    # Reputation rank
    rank = db.query(sqlfunc.count(User.id)).filter(
        User.reputation_points > (current_user.reputation_points or 0),
    ).scalar() or 0
    rank += 1  # 1-indexed

    # My notes
    my_notes = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        selectinload(Note.images),
    ).filter(Note.user_id == current_user.id).order_by(desc(Note.created_at)).limit(10).all()

    # My favorites
    my_favs = (
        db.query(Note)
        .options(joinedload(Note.author), joinedload(Note.subject), selectinload(Note.images))
        .join(UserFavorite, UserFavorite.note_id == Note.id)
        .filter(UserFavorite.user_id == current_user.id)
        .order_by(desc(UserFavorite.created_at))
        .limit(10)
        .all()
    )

    # Pending submissions
    pending_notes = db.query(sqlfunc.count(Note.id)).filter(
        Note.user_id == current_user.id, Note.is_approved == False,
    ).scalar() or 0

    return {
        "stats": {
            "notes_count": notes_count,
            "reviews_count": reviews_count,
            "comments_count": comments_count,
            "favorites_count": favorites_count,
            "reputation_points": current_user.reputation_points or 0,
            "reputation_rank": rank,
        },
        "my_notes": [_note_out_with_normalized_paths(n) for n in my_notes],
        "my_favorites": [_note_out_with_normalized_paths(n) for n in my_favs],
        "pending_submissions": {
            "notes": pending_notes,
        },
    }


def _note_out_with_normalized_paths(note: Note) -> NoteOut:
    """Build NoteOut and normalize image URLs to forward slashes."""
    out = NoteOut.model_validate(note)
    if out.image_url:
        out.image_url = normalize_stored_path(out.image_url)
    if out.author and out.author.avatar_url:
        out.author.avatar_url = normalize_stored_path(out.author.avatar_url)
    for img in out.images or []:
        img.image_url = normalize_stored_path(img.image_url) or img.image_url
    return out
