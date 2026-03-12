"""
Tests for university CRUD, faculty, field, subject creation, and region filtering.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def auth_headers(client: TestClient):
    """Register, login, return Authorization header."""
    client.post(
        "/register",
        json={"user": {"email": "uni_test@example.com", "password": "testpass123", "university_id": None}},
    )
    r = client.post("/token", data={"username": "uni_test@example.com", "password": "testpass123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_university(client: TestClient, auth_headers: dict):
    """Create a university with required fields."""
    response = client.post(
        "/universities",
        data={
            "name": "Politechnika Warszawska",
            "city": "Warszawa",
            "region": "mazowieckie",
            "country": "Poland",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Politechnika Warszawska"
    assert data["city"] == "Warszawa"
    assert data["region"] == "mazowieckie"


def test_create_university_requires_auth(client: TestClient):
    """University creation now requires authentication."""
    response = client.post(
        "/universities",
        data={"name": "No Auth Uni", "city": "City"},
    )
    assert response.status_code == 401


def test_get_universities(client: TestClient, auth_headers: dict):
    """List universities."""
    # Create one first
    client.post(
        "/universities",
        data={"name": "Test Uni", "city": "City", "region": "test", "country": "Poland"},
        headers=auth_headers,
    )
    response = client.get("/universities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_universities_by_region(client: TestClient, auth_headers: dict):
    """Filter universities by region."""
    client.post(
        "/universities",
        data={"name": "Uni A", "city": "City A", "region": "mazowieckie", "country": "Poland"},
        headers=auth_headers,
    )
    client.post(
        "/universities",
        data={"name": "Uni B", "city": "City B", "region": "malopolskie", "country": "Poland"},
        headers=auth_headers,
    )

    response = client.get("/universities?region=mazowieckie")
    assert response.status_code == 200
    data = response.json()
    assert all(u["region"].lower() == "mazowieckie" for u in data)


def test_get_university_by_id(client: TestClient, auth_headers: dict):
    """Get a specific university."""
    create = client.post(
        "/universities",
        data={"name": "Specific Uni", "city": "City", "region": "test", "country": "Poland"},
        headers=auth_headers,
    )
    uni_id = create.json()["id"]

    response = client.get(f"/universities/{uni_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Specific Uni"


def test_university_not_found(client: TestClient):
    """Get non-existent university returns 404."""
    response = client.get("/universities/99999")
    assert response.status_code == 404


def test_create_faculty(client: TestClient, auth_headers: dict):
    """Create a faculty under a university."""
    uni = client.post(
        "/universities",
        data={"name": "Faculty Test Uni", "city": "City", "region": "test", "country": "Poland"},
        headers=auth_headers,
    )
    uni_id = uni.json()["id"]

    response = client.post(
        "/faculties",
        data={"name": "Wydział Informatyki", "university_id": uni_id},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Wydział Informatyki"


def test_create_field_of_study(client: TestClient, auth_headers: dict):
    """Create a field of study under a faculty."""
    uni = client.post(
        "/universities",
        data={"name": "Field Test Uni", "city": "City", "region": "test", "country": "Poland"},
        headers=auth_headers,
    )
    uni_id = uni.json()["id"]

    fac = client.post(
        "/faculties",
        data={"name": "Test Faculty", "university_id": uni_id},
        headers=auth_headers,
    )
    fac_id = fac.json()["id"]

    response = client.post(
        "/fields",
        json={"name": "Informatyka", "degree_level": "inżynier", "faculty_id": fac_id},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Informatyka"


def test_create_subject(client: TestClient, auth_headers: dict):
    """Create a subject under a field of study."""
    uni = client.post(
        "/universities",
        data={"name": "Subject Test Uni", "city": "City", "region": "test", "country": "Poland"},
        headers=auth_headers,
    )
    uni_id = uni.json()["id"]

    fac = client.post(
        "/faculties",
        data={"name": "Test Faculty", "university_id": uni_id},
        headers=auth_headers,
    )
    fac_id = fac.json()["id"]

    field = client.post(
        "/fields",
        json={"name": "Informatyka", "degree_level": "inżynier", "faculty_id": fac_id},
    )
    field_id = field.json()["id"]

    response = client.post(
        "/subjects",
        json={"name": "Algorytmy", "semester": 3, "field_of_study_id": field_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Algorytmy"
    assert data["semester"] == 3
