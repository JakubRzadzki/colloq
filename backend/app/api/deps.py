"""
FastAPI dependencies: auth and give-to-get (leech protection) access level.
"""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import UserRole
from app.db.database import AsyncSessionDep
from app.domain.models import User
from app.schemas.permission import PermissionState

# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    import datetime
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = int(expire.timestamp())  # PyJWT expects numeric timestamp
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = AsyncSessionDep,
) -> Optional[User]:
    """Return current user if valid token present, else None."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if not email:
            return None
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            return None
        return user
    except jwt.PyJWTError:
        return None


async def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Require authenticated user; raise 401 if missing."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_optional)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# -----------------------------------------------------------------------------
# Give-to-get: permission state (do not raise 403; let frontend show blurred)
# -----------------------------------------------------------------------------


async def get_note_access_level(
    current_user: CurrentUserOptional,
) -> PermissionState:
    """
    Global give-to-get state: can this user view full note content (in general)?
    - ADMIN: always allow.
    - User with uploaded_notes_count >= 1: allow (contributor).
    - Otherwise: can_view_full_content = False; per-note resolution uses NotePermissionService.
    """
    if current_user is None:
        return PermissionState(can_view_full_content=False, reason="unauthenticated")

    if current_user.role == UserRole.ADMIN:
        return PermissionState(can_view_full_content=True, reason="admin")

    if getattr(current_user, "uploaded_notes_count", 0) > 0:
        return PermissionState(can_view_full_content=True, reason="contributor")

    return PermissionState(can_view_full_content=False, reason="must_contribute_first")


NoteAccessLevel = Annotated[PermissionState, Depends(get_note_access_level)]
