"""
Colloq API v1 — Production-ready async skeleton.
FastAPI + SQLAlchemy 2.0 (async), domain-driven structure, give-to-get, S3-style uploads.
Run: uvicorn app.main_v1:app --host 0.0.0.0 --port 8000
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth, hierarchy, notes, uploads
from app.db.database import Base, engine, get_async_session
from app.domain import models  # noqa: F401 — ensure models registered with Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Create DB tables on startup; run migrations and minimal seed if empty."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        from app.db.migrate_v1 import run_migrate_v1
        await run_migrate_v1()
    except Exception:
        pass  # Fresh DB: create_all suffices; migrations may fail on first run
    from app.seed_async import run_seed_async
    await run_seed_async()
    yield
    await engine.dispose()


app = FastAPI(
    title="Colloq API",
    version="1.0.0",
    description="Academic note-sharing platform — async skeleton with give-to-get and S3-style uploads",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(hierarchy.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(uploads.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Colloq API v1 (async)", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
