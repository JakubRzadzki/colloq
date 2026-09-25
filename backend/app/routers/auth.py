"""Authentication: login and registration."""
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.core.deps import AuthServiceDep
from app.core.rate_limit import limiter
from app.core.security import clear_auth_cookies, set_auth_cookies
from app.schemas import RegisterRequest, Token, UserOut

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AuthServiceDep,
):
    """Log in: sets the httpOnly access-token cookie and the CSRF cookie.

    The token is also returned in the body for API clients using the Authorization
    header; the browser frontend must not store it. Banned or inactive accounts get 403.
    """
    token = service.login(form_data.username, form_data.password)
    set_auth_cookies(response, token)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout(response: Response):
    """Clear the auth cookies. Works without a valid session, so an expired one can still log out."""
    clear_auth_cookies(response)
    return {"msg": "Logged out"}


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, service: AuthServiceDep):
    """Register a new user account."""
    return service.register(payload.user)
