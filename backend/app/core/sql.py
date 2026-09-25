"""Small SQL helpers shared by repositories and routers."""
from sqlalchemy.orm import Query

LIKE_ESCAPE = "\\"


def paginate(query: Query, limit: int, offset: int) -> tuple[list, int]:
    """Return one page of `query` and the total number of rows."""
    total = query.order_by(None).count()
    return query.limit(limit).offset(offset).all(), total


def escape_like(value: str) -> str:
    """Escape LIKE/ILIKE wildcards so user input matches literally.

    Use together with `column.ilike(pattern, escape=LIKE_ESCAPE)`.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
