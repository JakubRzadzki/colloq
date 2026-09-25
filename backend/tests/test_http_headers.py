"""CORS policy and security headers."""
from app.core.config import settings

ORIGIN = settings.allowed_origins[0]


def _preflight(client, method: str, headers: str):
    return client.options(
        "/notes",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": headers,
        },
    )


def test_cors_allows_the_methods_and_headers_the_frontend_uses(client):
    resp = _preflight(client, "DELETE", "authorization,content-type")

    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == ORIGIN
    allowed_methods = {m.strip() for m in resp.headers["access-control-allow-methods"].split(",")}
    assert allowed_methods == {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}


def test_cors_rejects_unlisted_headers_and_methods(client):
    assert _preflight(client, "GET", "x-custom-header").status_code == 400
    assert _preflight(client, "TRACE", "authorization").status_code == 400


def test_cors_rejects_unknown_origin(client):
    resp = client.options(
        "/notes",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in resp.headers


def test_security_headers_on_api_responses(client):
    resp = client.get("/health")

    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert resp.headers["x-content-type-options"] == "nosniff"


def test_security_headers_on_error_responses(client):
    resp = client.get("/notes/999999")

    assert resp.status_code == 404
    assert resp.headers["x-frame-options"] == "DENY"
