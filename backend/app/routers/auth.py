"""Authentication: login and registration."""
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import AuthServiceDep
from app.core.rate_limit import limiter
from app.schemas import RegisterRequest, Token, UserOut

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AuthServiceDep,
):
    """Authenticate user and return JWT token. Banned or inactive accounts get 403."""
    token = service.login(form_data.username, form_data.password)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, service: AuthServiceDep):
    """Register a new user account."""
    return service.register(payload.user)
