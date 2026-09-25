"""The DomainError handler must produce the same {"detail": ...} shape as HTTPException."""
import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core.exceptions import ConflictError, DomainError, NotFoundError, PermissionDeniedError
from app.main import app

router = APIRouter()


@router.get("/__test__/raise/{kind}")
def _raise(kind: str):
    errors = {
        "domain": DomainError("bad input"),
        "not_found": NotFoundError("missing"),
        "forbidden": PermissionDeniedError("nope"),
        "conflict": ConflictError("duplicate"),
    }
    raise errors[kind]


@pytest.fixture(scope="module")
def raw_client():
    app.include_router(router)
    try:
        yield TestClient(app)
    finally:
        app.router.routes[:] = [r for r in app.router.routes if not getattr(r, "path", "").startswith("/__test__")]


@pytest.mark.parametrize(
    ("kind", "status", "detail"),
    [
        ("domain", 400, "bad input"),
        ("not_found", 404, "missing"),
        ("forbidden", 403, "nope"),
        ("conflict", 409, "duplicate"),
    ],
)
def test_domain_errors_are_translated(raw_client, kind, status, detail):
    resp = raw_client.get(f"/__test__/raise/{kind}")

    assert resp.status_code == status
    assert resp.json() == {"detail": detail}
