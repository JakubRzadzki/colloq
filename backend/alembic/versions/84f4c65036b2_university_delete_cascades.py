"""cascade image requests and detach users when a university is deleted

Revision ID: 84f4c65036b2
Revises: 55a865ef70da
Create Date: 2026-09-25 23:30:00.000000

"""
from collections.abc import Sequence

from alembic import op

revision: str = "84f4c65036b2"
down_revision: str | Sequence[str] | None = "55a865ef70da"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _replace_fk(name: str, table: str, column: str, ondelete: str | None) -> None:
    op.drop_constraint(name, table, type_="foreignkey")
    op.create_foreign_key(name, table, "universities", [column], ["id"], ondelete=ondelete)


def upgrade() -> None:
    _replace_fk("image_requests_university_id_fkey", "image_requests", "university_id", "CASCADE")
    _replace_fk("users_university_id_fkey", "users", "university_id", "SET NULL")


def downgrade() -> None:
    _replace_fk("users_university_id_fkey", "users", "university_id", None)
    _replace_fk("image_requests_university_id_fkey", "image_requests", "university_id", None)
