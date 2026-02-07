"""
Notes API with Give-to-Get (Leech Protection).

Uses NotePermissionService for per-note access resolution.
Never returns 403 for restricted content; returns sanitized DTO with masked
file_url/description so frontend can show blurred preview with CTA to contribute.
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import AsyncSessionDep, CurrentUser, CurrentUserOptional, NoteAccessLevel
from app.core.enums import NoteVisibility
from app.domain.models import Note
from app.schemas.domain import AttachmentOut, NoteCreate, NoteOut
from app.schemas.permission import PermissionState
from app.services.note_permission_service import AccessResolution, note_permission_service
from app.services.note_service import note_service

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/access-level", response_model=PermissionState)
async def get_my_note_access_level(access: NoteAccessLevel):
    """Return current user's give-to-get permission state. Frontend uses this for CTA visibility."""
    return access


def _build_note_out(
    note: Note,
    access: AccessResolution,
    attachment_dicts: list[dict],
) -> NoteOut:
    """Build NoteOut from note, access resolution, and pre-built attachment dicts."""
    return NoteOut(
        id=note.id,
        title=note.title,
        description=note.description if access.can_view_full_content else None,
        visibility=note.visibility,
        user_id=note.user_id,
        subject_id=note.subject_id,
        created_at=note.created_at,
        updated_at=note.updated_at,
        attachments=[AttachmentOut(**a) for a in attachment_dicts],
    )


@router.get("", response_model=List[NoteOut])
async def list_notes(
    subject_id: Optional[int] = None,
    db: AsyncSession = AsyncSessionDep,
    current_user: CurrentUserOptional = ...,  # Optional auth; unauthenticated can see public notes (preview)
):
    """
    List notes visible to the viewer.
    - Own notes: always included (including drafts with subject_id=None).
    - Others' PUBLIC notes: included (full or preview per give-to-get).
    - Others' PRIVATE notes: excluded.
    """
    q = (
        select(Note)
        .options(selectinload(Note.attachments))
        .order_by(Note.updated_at.desc())
    )
    if subject_id is not None:
        q = q.where(Note.subject_id == subject_id)

    # Visibility filter: own notes OR public notes
    if current_user:
        q = q.where(
            or_(
                Note.user_id == current_user.id,
                Note.visibility == NoteVisibility.PUBLIC,
            )
        )
    else:
        q = q.where(Note.visibility == NoteVisibility.PUBLIC)

    result = await db.execute(q)
    notes = result.scalars().all()

    out_list = []
    for n in notes:
        access = await note_permission_service.resolve_access(n, current_user, db)
        att_dicts = note_permission_service.build_attachment_dicts(
            n, mask_urls=not access.can_view_full_content
        )
        out_list.append(
            _build_note_out(n, access, att_dicts)
        )

    return out_list


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: int,
    db: AsyncSession = AsyncSessionDep,
    current_user: CurrentUserOptional = None,
):
    """
    Get a single note. Private notes: 404 if not owner.
    Public notes: full or sanitized DTO per give-to-get (no 403).
    """
    result = await db.execute(
        select(Note)
        .options(selectinload(Note.attachments))
        .where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    is_owner = current_user and note.user_id == current_user.id
    if note.visibility == NoteVisibility.PRIVATE and not is_owner:
        raise HTTPException(status_code=404, detail="Note not found")

    access = await note_permission_service.resolve_access(note, current_user, db)
    att_dicts = note_permission_service.build_attachment_dicts(
        note, mask_urls=not access.can_view_full_content
    )
    return _build_note_out(note, access, att_dicts)


@router.post("", response_model=NoteOut)
async def create_note(
    payload: NoteCreate,
    db: AsyncSession = AsyncSessionDep,
    current_user: CurrentUser = ...,
):
    """
    Create a note (requires auth).
    Quick-capture: subject_id=None for draft. Rule: visibility=PUBLIC requires subject_id.
    """
    note_service.validate_create(payload)

    note = Note(
        title=payload.title,
        description=payload.description,
        visibility=payload.visibility,
        user_id=current_user.id,
        subject_id=payload.subject_id,
    )
    db.add(note)
    await db.flush()

    # Increment uploaded_notes_count for give-to-get contributor status
    current_user.uploaded_notes_count = (current_user.uploaded_notes_count or 0) + 1

    await db.commit()
    await db.refresh(note)

    result = await db.execute(
        select(Note)
        .options(selectinload(Note.attachments))
        .where(Note.id == note.id)
    )
    note = result.scalar_one()
    access = await note_permission_service.resolve_access(note, current_user, db)
    att_dicts = note_permission_service.build_attachment_dicts(note, mask_urls=False)
    return _build_note_out(note, access, att_dicts)
