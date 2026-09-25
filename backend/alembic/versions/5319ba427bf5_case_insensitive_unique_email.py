"""case-insensitive unique user emails

Revision ID: 5319ba427bf5
Revises: 84f4c65036b2
Create Date: 2026-09-25 23:50:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5319ba427bf5"
down_revision: str | Sequence[str] | None = "84f4c65036b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    conflicts = conn.execute(sa.text(
        "SELECT lower(email) AS email, array_agg(id ORDER BY id) AS ids "
        "FROM users GROUP BY lower(email) HAVING count(*) > 1"
    )).all()
    if conflicts:
        # Merging accounts is a product decision, so refuse instead of guessing.
        details = "; ".join(f"{row.email}: user ids {list(row.ids)}" for row in conflicts)
        raise RuntimeError(
            "Cannot make emails case-insensitive: these accounts differ only in the case of their email. "
            f"Rename or remove the duplicates, then rerun the migration. {details}"
        )
    op.execute("UPDATE users SET email = lower(email) WHERE email <> lower(email)")
    op.create_index("uq_users_email_lower", "users", [sa.text("lower(email)")], unique=True)


def downgrade() -> None:
    op.drop_index("uq_users_email_lower", table_name="users")
