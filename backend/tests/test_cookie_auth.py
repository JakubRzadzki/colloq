"""
The access token travels in an httpOnly cookie. Unsafe requests authenticated by
that cookie need a matching X-CSRF-Token header (double submit); requests with an
Authorization header are exempt.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER
from app.main import app
from app.models import Note, University, User

PASSWORD = "password123"


@pytest.fixture
def user(db_session) -> User:
    from app.core.security import get_password_hash

    u = User(email="cookie@example.com", nickname="cookie", hashed_password=get_password_hash(PASSWORD))
    db_session.add(u)
    db_session.commit()
    return u


@pytest.fixture
def browser(client):
    """A client over https, so Secure cookies are stored and sent back like in a browser.

    Depends on `client` for its get_db override.
    """
    with TestClient(app, base_url="https://testserver") as c:
        yield c


def _login(c: TestClient, email: str = "cookie@example.com"):
    return c.post("/token", data={"username": email, "password": PASSWORD})


def _set_cookie_headers(resp) -> dict[str, str]:
    return {h.split("=", 1)[0]: h for h in resp.headers.get_list("set-cookie")}


def test_login_sets_httponly_token_cookie_and_readable_csrf_cookie(browser, user):
    resp = _login(browser)

    assert resp.status_code == 200
    cookies = _set_cookie_headers(resp)
    access, csrf = cookies[ACCESS_COOKIE].lower(), cookies[CSRF_COOKIE].lower()
    assert "httponly" in access and "secure" in access and "samesite=lax" in access
    assert f"max-age={settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60}" in access
    assert "httponly" not in csrf and "secure" in csrf


def test_dev_cookies_are_not_secure(browser, user, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "dev")

    cookies = _set_cookie_headers(_login(browser))

    assert "secure" not in cookies[ACCESS_COOKIE].lower()


def test_cookie_authenticates_safe_requests(browser, user):
    _login(browser)

    resp = browser.get("/users/me")

    assert resp.status_code == 200
    assert resp.json()["email"] == user.email


def test_cookie_authenticates_optional_user_endpoints(browser, db_session, user):
    uni = University(name="Cookie Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.flush()
    note = Note(title="Mine, pending", user_id=user.id, university_id=uni.id, is_approved=False)
    db_session.add(note)
    db_session.commit()
    _login(browser)

    assert browser.get(f"/notes/{note.id}").status_code == 200


def test_unsafe_request_without_csrf_header_is_rejected(browser, user):
    _login(browser)

    resp = browser.put("/users/me", data={"bio": "hello"})

    assert resp.status_code == 403


def test_unsafe_request_with_wrong_csrf_header_is_rejected(browser, user):
    _login(browser)

    resp = browser.put("/users/me", data={"bio": "hello"}, headers={CSRF_HEADER: "forged"})

    assert resp.status_code == 403


def test_unsafe_request_with_matching_csrf_header_is_accepted(browser, user):
    _login(browser)

    resp = browser.put("/users/me", data={"bio": "hello"}, headers={CSRF_HEADER: browser.cookies[CSRF_COOKIE]})

    assert resp.status_code == 200
    assert resp.json()["bio"] == "hello"


def test_authorization_header_without_cookie_needs_no_csrf(client, user):
    token = _login(client).json()["access_token"]
    client.cookies.clear()

    resp = client.put("/users/me", data={"bio": "via header"}, headers={"Authorization": f"Bearer {token}"})

    assert resp.status_code == 200


def test_logout_clears_the_cookies(browser, user):
    _login(browser)
    assert browser.get("/users/me").status_code == 200

    resp = browser.post("/logout")

    assert resp.status_code == 200
    assert ACCESS_COOKIE not in browser.cookies
    assert browser.get("/users/me").status_code == 401


def test_invalid_cookie_is_401(browser):
    browser.cookies.set(ACCESS_COOKIE, "not-a-jwt", domain="testserver")

    assert browser.get("/users/me").status_code == 401
