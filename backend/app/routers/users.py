"""User profile and favorites."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import func

from app.core.deps import CurrentUser, DbSession, UserServiceDep
from app.models import Comment, Note, Review, User, UserFavorite
from app.repositories.note_repository import NoteRepository
from app.schemas import NoteOut, PublicUserOut, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: CurrentUser):
    """Get current authenticated user."""
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    current_user: CurrentUser,
    service: UserServiceDep,
    nickname: str | None = Form(None),
    bio: str | None = Form(None),
    avatar: UploadFile | None = File(None),
):
    """Update current user profile. Nickname: 1-100 characters after trimming, unique (409 if taken)."""
    return service.update_profile(current_user, nickname=nickname, bio=bio, avatar=avatar)


@router.get("/{user_id}", response_model=PublicUserOut)
def get_user(user_id: int, db: DbSession):
    """Get public user profile by ID (no email)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me/favorites", response_model=list[NoteOut])
def get_my_favorites(
    current_user: CurrentUser,
    db: DbSession,
):
    """List current user's favorite notes."""
    return NoteRepository(db).list_favorites(current_user.id)


@router.get("/me/dashboard")
def get_my_dashboard(
    current_user: CurrentUser,
    db: DbSession,
):
    """User dashboard with stats, notes, favorites, and pending submissions."""

    notes_count = db.query(func.count(Note.id)).filter(Note.user_id == current_user.id).scalar() or 0
    reviews_count = db.query(func.count(Review.id)).filter(Review.user_id == current_user.id).scalar() or 0
    comments_count = db.query(func.count(Comment.id)).filter(Comment.user_id == current_user.id).scalar() or 0
    favorites_count = (
        db.query(func.count(UserFavorite.id)).filter(UserFavorite.user_id == current_user.id).scalar() or 0
    )

    rank = db.query(func.count(User.id)).filter(
        User.reputation_points > (current_user.reputation_points or 0),
    ).scalar() or 0
    rank += 1  # 1-indexed

    notes = NoteRepository(db)
    my_notes = notes.list_by_author(current_user.id, limit=10)
    my_favs = notes.list_favorites(current_user.id, limit=10)

    pending_notes = db.query(func.count(Note.id)).filter(
        Note.user_id == current_user.id, Note.is_approved.is_(False),
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
        "my_notes": [NoteOut.model_validate(n) for n in my_notes],
        "my_favorites": [NoteOut.model_validate(n) for n in my_favs],
        "pending_submissions": {
            "notes": pending_notes,
        },
    }
