"""
Colloq API — Production-ready MVP.
Minimal entry point: config, upload dirs, CORS, routers, static files.
Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import DomainError
from app.routers import (
    admin,
    auth,
    feedback,
    home,
    notes,
    notifications,
    password_reset,
    reports,
    search,
    universities,
    users,
)

from app.seed import run_seed

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown tasks.

    The database schema is managed by Alembic (run via docker-entrypoint.sh
    before the app starts), so we no longer create tables or run ad-hoc
    migrations here. On startup we validate config and seed default data.
    Both are skipped while running the test suite.
    """
    if not settings.TESTING:
        settings.validate_secret_key()
        try:
            run_seed()
        except Exception:
            # A failed seed must not keep the API from starting.
            logger.exception("Database seeding failed")
    yield


app = FastAPI(title="Colloq API", version="2.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Prevent MIME-sniffing of user-uploaded files served from /uploads."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# Ensure upload directories exist (cross-platform)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "universities"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "notes"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "faculties"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

for module in (auth, users, universities, notes, admin, password_reset, home, notifications, reports, feedback, search):
    app.include_router(module.router)


@app.get("/")
def root():
    return {"message": "Colloq API v2.1 is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
