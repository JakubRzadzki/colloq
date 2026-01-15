"""
Authentication and authorization module for Colloq PRO.

Handles:
- Password hashing and verification (bcrypt)
- JWT token generation and validation
- User authentication middleware
- Admin privilege checks
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import database, models

# Security configuration - loaded from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "bardzo_tajny_klucz_zmien_go_na_produkcji")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for extracting Bearer tokens from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its bcrypt hash.

    Args:
        plain_password: User-provided password in plain text
        hashed_password: Bcrypt hash stored in database

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generate a bcrypt hash from a plain-text password.

    Args:
        password: Plain-text password to hash

    Returns:
        Bcrypt-hashed password string safe for database storage
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token with custom claims.

    The token includes:
    - 'sub': Subject (typically user email/ID)
    - 'exp': Expiration timestamp (UTC)
    - Custom claims: is_admin, nickname, etc.

    Args:
        data: Dictionary of claims to encode in token
        expires_delta: Optional custom expiration time (defaults to ACCESS_TOKEN_EXPIRE_MINUTES)

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    # Sign and encode the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    """
    Dependency that extracts and validates the current authenticated user from JWT.

    Flow:
    1. Extract token from Authorization header
    2. Decode and verify JWT signature
    3. Extract email (sub claim)
    4. Query database for user
    5. Verify user exists and is active

    Args:
        token: JWT token from Authorization: Bearer header
        db: Database session dependency

    Returns:
        Authenticated User model instance

    Raises:
        HTTPException 401: If token is invalid, expired, or user not found
        HTTPException 403: If user account is inactive
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode and verify JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Fetch user from database using email as unique identifier
    user = db.query(models.User).filter(models.User.email == email).first()

    if user is None:
        raise credentials_exception

    # Ensure user account is active (soft delete check)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or suspended"
        )

    return user


async def get_current_active_admin(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """
    Dependency that verifies the current user has admin privileges.

    Used to protect admin-only endpoints (e.g., note moderation, user management).

    Args:
        current_user: Authenticated user from get_current_user dependency

    Returns:
        User model instance if user is an admin

    Raises:
        HTTPException 403: If user does not have admin privileges
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required for this operation"
        )
    return current_user