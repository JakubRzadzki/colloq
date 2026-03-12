"""
Tests for admin: admin-only access enforcement, approve/reject, user ban.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def admin_headers(client: TestClient, db_session):
    """Register an admin user, login, return Authorization header."""
    from app.models import User
    from app.core.security import get_password_hash

    admin = User(
        email="admin@example.com",
        nickname="admin",
        hashed_password=get_password_hash("adminpass123"),
        is_admin=True,
    )
    db_session.add(admin)
    db_session.commit()

    r = client.post("/token", data={"username": "admin@example.com", "password": "adminpass123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def regular_headers(client: TestClient):
    """Register a regular (non-admin) user."""
    client.post(
        "/register",
        json={"user": {"email": "regular@example.com", "password": "regularpass123", "university_id": None}},
    )
    r = client.post("/token", data={"username": "regular@example.com", "password": "regularpass123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_users_requires_admin(client: TestClient, regular_headers: dict):
    """Non-admin user cannot access admin user list."""
    response = client.get("/admin/users", headers=regular_headers)
    assert response.status_code == 403


def test_admin_users_success(client: TestClient, admin_headers: dict):
    """Admin can list all users."""
    response = client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # At least the admin user


def test_admin_pending_items(client: TestClient, admin_headers: dict):
    """Admin can view pending items."""
    response = client.get("/admin/pending_items", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "notes" in data
    assert "universities" in data
    assert "faculties" in data
    assert "fields" in data
    assert "subjects" in data
    assert "image_requests" in data


def test_admin_ban_user(client: TestClient, admin_headers: dict, regular_headers: dict):
    """Admin can ban a user."""
    # Get the regular user's ID
    users_response = client.get("/admin/users", headers=admin_headers)
    users = users_response.json()
    regular = [u for u in users if u["email"] == "regular@example.com"]
    assert len(regular) == 1
    user_id = regular[0]["id"]

    # Ban user
    response = client.patch(
        f"/admin/users/{user_id}/ban",
        json={"banned": True},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert "banned" in response.json().get("msg", "").lower()


def test_admin_cannot_ban_self(client: TestClient, admin_headers: dict, db_session):
    """Admin cannot ban themselves."""
    # Get admin user ID
    users_response = client.get("/admin/users", headers=admin_headers)
    users = users_response.json()
    admin = [u for u in users if u["email"] == "admin@example.com"]
    assert len(admin) == 1
    admin_id = admin[0]["id"]

    response = client.patch(
        f"/admin/users/{admin_id}/ban",
        json={"banned": True},
        headers=admin_headers,
    )
    assert response.status_code == 400


def test_admin_approve_university(client: TestClient, admin_headers: dict, db_session):
    """Admin can approve a pending university."""
    from app.models import University
    uni = University(name="Pending Uni", city="City", region="test", is_approved=False)
    db_session.add(uni)
    db_session.commit()

    response = client.post(
        f"/admin/approve/university/{uni.id}",
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert "approved" in response.json().get("msg", "").lower()


def test_admin_reject_university(client: TestClient, admin_headers: dict, db_session):
    """Admin can reject a pending university."""
    from app.models import University
    uni = University(name="Reject Uni", city="City", region="test", is_approved=False)
    db_session.add(uni)
    db_session.commit()

    response = client.delete(
        f"/admin/reject/university/{uni.id}",
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert "rejected" in response.json().get("msg", "").lower()
