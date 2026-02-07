"""
NoteService — business logic for note creation and validation.

Enforces: if visibility=PUBLIC, subject_id MUST be set (service-layer rule).
Quick-capture: subject_id=None implies draft/private.
"""
from __future__ import annotations

from fastapi import HTTPException, status

from app.core.enums import NoteVisibility
from app.schemas.domain import NoteCreate


class NoteService:
    """Validates note creation payloads per domain rules."""

    @staticmethod
    def validate_create(payload: NoteCreate) -> None:
        """
        Rule: If visibility is PUBLIC, subject_id MUST be set.
        Raises HTTPException 400 if invalid.
        """
        if payload.visibility == NoteVisibility.PUBLIC and payload.subject_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Public notes must have a subject_id. Use PRIVATE for draft/quick-capture notes.",
            )


note_service = NoteService()
