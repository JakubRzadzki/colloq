"""Home page payload."""
from fastapi import APIRouter

from app.core.deps import DbSession
from app.services.home_service import get_home_data

router = APIRouter(tags=["home"])


@router.get("/home")
def get_home(db: DbSession):
    """Single endpoint for home: stats, leaderboard, activity feed, recent notes, universities."""
    return get_home_data(db)
