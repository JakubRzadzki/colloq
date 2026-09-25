"""
Authentication utilities: JWT, password hashing, auth cookies, CSRF and current user dependencies.
"""
from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import User

# The Authorization header is still accepted (API clients, Swagger UI "Authorize"),
# but the browser frontend authenticates with the httpOnly cookie.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/token", auto_error=False)

ACCESS_COOKIE = "access_token"
CSRF_COOKIE = "csrf_token"
CSRF_HEADER = "X-CSRF-Token"
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def verify_password(plain: str, hashed: str) -> bool:
    """Check a password against a bcrypt hash (also those created earlier by passlib)."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        # Malformed hash, or a password over bcrypt's 72-byte limit: treat as a mismatch.
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = int(expire.timestamp())
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _user_from_token(db: Session, token: str) -> User | None:
    """The active, unbanned user a valid token belongs to, else None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None
    email = payload.get("sub")
    if not email:
        return None
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if user is None or not user.is_active or user.is_banned:
        return None
    return user


def _request_token(request: Request, header_token: str | None) -> tuple[str | None, bool]:
    """(token, came_from_cookie). An Authorization header wins over the cookie."""
    if header_token:
        return header_token, False
    return request.cookies.get(ACCESS_COOKIE), True


def _check_csrf(request: Request) -> None:
    """Double-submit check for requests authenticated by the cookie.

    The browser attaches cookies to cross-site form posts, but only our own
    JavaScript can read csrf_token and copy it into the header.
    """
    if request.method not in UNSAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token missing or invalid")


def get_current_user(
    request: Request,
    header_token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated user (cookie or Authorization header) or raise 401."""
    token, from_cookie = _request_token(request, header_token)
    user = _user_from_token(db, token) if token else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if from_cookie:
        _check_csrf(request)
    return user


def get_current_user_optional(
    request: Request,
    header_token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """Return the authenticated user, or None for anonymous requests and invalid tokens."""
    token, from_cookie = _request_token(request, header_token)
    user = _user_from_token(db, token) if token else None
    if user is not None and from_cookie:
        _check_csrf(request)
    return user


def set_auth_cookies(response: Response, token: str) -> None:
    """Store the access token in an httpOnly cookie plus a readable CSRF token."""
    for name, value, httponly in (
        (ACCESS_COOKIE, token, True),
        (CSRF_COOKIE, secrets.token_urlsafe(32), False),  # read by the frontend for the header
    ):
        response.set_cookie(
            name,
            value,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
            domain=settings.COOKIE_DOMAIN,
            secure=settings.ENV != "dev",  # plain http is only acceptable locally
            httponly=httponly,
            samesite="lax",
        )


def clear_auth_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name, path="/", domain=settings.COOKIE_DOMAIN, secure=settings.ENV != "dev", samesite="lax"
        )


def get_current_active_admin(user: User = Depends(get_current_user)) -> User:
    """Require admin; raise 403 if not admin."""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user
