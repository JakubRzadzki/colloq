"""one review per user and target

Revision ID: 55a865ef70da
Revises: 44fa1a10dc90
Create Date: 2026-09-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "55a865ef70da"
down_revision: Union[str, Sequence[str], None] = "44fa1a10dc90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep each user's oldest review per note / per university.
    op.execute(
        """
        DELETE FROM reviews a
        USING reviews b
        WHERE a.user_id = b.user_id
          AND a.note_id = b.note_id
          AND a.id > b.id
        """
    )
    op.execute(
        """
        DELETE FROM reviews a
        USING reviews b
        WHERE a.user_id = b.user_id
          AND a.university_id = b.university_id
          AND a.id > b.id
        """
    )
    # Ratings were computed including the removed duplicates.
    op.execute(
        """
        UPDATE notes SET
            avg_rating = COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.note_id = notes.id), 0),
            rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.note_id = notes.id)
        """
    )
    op.create_unique_constraint("uq_review_user_note", "reviews", ["user_id", "note_id"])
    op.create_unique_constraint("uq_review_user_university", "reviews", ["user_id", "university_id"])


def downgrade() -> None:
    op.drop_constraint("uq_review_user_university", "reviews", type_="unique")
    op.drop_constraint("uq_review_user_note", "reviews", type_="unique")
