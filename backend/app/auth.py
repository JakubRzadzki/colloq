import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from . import database, models

SECRET_KEY = os.getenv("SECRET_KEY", "secret_key_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Fix: Use absolute path for tokenUrl to prevent issues in nested routes or swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/token", auto_error=False)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    exception = HTTPException(status_code=401, detail="Invalid credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise exception
    except JWTError:
        raise exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not user.is_active: raise exception
    return user

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(database.get_db)):
    """Return current user if valid token present, else None. Use for endpoints that work with or without login."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None or not user.is_active:
            return None
        return user
    except JWTError:
        return None

async def get_current_active_admin(user: models.User = Depends(get_current_user)):
    if not user.is_admin: raise HTTPException(403, "Admin privileges required")
    return user