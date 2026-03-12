"""Password reset: request and reset endpoints."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models import User, PasswordResetToken
from app.schemas import ForgotPasswordRequest, ResetPasswordRequest

router = APIRouter(tags=["auth"])


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset link. Always returns success to prevent email enumeration."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        # Generate token
        token = uuid.uuid4().hex
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires,
        )
        db.add(reset_token)
        db.commit()
        # TODO: Send email with reset link containing the token
        # For now, log it (in production, use an email service)
        print(f"[PASSWORD RESET] Token for {payload.email}: {token}")
    # Always return success to prevent email enumeration
    return {"msg": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid reset token."""
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc),
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    reset_token.used = True
    db.commit()

    return {"msg": "Password reset successfully"}
