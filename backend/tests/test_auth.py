"""
Tests for authentication: register and login.
"""
import pytest
from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    """Register a new user returns 200 and creates user."""
    response = client.post(
        "/register",
        json={
            "user": {
                "email": "test@example.com",
                "password": "securepass123",
                "university_id": None,
            }
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data or "id" in data or "email" in data


def test_register_duplicate_email(client: TestClient):
    """Registering with existing email fails."""
    payload = {
        "user": {
            "email": "dup@example.com",
            "password": "pass12345",
            "university_id": None,
        }
    }
    client.post("/register", json=payload)
    response = client.post("/register", json=payload)
    assert response.status_code in (400, 422)


def test_login_success(client: TestClient):
    """Login with valid credentials returns token."""
    client.post(
        "/register",
        json={
            "user": {
                "email": "login@example.com",
                "password": "mypassword123",
                "university_id": None,
            }
        },
    )
    response = client.post(
        "/token",
        data={"username": "login@example.com", "password": "mypassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"


def test_login_invalid_credentials(client: TestClient):
    """Login with wrong password fails with 401."""
    client.post(
        "/register",
        json={
            "user": {
                "email": "wrong@example.com",
                "password": "correctpass",
                "university_id": None,
            }
        },
    )
    response = client.post(
        "/token",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_register_short_password(client: TestClient):
    """Password shorter than 8 characters should be rejected."""
    response = client.post(
        "/register",
        json={
            "user": {
                "email": "short@example.com",
                "password": "short",
                "university_id": None,
            }
        },
    )
    assert response.status_code == 400


def test_get_me(client: TestClient):
    """Get /users/me returns current user data."""
    client.post(
        "/register",
        json={
            "user": {
                "email": "me@example.com",
                "password": "password123",
                "university_id": None,
            }
        },
    )
    r = client.post(
        "/token",
        data={"username": "me@example.com", "password": "password123"},
    )
    token = r.json()["access_token"]
    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
