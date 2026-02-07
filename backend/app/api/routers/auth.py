"""
Auth: token (login) and register.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    AsyncSessionDep,
    CurrentUser,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.domain.models import User
from app.schemas.domain import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser):
    """Return current authenticated user."""
    return current_user


@router.post("/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = AsyncSessionDep,
):
    """Return JWT access token (OAuth2 compatible)."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserOut)
async def register(
    payload: UserCreate,
    db: AsyncSession = AsyncSessionDep,
):
    """Register a new user."""
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_verified_student=payload.is_verified_student,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
