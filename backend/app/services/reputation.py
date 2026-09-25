"""Reputation rules. Every change to User.reputation_points goes through here."""
from app.models import User

NOTE_APPROVED = 10
VOTE_RECEIVED = 1
REVIEW_RECEIVED = 1


def _add(user: User, points: int) -> None:
    user.reputation_points = max((user.reputation_points or 0) + points, 0)


def note_approved(author: User) -> None:
    """A note became public: count the upload and award points."""
    author.uploads_count = (author.uploads_count or 0) + 1
    _add(author, NOTE_APPROVED)


def vote_received(author: User) -> None:
    _add(author, VOTE_RECEIVED)


def vote_withdrawn(author: User) -> None:
    _add(author, -VOTE_RECEIVED)


def review_received(author: User) -> None:
    _add(author, REVIEW_RECEIVED)
