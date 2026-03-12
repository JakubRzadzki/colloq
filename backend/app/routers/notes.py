"""Notes CRUD, comments, voting (atomic), favorites, tags. File cleanup on delete."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models import (
    User,
    Note,
    NoteFile,
    NoteImage,
    NoteHistory,
    NoteTag,
    Tag,
    Comment,
    Review,
    UserFavorite,
    Notification,
    Subject,
    Vote,
)
from app.schemas import (
    NoteOut,
    NoteHistoryOut,
    CommentCreate,
    CommentOut,
    ReviewCreate,
    ReviewOut,
    TagOut,
    TagCreate,
    NoteTagsUpdate,
    VoteResponse,
    FavoriteResponse,
)
from app.services.file_manager import (
    save_upload,
    save_upload_for_note,
    delete_file,
    normalize_stored_path,
    DIR_NOTES,
)

router = APIRouter(tags=["notes"])


def _note_out(note: Note) -> NoteOut:
    """Build NoteOut with normalized image and file paths (forward slashes)."""
    out = NoteOut.model_validate(note)
    if out.image_url:
        out.image_url = normalize_stored_path(out.image_url)
    if out.author and getattr(out.author, "avatar_url", None):
        out.author.avatar_url = normalize_stored_path(out.author.avatar_url)
    for img in out.images or []:
        img.image_url = normalize_stored_path(img.image_url) or img.image_url
    for f in out.files or []:
        f.file_url = normalize_stored_path(f.file_url) or f.file_url
    return out


MAX_FILES_PER_NOTE = 10


@router.post("/notes", response_model=NoteOut)
async def create_note(
    title: str = Form(None),
    content: Optional[str] = Form(None),
    university_id: int = Form(...),
    subject_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a note with optional images and up to 10 file attachments."""
    if len(files) > MAX_FILES_PER_NOTE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_FILES_PER_NOTE} files per note allowed.",
        )
    image_url = None
    if image and image.filename:
        image_url = save_upload(image, DIR_NOTES)
    note = Note(
        title=title,
        content=content,
        image_url=image_url,
        user_id=current_user.id,
        university_id=university_id,
        subject_id=subject_id,
    )
    db.add(note)
    db.flush()
    for idx, img_file in enumerate(images):
        if img_file and img_file.filename:
            url = save_upload(img_file, DIR_NOTES)
            db.add(NoteImage(note_id=note.id, image_url=url, position=idx))
    for f in files:
        if f and f.filename:
            file_url, file_type, file_name = save_upload_for_note(f, note.id)
            db.add(NoteFile(note_id=note.id, file_url=file_url, file_type=file_type, file_name=file_name))
    current_user.uploads_count = (current_user.uploads_count or 0) + 1
    current_user.reputation_points = (current_user.reputation_points or 0) + 10
    db.commit()
    db.refresh(note)
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.files),
        joinedload(Note.tags),
    ).filter(Note.id == note.id).first()
    return _note_out(note)


@router.get("/notes")
async def get_notes(
    university_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    semester: Optional[int] = None,
    tag_ids: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    """List notes with filters, search, and pagination."""
    page = max(1, page)
    page_size = max(1, min(page_size, 100))

    query = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.files),
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
        query = query.filter(or_(Note.title.ilike(q), Note.content.ilike(q)))
    if sort == "score":
        query = query.order_by(desc(Note.score), desc(Note.created_at))
    elif sort == "views":
        query = query.order_by(desc(Note.view_count), desc(Note.created_at))
    else:
        query = query.order_by(desc(Note.created_at))

    # Count total before pagination
    from sqlalchemy import func as sqlfunc
    total = query.distinct().with_entities(sqlfunc.count(Note.id)).scalar() or 0

    # Apply pagination
    notes = query.distinct().offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [_note_out(n) for n in notes],
        "total": total,
        "page": page,
        "page_size": page_size,
    }



@router.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a note by ID; increment view count."""
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.files),
        joinedload(Note.tags),
    ).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.view_count = (note.view_count or 0) + 1
    db.commit()
    return _note_out(note)


@router.put("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: int,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a note (owner only). Saves previous version to history."""
    note = db.query(Note).options(joinedload(Note.images), joinedload(Note.files)).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if len(files) > MAX_FILES_PER_NOTE:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_NOTE} files per note allowed.")
    db.add(NoteHistory(note_id=note.id, title=note.title, content=note.content, edited_by=current_user.id))
    if title is not None:
        note.title = title
    if content is not None:
        note.content = content
    if image and image.filename:
        note.image_url = save_upload(image, DIR_NOTES)
    existing_count = len(note.images) if note.images else 0
    for idx, img_file in enumerate(images):
        if img_file and img_file.filename:
            url = save_upload(img_file, DIR_NOTES)
            db.add(NoteImage(note_id=note.id, image_url=url, position=existing_count + idx))
    for f in files:
        if f and f.filename:
            file_url, file_type, file_name = save_upload_for_note(f, note.id)
            db.add(NoteFile(note_id=note.id, file_url=file_url, file_type=file_type, file_name=file_name))
    db.commit()
    db.refresh(note)
    note = db.query(Note).options(
        joinedload(Note.author),
        joinedload(Note.subject),
        joinedload(Note.images),
        joinedload(Note.files),
        joinedload(Note.tags),
    ).filter(Note.id == note.id).first()
    return _note_out(note)


