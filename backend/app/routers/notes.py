"""Notes CRUD, comments, voting, favorites, tags and reviews."""
from typing import Annotated, List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.deps import CurrentUser, NoteServiceDep, OptionalUser, ReviewServiceDep
from app.schemas import (
    CommentCreate,
    CommentOut,
    FavoriteResponse,
    NoteFilters,
    NoteHistoryOut,
    NoteOut,
    NoteTagsUpdate,
    PaginatedNotesResponse,
    ReviewCreate,
    ReviewOut,
    TagCreate,
    TagOut,
    VoteResponse,
)
from app.services.note_service import increment_view_count

router = APIRouter(tags=["notes"])


@router.post("/notes", response_model=NoteOut)
def create_note(
    current_user: CurrentUser,
    service: NoteServiceDep,
    title: str = Form(None),
    content: Optional[str] = Form(None),
    university_id: int = Form(...),
    subject_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    files: List[UploadFile] = File(default=[]),
):
    """Create a note with optional images and up to 10 file attachments."""
    return service.create(
        current_user, title=title, content=content, university_id=university_id,
        subject_id=subject_id, image=image, images=images, files=files,
    )


@router.get("/notes", response_model=PaginatedNotesResponse)
def get_notes(filters: Annotated[NoteFilters, Query()], service: NoteServiceDep):
    """List approved notes with filters, search, and pagination."""
    notes, total = service.list_public(filters)
    return {"items": notes, "total": total, "page": filters.page, "page_size": filters.page_size}


@router.get("/notes/{note_id}", response_model=NoteOut)
def get_note(note_id: int, background_tasks: BackgroundTasks, current_user: OptionalUser, service: NoteServiceDep):
    """Get a note by ID; increment view count asynchronously."""
    note = service.get_for_view(note_id, current_user)
    background_tasks.add_task(increment_view_count, note_id)
    return note


@router.put("/notes/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    current_user: CurrentUser,
    service: NoteServiceDep,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    images: List[UploadFile] = File(default=[]),
    files: List[UploadFile] = File(default=[]),
):
    """Update a note (owner or admin). Saves the previous version to history."""
    return service.update(
        current_user, note_id, title=title, content=content, image=image, images=images, files=files,
    )


@router.get("/notes/{note_id}/history", response_model=List[NoteHistoryOut])
def get_note_history(note_id: int, current_user: CurrentUser, service: NoteServiceDep):
    """Get version history for a note (owner or admin)."""
    return service.history(current_user, note_id)


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, current_user: CurrentUser, service: NoteServiceDep):
    """Delete a note (owner or admin) together with its files."""
    service.delete(current_user, note_id)
    return {"msg": "Note deleted"}


@router.get("/notes/{note_id}/download/{file_id}")
def download_note_file(note_id: int, file_id: int, current_user: CurrentUser, service: NoteServiceDep):
    """Download a note attachment (requires login). Increments the download counter."""
    path, filename = service.get_download(current_user, note_id, file_id)
    return FileResponse(path=str(path), filename=filename, media_type="application/octet-stream")


@router.post("/notes/{note_id}/vote", response_model=VoteResponse)
def vote_note(note_id: int, current_user: CurrentUser, service: NoteServiceDep):
    """Toggle upvote on a note. Vote again to remove your vote."""
    score, has_voted = service.vote(current_user, note_id)
    return {"msg": "Vote toggled", "new_score": score, "user_has_voted": has_voted}


@router.post("/notes/{note_id}/favorite", response_model=FavoriteResponse)
def toggle_favorite(note_id: int, current_user: CurrentUser, service: NoteServiceDep):
    """Toggle favorite for current user."""
    if service.toggle_favorite(current_user, note_id):
        return {"msg": "Added to favorites", "is_favorited": True}
    return {"msg": "Removed from favorites", "is_favorited": False}


@router.get("/notes/{note_id}/comments", response_model=List[CommentOut])
def get_comments(note_id: int, current_user: OptionalUser, service: NoteServiceDep):
    """List comments for a note."""
    return service.list_comments(note_id, current_user)


@router.post("/notes/{note_id}/comments", response_model=CommentOut)
def add_comment(note_id: int, payload: CommentCreate, current_user: CurrentUser, service: NoteServiceDep):
    """Add a comment to a note."""
    return service.add_comment(current_user, note_id, payload.content)


@router.post("/reviews", response_model=ReviewOut)
def add_review(review: ReviewCreate, current_user: CurrentUser, service: ReviewServiceDep):
    """Add a review to a note or university."""
    return service.add_review(current_user, review)


@router.get("/tags", response_model=List[TagOut])
def list_tags(service: NoteServiceDep):
    """List all tags."""
    return service.list_tags()


@router.post("/tags", response_model=TagOut)
def create_tag(payload: TagCreate, current_user: CurrentUser, service: NoteServiceDep):
    """Create a tag, or return the existing one with the same name."""
    return service.create_tag(payload.name)


@router.put("/notes/{note_id}/tags")
def set_note_tags(note_id: int, payload: NoteTagsUpdate, current_user: CurrentUser, service: NoteServiceDep):
    """Set tags for a note (owner or admin). Body: { "tag_ids": [1, 2, 3] }."""
    assigned = service.set_tags(current_user, note_id, payload.tag_ids)
    return {"msg": "Tags updated", "tag_ids": assigned}
