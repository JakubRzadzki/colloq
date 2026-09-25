"""Rate limits (disabled in other tests via TESTING=1, enabled here explicitly)."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import get_password_hash
from app.models import University, User


@pytest.fixture
def limits_on():
    limiter.reset()
    limiter.enabled = True
    try:
        yield
    finally:
        limiter.enabled = False
        limiter.reset()


@pytest.fixture
def headers(client: TestClient, db_session) -> dict:
    db_session.add(User(email="rl@example.com", nickname="rl", hashed_password=get_password_hash("password123"), is_admin=True))
    db_session.commit()
    r = client.post("/token", data={"username": "rl@example.com", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _statuses(send, times: int) -> list[int]:
    return [send().status_code for _ in range(times)]


def test_feedback_is_limited_to_3_per_minute(client, headers, limits_on):
    statuses = _statuses(lambda: client.post("/feedback", json={"rating": 5}, headers=headers), 4)

    assert statuses == [200, 200, 200, 429]


def test_reports_are_limited_to_5_per_minute(client, headers, limits_on):
    statuses = _statuses(lambda: client.post("/reports", json={"reason": "spam"}, headers=headers), 6)

    assert statuses[-1] == 429
    assert 429 not in statuses[:-1]


def test_tags_are_limited_to_10_per_minute(client, headers, limits_on):
    counter = iter(range(100))
    statuses = _statuses(lambda: client.post("/tags", json={"name": f"rl-tag-{next(counter)}"}, headers=headers), 11)

    assert statuses == [200] * 10 + [429]


def test_comments_are_limited_to_10_per_minute(client, db_session, headers, limits_on):
    uni = University(name="RL Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()
    note_id = client.post("/notes", data={"title": "RL", "university_id": uni.id}, headers=headers).json()["id"]

    statuses = _statuses(lambda: client.post(f"/notes/{note_id}/comments", json={"content": "hi"}, headers=headers), 11)

    assert statuses == [200] * 10 + [429]


def test_create_note_is_limited_to_20_per_hour(client, db_session, headers, limits_on):
    uni = University(name="RL Notes Uni", city="C", region="", is_approved=True)
    db_session.add(uni)
    db_session.commit()

    statuses = _statuses(lambda: client.post("/notes", data={"title": "N", "university_id": uni.id}, headers=headers), 21)

    assert statuses == [200] * 20 + [429]


def test_default_limit_applies_to_routes_without_their_own(client, limits_on):
    allowed = int(settings.RATE_LIMIT_PER_MINUTE.split("/")[0])

    statuses = _statuses(lambda: client.get("/tags"), allowed + 1)

    assert statuses[:allowed] == [200] * allowed
    assert statuses[-1] == 429
