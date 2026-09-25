"""Password reset: request and reset endpoints."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import get_password_hash
from app.models import User, PasswordResetToken
from app.schemas import ForgotPasswordRequest, ResetPasswordRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

RESET_TOKEN_TTL = timedelta(hours=1)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_reset_token(db: Session, user: User) -> str:
    """Create a reset token for the user and return the raw value.

    Only the SHA-256 hash is stored, so a leaked database row cannot be used to
    reset a password. Any previous unused tokens of the user are invalidated.
    """
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({PasswordResetToken.used: True}, synchronize_session=False)
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(
        user_id=user.id,
        token=_hash_token(token),
        expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
    ))
    db.commit()
    return token


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset link. Always returns success to prevent email enumeration."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = create_reset_token(db, user)
        # TODO: send the reset link by email.
        logger.info("password reset requested for user_id=%s", user.id)
        if settings.ENV == "dev":
            logger.info("dev only: password reset token for user_id=%s: %s", user.id, token)
    return {"msg": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid reset token."""
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == _hash_token(payload.token),
        PasswordResetToken.used == False,  # noqa: E712
        PasswordResetToken.expires_at > datetime.now(timezone.utc),
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,  # noqa: E712
    ).update({PasswordResetToken.used: True}, synchronize_session=False)
    db.commit()

    return {"msg": "Password reset successfully"}