@router.get("/notes/{note_id}/history", response_model=List[NoteHistoryOut])
async def get_note_history(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get version history for a note (owner or admin)."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    history = db.query(NoteHistory).filter(
        NoteHistory.note_id == note_id,
    ).order_by(desc(NoteHistory.edited_at)).all()
    return history


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note (owner or admin). Removes DB record and all files from disk."""
    note = db.query(Note).options(joinedload(Note.images), joinedload(Note.files)).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    if note.image_url:
        delete_file(note.image_url)
    for img in note.images or []:
        if img.image_url:
            delete_file(img.image_url)
    for f in note.files or []:
        if f.file_url:
            delete_file(f.file_url)
    db.delete(note)
    db.commit()
    return {"msg": "Note deleted"}


@router.get("/notes/{note_id}/download/{file_id}")
async def download_note_file(
    note_id: int,
    file_id: int,
    db: Session = Depends(get_db),
):
    """Download a specific file from a note. Increments download counter."""
    from fastapi.responses import FileResponse
    from pathlib import Path as PathLib

    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note_file = db.query(NoteFile).filter(
        NoteFile.id == file_id,
        NoteFile.note_id == note_id,
    ).first()
    if not note_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Resolve file path
    from app.services.file_manager import _resolve_physical_path
    file_path = _resolve_physical_path(note_file.file_url)
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Increment download counter
    note.download_count = (note.download_count or 0) + 1
    db.commit()

    return FileResponse(
        path=str(file_path),
        filename=note_file.file_name,
        media_type="application/octet-stream",
    )



@router.post("/notes/{note_id}/vote", response_model=VoteResponse)
async def vote_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle upvote on a note. Vote again to remove your vote."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    existing_vote = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.note_id == note_id,
    ).first()

    if existing_vote:
        # Remove existing vote (toggle off)
        db.delete(existing_vote)
        author = db.query(User).filter(User.id == note.user_id).first()
        if author:
            author.reputation_points = max((author.reputation_points or 0) - 1, 0)
    else:
        # Add new vote
        db.add(Vote(user_id=current_user.id, note_id=note_id, value=1))
        author = db.query(User).filter(User.id == note.user_id).first()
        if author:
            author.reputation_points = (author.reputation_points or 0) + 1

    # Flush to ensure new or deleted votes are visible to the sum query
    db.flush()
    # Recalculate score from votes table
    from sqlalchemy import func as sqlfunc
    total_score = db.query(sqlfunc.coalesce(sqlfunc.sum(Vote.value), 0)).filter(
        Vote.note_id == note_id,
    ).scalar()
    note.score = float(total_score)

    db.commit()
    user_has_voted = db.query(Vote).filter(
        Vote.user_id == current_user.id,
        Vote.note_id == note_id,
    ).first() is not None
    return {"msg": "Vote toggled", "new_score": note.score, "user_has_voted": user_has_voted}



@router.post("/notes/{note_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle favorite for current user."""
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
    db.add(UserFavorite(user_id=current_user.id, note_id=note_id))
    db.commit()
    return {"msg": "Added to favorites", "is_favorited": True}


@router.get("/notes/{note_id}/comments", response_model=List[CommentOut])
async def get_comments(note_id: int, db: Session = Depends(get_db)):
    """List comments for a note."""
    return db.query(Comment).options(
        joinedload(Comment.user),
    ).filter(Comment.note_id == note_id).order_by(desc(Comment.created_at)).all()


@router.post("/notes/{note_id}/comments", response_model=CommentOut)
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


@router.post("/reviews", response_model=ReviewOut)
async def add_review(
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a review to a note or university."""
    new_review = Review(
        rating=review.rating,
        content=review.content,
        user_id=current_user.id,
        note_id=review.note_id,
        university_id=review.university_id,
    )
    db.add(new_review)
    if review.note_id:
        note = db.query(Note).filter(Note.id == review.note_id).first()
        if note:
            reviews = db.query(Review).filter(Review.note_id == review.note_id).all()
            total = sum(r.rating for r in reviews) + review.rating
            note.score = total / (len(reviews) + 1)
            author = db.query(User).filter(User.id == note.user_id).first()
            if author:
                author.reputation_points = (author.reputation_points or 0) + 1
    db.commit()
    db.refresh(new_review)
    return new_review


@router.get("/tags", response_model=List[TagOut])
async def list_tags(db: Session = Depends(get_db)):
    """List all tags."""
    return db.query(Tag).order_by(Tag.name).all()


@router.post("/tags", response_model=TagOut)
async def create_tag(
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a tag."""
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


@router.put("/notes/{note_id}/tags")
async def set_note_tags(
    note_id: int,
    payload: NoteTagsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set tags for a note (owner or admin). Body: { \"tag_ids\": [1, 2, 3] }."""
    tag_ids = payload.tag_ids
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.query(NoteTag).filter(NoteTag.note_id == note_id).delete()
    for tid in tag_ids:
        if db.query(Tag).filter(Tag.id == tid).first():
            db.add(NoteTag(note_id=note_id, tag_id=tid))
    db.commit()
    return {"msg": "Tags updated", "tag_ids": payload.tag_ids}
