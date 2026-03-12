"""Authentication: login and registration."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models import User
from app.schemas import RegisterRequest, Token, UserOut
from app.core.rate_limit import limiter
from fastapi import Request

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(data={"sub": user.email, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    user_data = payload.user
    
    # Password validation
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    nickname = user_data.email.split("@")[0]
    counter = 1
    base_nickname = nickname
    while db.query(User).filter(User.nickname == nickname).first():
        nickname = f"{base_nickname}{counter}"
        counter += 1
    new_user = User(
        email=user_data.email,
        nickname=nickname,
        hashed_password=get_password_hash(user_data.password),
        university_id=user_data.university_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
