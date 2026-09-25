"""Reusable FastAPI dependency aliases for endpoint signatures."""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_admin, get_current_user, get_current_user_optional
from app.models import User
from app.repositories.note_repository import NoteRepository
from app.services.note_service import NoteService
from app.services.review_service import ReviewService
from app.services.storage import LocalFileStorage, get_storage

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]
StorageDep = Annotated[LocalFileStorage, Depends(get_storage)]


def get_note_service(db: DbSession, storage: StorageDep) -> NoteService:
    return NoteService(db, NoteRepository(db), storage)


def get_review_service(db: DbSession) -> ReviewService:
    return ReviewService(db)


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
