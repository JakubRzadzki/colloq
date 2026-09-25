"""
Management commands.

Usage:
    python -m app.cli create-admin --email admin@example.com

The password is read from the ADMIN_PASSWORD environment variable or, if that is
not set, prompted for interactively (never passed on the command line, so it does
not end up in shell history or the process list).
"""
from __future__ import annotations

import argparse
import getpass
import os
import secrets
import sys

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # bcrypt ignores everything past 72 bytes


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    if len(password.encode()) > MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes long")


def create_admin(db: Session, email: str, password: str) -> tuple[User, bool]:
    """Create an admin, or promote an existing user and reset their password.

    Returns (user, created). Resetting the password of an existing account is
    what makes this command usable for rotating credentials of old seeded admins.
    """
    validate_password(password)
    email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    created = user is None
    if user is None:
        nickname = email.split("@")[0]
        if db.query(User).filter(User.nickname == nickname).first():
            nickname = f"{nickname}_{secrets.token_hex(3)}"
        user = User(email=email, nickname=nickname, is_verified=True, hashed_password="")
        db.add(user)
    user.hashed_password = get_password_hash(password)
    user.is_admin = True
    user.is_active = True
    user.is_banned = False
    db.commit()
    return user, created


def _read_password() -> str:
    password = os.getenv("ADMIN_PASSWORD")
    if password:
        return password
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise ValueError("Passwords do not match")
    return password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-admin", help="create an admin account or promote an existing user")
    create.add_argument("--email", required=True)
    args = parser.parse_args(argv)

    if args.command == "create-admin":
        try:
            password = _read_password()
            with SessionLocal() as db:
                user, created = create_admin(db, args.email, password)
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1
        action = "Created admin" if created else "Promoted existing user to admin and reset password:"
        print(f"{action} {user.email} (id={user.id})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
