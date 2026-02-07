"""
S3-style upload: Phase 1 request presigned URL, Phase 3 confirm and save attachment to note.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AsyncSessionDep, CurrentUser
from app.core.enums import ProcessingStatus
from app.domain.models import Attachment, Note
from app.schemas.domain import AttachmentConfirmCreate
from app.schemas.upload import PresignedUploadRequest, PresignedUploadResponse
from app.services.file_service import file_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/presigned", response_model=PresignedUploadResponse)
async def get_presigned_upload_url(
    payload: PresignedUploadRequest,
    current_user: CurrentUser,
):
    """
    Phase 1: Client requests an upload URL for a file.
    Backend validates file type and returns presigned PUT URL (or mock).
    """
    try:
        out = file_service.generate_presigned_post(
            filename=payload.filename,
            file_type=payload.file_type,
        )
        return PresignedUploadResponse(
            upload_url=out["upload_url"],
            method=out["method"],
            key=out["key"],
            expires_in_seconds=out["expires_in_seconds"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/notes/{note_id}/attachments/confirm")
async def confirm_attachment_upload(
    note_id: int,
    payload: AttachmentConfirmCreate,
    db: AsyncSession = AsyncSessionDep,
    current_user: CurrentUser,
):
    """
    Phase 3: After client uploads to the presigned URL, they call this to record
    the attachment (key, file_type, file_size_bytes) for the note.
    Builds file_url from key (or uses key as url for mock).
    """
    result = await db.execute(
        select(Note).where(Note.id == note_id).where(Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # S3 pattern: file_key is the object key; file_url from presigned/base URL
    file_url = payload.key  # In production: build from bucket + key
    attachment = Attachment(
        note_id=note_id,
        file_key=payload.key,
        file_url=file_url,
        file_type=payload.file_type,
        file_size_bytes=payload.file_size_bytes,
        processing_status=ProcessingStatus.COMPLETED,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return {"id": attachment.id, "note_id": attachment.note_id, "file_url": attachment.file_url}
