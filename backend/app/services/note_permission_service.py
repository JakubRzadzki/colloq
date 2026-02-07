"""
NotePermissionService — Give-to-Get (Leech Protection) business logic.

Implements per-note access resolution: draft check, owner check, and public
give-to-get rules. Never raises 403; returns sanitized DTO when full access
is denied so the frontend can render a blurred preview with CTA to contribute.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NoteVisibility, UserRole
from app.domain.models import Note, User


@dataclass(frozen=True)
class AccessResolution:
    """
    Result of resolving note access for a viewer.
    - can_view_full_content: True = return full DTO; False = return sanitized (preview) DTO.
    - reason: human-readable reason for logging/UX.
    """

    can_view_full_content: bool
    reason: str  # "owner" | "admin" | "contributor" | "must_contribute_first" | "unauthenticated"


class NotePermissionService:
    """
    Encapsulates give-to-get and draft visibility rules.
    Use resolve_access() to determine what a viewer may see for a given note.
    """

    @staticmethod
    async def resolve_access(
        note: Note,
        viewer: Optional[User],
        session: AsyncSession,
    ) -> AccessResolution:
        """
        Determine access level for a viewer viewing a given note.

        Rules:
        1. Draft check: Owner ALWAYS sees their own notes (even if subject_id is None).
        2. Private note: Only owner sees it (handled by caller — don't expose in list).
        3. Public note, another user's:
           - Unauthenticated → preview (must_contribute_first / unauthenticated)
           - ADMIN → full
           - Contributor (uploaded_notes_count >= 1) → full
           - Non-contributor → preview (sanitized DTO, no 403)
        """
        # Owner: always full access (draft, private, or public)
        if viewer and note.user_id == viewer.id:
            return AccessResolution(can_view_full_content=True, reason="owner")

        # Private note: only owner can see; if we reach here with another user, treat as no access
        if note.visibility == NoteVisibility.PRIVATE:
            return AccessResolution(can_view_full_content=False, reason="private_note")

        # Public note, non-owner
        if viewer is None:
            return AccessResolution(can_view_full_content=False, reason="unauthenticated")

        if viewer.role == UserRole.ADMIN:
            return AccessResolution(can_view_full_content=True, reason="admin")

        # Use cached uploaded_notes_count; contributor = has uploaded at least one note
        if viewer.uploaded_notes_count > 0:
            return AccessResolution(can_view_full_content=True, reason="contributor")

        return AccessResolution(
            can_view_full_content=False,
            reason="must_contribute_first",
        )

    @staticmethod
    def build_attachment_dicts(
        note: Note,
        mask_urls: bool,
    ) -> list[dict]:
        """
        Build attachment list for response. When mask_urls=True, file_url and
        file_key are set to None so frontend shows blurred placeholder with CTA.
        """
        result = []
        for a in note.attachments or []:
            status = a.processing_status.value
            att = {
                "id": a.id,
                "note_id": a.note_id,
                "file_type": a.file_type,
                "processing_status": status,
                "file_size_bytes": a.file_size_bytes,
                "created_at": a.created_at,
            }
            if mask_urls:
                att["file_key"] = None  # masked — frontend shows blurred CTA
                att["file_url"] = None
            else:
                att["file_key"] = a.file_key
                att["file_url"] = a.file_url
            result.append(att)
        return result


# Singleton for dependency injection
note_permission_service = NotePermissionService()
