"""PUT /users/me nickname rules."""
import pytest
from fastapi.testclient import TestClient


def _register(client: TestClient, email: str, password: str = "password123"):
    return client.post("/register", json={"user": {"email": email, "password": password, "university_id": None}})


def _login(client: TestClient, email: str, password: str = "password123"):
    return client.post("/token", data={"username": email, "password": password})


@pytest.fixture
def me_headers(client) -> dict:
    _register(client, "me-profile@example.com")
    return {"Authorization": f"Bearer {_login(client, 'me-profile@example.com').json()['access_token']}"}


def test_update_nickname_is_trimmed(client, me_headers):
    resp = client.put("/users/me", data={"nickname": "  New Name  "}, headers=me_headers)

    assert resp.status_code == 200
    assert resp.json()["nickname"] == "New Name"


@pytest.mark.parametrize("nickname", ["   ", "x" * 101])
def test_update_nickname_length_is_validated(client, me_headers, nickname):
    assert client.put("/users/me", data={"nickname": nickname}, headers=me_headers).status_code == 400


def test_update_nickname_taken_returns_409(client, me_headers):
    _register(client, "taken@example.com")

    assert client.put("/users/me", data={"nickname": "taken"}, headers=me_headers).status_code == 409


def test_update_nickname_to_own_nickname_is_allowed(client, me_headers):
    assert client.put("/users/me", data={"nickname": "me-profile"}, headers=me_headers).status_code == 200


def test_replacing_avatar_deletes_the_old_file(client, me_headers):
    from pathlib import Path

    from app.core.config import settings

    png = b"\x89PNG\r\n\x1a\n" + b"0" * 16
    first = client.put("/users/me", files={"avatar": ("a.png", png, "image/png")}, headers=me_headers).json()["avatar_url"]
    old_file = Path(settings.UPLOAD_DIR) / first.removeprefix("/uploads/")
    assert old_file.is_file()

    second = client.put("/users/me", files={"avatar": ("b.png", png, "image/png")}, headers=me_headers).json()["avatar_url"]

    assert second != first
    assert not old_file.exists()
    assert (Path(settings.UPLOAD_DIR) / second.removeprefix("/uploads/")).is_file()
