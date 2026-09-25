"""Profile updates of the current user."""
from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, DomainError
from app.models import User
from app.services.file_manager import DIR_AVATARS
from app.services.storage import LocalFileStorage, Upload, commit_or_discard

MAX_NICKNAME_LENGTH = 100
NICKNAME_TAKEN = "Nickname already taken"


class UserService:
    def __init__(self, db: Session, storage: LocalFileStorage):
        self.db = db
        self.storage = storage

    def _clean_nickname(self, user: User, nickname: str) -> str:
        nickname = nickname.strip()
        if not 1 <= len(nickname) <= MAX_NICKNAME_LENGTH:
            raise DomainError(f"Nickname must be between 1 and {MAX_NICKNAME_LENGTH} characters long")
        taken = self.db.query(User.id).filter(User.nickname == nickname, User.id != user.id).first()
        if taken:
            raise ConflictError(NICKNAME_TAKEN)
        return nickname

    def update_profile(
        self, user: User, *, nickname: str | None, bio: str | None, avatar: Upload | None
    ) -> User:
        if nickname is not None:
            user.nickname = self._clean_nickname(user, nickname)
        if bio is not None:
            user.bio = bio

        saved: list[str] = []
        if avatar is not None and avatar.filename:
            user.avatar_url = self.storage.save_image(avatar, DIR_AVATARS)
            saved.append(user.avatar_url)
        try:
            commit_or_discard(self.db, self.storage, saved)
        except IntegrityError:
            # Someone else took the nickname between the check and the commit.
            raise ConflictError(NICKNAME_TAKEN) from None
        self.db.refresh(user)
        return user
