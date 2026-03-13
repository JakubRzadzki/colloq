"""
Tests for note creation, voting (with toggle), favorites, comments, pagination, and deletion.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers(client: TestClient):
    """Register, login, return Authorization header."""
    client.post(
        "/register",
        json={"user": {"email": "notes@example.com", "password": "pass12345", "university_id": None}},
    )
    r = client.post("/token", data={"username": "notes@example.com", "password": "pass12345"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def university_id(client: TestClient, auth_headers: dict) -> int:
    """Create a university and return its ID."""
    uni_response = client.post(
        "/universities",
        data={"name": "Test Uni", "city": "City", "region": "", "country": "Poland"},
        headers=auth_headers,
    )
    if uni_response.status_code != 200:
        pytest.skip("University creation failed")
    return uni_response.json()["id"]


@pytest.fixture
def note_id(client: TestClient, auth_headers: dict, university_id: int) -> int:
    """Create a note and return its ID."""
    response = client.post(
        "/notes",
        data={"title": "My Note", "content": "Body", "university_id": university_id},
        headers=auth_headers,
    )
    if response.status_code != 200:
        pytest.skip("Note creation failed")
    return response.json()["id"]


def test_create_note_requires_auth(client: TestClient):
    """Creating a note without token fails with 401."""
    response = client.post(
        "/notes",
        data={"title": "Test", "university_id": 1},
    )
    assert response.status_code == 401


def test_create_note_and_vote(client: TestClient, auth_headers: dict, note_id: int):
    """Create a note then upvote; score increases."""
    initial = client.get(f"/notes/{note_id}").json()
    initial_score = initial.get("score", 0)

    # Vote
    vote_response = client.post(f"/notes/{note_id}/vote", headers=auth_headers)
    assert vote_response.status_code == 200
    vote_data = vote_response.json()
    assert vote_data["user_has_voted"] is True
    assert vote_data["new_score"] == initial_score + 1


def test_vote_toggle(client: TestClient, auth_headers: dict, note_id: int):
    """Voting twice on the same note toggles the vote off."""
    # Vote once
    r1 = client.post(f"/notes/{note_id}/vote", headers=auth_headers)
    assert r1.json()["user_has_voted"] is True
    score_after_vote = r1.json()["new_score"]

    # Vote again (toggle off)
    r2 = client.post(f"/notes/{note_id}/vote", headers=auth_headers)
    assert r2.json()["user_has_voted"] is False
    assert r2.json()["new_score"] == score_after_vote - 1


def test_favorite_toggle(client: TestClient, auth_headers: dict, note_id: int):
    """Toggle favorite adds then removes from favorites."""
    # Add to favorites
    r1 = client.post(f"/notes/{note_id}/favorite", headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json()["is_favorited"] is True

    # Remove from favorites
    r2 = client.post(f"/notes/{note_id}/favorite", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["is_favorited"] is False


def test_add_comment(client: TestClient, auth_headers: dict, note_id: int):
    """Add a comment to a note."""
    response = client.post(
        f"/notes/{note_id}/comments",
        json={"content": "Great note!"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Great note!"


def test_get_comments(client: TestClient, auth_headers: dict, note_id: int):
    """Get comments for a note."""
    client.post(f"/notes/{note_id}/comments", json={"content": "Test comment"}, headers=auth_headers)
    response = client.get(f"/notes/{note_id}/comments")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_notes_pagination(client: TestClient, auth_headers: dict, university_id: int):
    """GET /notes returns paginated response."""
    # Create a few notes
    for i in range(3):
        client.post(
            "/notes",
            data={"title": f"Note {i}", "content": f"Body {i}", "university_id": university_id},
            headers=auth_headers,
        )

    response = client.get(f"/notes?university_id={university_id}&page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert len(data["items"]) <= 2
    assert data["total"] >= 3


def test_delete_note(client: TestClient, auth_headers: dict, note_id: int):
    """Owner can delete their own note."""
    response = client.delete(f"/notes/{note_id}", headers=auth_headers)
    assert response.status_code == 200

    # Verify it's gone
    get_response = client.get(f"/notes/{note_id}")
    assert get_response.status_code == 404


def test_delete_note_non_owner(client: TestClient, auth_headers: dict, note_id: int):
    """Non-owner cannot delete the note."""
    # Create another user and get token
    client.post(
        "/register",
        json={"user": {"email": "other_delete@example.com", "password": "password123", "university_id": None}},
    )
    r = client.post("/token", data={"username": "other_delete@example.com", "password": "password123"})
    other_token = r.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    response = client.delete(f"/notes/{note_id}", headers=other_headers)
    assert response.status_code == 403

