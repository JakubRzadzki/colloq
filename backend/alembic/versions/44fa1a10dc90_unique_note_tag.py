"""unique (note_id, tag_id) on note_tags

Revision ID: 44fa1a10dc90
Revises: b1d47ff02ce2
Create Date: 2026-09-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "44fa1a10dc90"
down_revision: Union[str, Sequence[str], None] = "b1d47ff02ce2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Keep the oldest row of every duplicated (note_id, tag_id) pair so the constraint can be created.
    op.execute(
        """
        DELETE FROM note_tags a
        USING note_tags b
        WHERE a.note_id = b.note_id
          AND a.tag_id = b.tag_id
          AND a.id > b.id
        """
    )
    op.create_unique_constraint("uq_note_tag", "note_tags", ["note_id", "tag_id"])


def downgrade() -> None:
    op.drop_constraint("uq_note_tag", "note_tags", type_="unique")
