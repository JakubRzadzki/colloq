"""Registration and login."""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, ConflictError, DomainError, NotFoundError, PermissionDeniedError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.sql import LIKE_ESCAPE, escape_like
from app.models import University, User
from app.schemas import UserCreate

INVALID_CREDENTIALS = "Invalid email or password"
EMAIL_TAKEN = "Email already registered"


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    return get_password_hash("dummy-password-for-timing")


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def pick_free_nickname(db: Session, base: str) -> str:
    """Return `base`, or `base` with the lowest free numeric suffix, using a single query."""
    taken = {
        nickname
        for (nickname,) in db.query(User.nickname).filter(
            User.nickname.like(f"{escape_like(base)}%", escape=LIKE_ESCAPE)
        )
    }
    if base not in taken:
        return base
    suffix = 1
    while f"{base}{suffix}" in taken:
        suffix += 1
    return f"{base}{suffix}"


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, data: UserCreate) -> User:
        email = data.email.strip().lower()
        if find_user_by_email(self.db, email):
            raise DomainError(EMAIL_TAKEN)
        if data.university_id is not None and self.db.get(University, data.university_id) is None:
            raise NotFoundError("University not found")

        user = User(
            email=email,
            nickname=pick_free_nickname(self.db, email.split("@")[0]),
            hashed_password=get_password_hash(data.password),
            university_id=data.university_id,
        )
        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError:
            # Lost a race with a concurrent registration of the same email (or nickname).
            self.db.rollback()
            raise ConflictError(EMAIL_TAKEN) from None
        self.db.refresh(user)
        return user

    def login(self, email: str, password: str) -> str:
        """Return an access token for valid credentials of an active, unbanned user."""
        user = find_user_by_email(self.db, email)
        if user is None:
            # Hash anyway so unknown emails take as long as wrong passwords.
            verify_password(password, _dummy_hash())
            raise AuthenticationError(INVALID_CREDENTIALS)
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError(INVALID_CREDENTIALS)
        if user.is_banned or not user.is_active:
            raise PermissionDeniedError("Account is disabled")
        return create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
