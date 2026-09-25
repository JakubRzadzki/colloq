"""Reusable FastAPI dependency aliases for endpoint signatures."""
from typing import Annotated

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_admin, get_current_user, get_current_user_optional
from app.models import User
from app.repositories.note_repository import NoteRepository
from app.schemas import PageParams
from app.services.admin_service import AdminService
from app.services.auth_service import AuthService
from app.services.moderation import ModerationService
from app.services.note_service import NoteService
from app.services.review_service import ReviewService
from app.services.storage import LocalFileStorage, get_storage
from app.services.university_service import UniversityService
from app.services.user_service import UserService

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_current_user_optional)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]
StorageDep = Annotated[LocalFileStorage, Depends(get_storage)]


def get_page(
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PageParams:
    # Plain query params instead of a Query() model, which cannot be combined with other query params.
    return PageParams(limit=limit, offset=offset)


Page = Annotated[PageParams, Depends(get_page)]


def get_note_service(db: DbSession, storage: StorageDep) -> NoteService:
    return NoteService(db, NoteRepository(db), storage)


def get_review_service(db: DbSession) -> ReviewService:
    return ReviewService(db)


def get_university_service(db: DbSession, storage: StorageDep) -> UniversityService:
    return UniversityService(db, storage)


def get_moderation_service(db: DbSession, storage: StorageDep) -> ModerationService:
    return ModerationService(db, storage)


def get_auth_service(db: DbSession) -> AuthService:
    return AuthService(db)


def get_admin_service(db: DbSession) -> AdminService:
    return AdminService(db)


def get_user_service(db: DbSession, storage: StorageDep) -> UserService:
    return UserService(db, storage)


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
UniversityServiceDep = Annotated[UniversityService, Depends(get_university_service)]
ModerationServiceDep = Annotated[ModerationService, Depends(get_moderation_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AdminServiceDep = Annotated[AdminService, Depends(get_admin_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
