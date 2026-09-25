"""Small SQL helpers shared by repositories and routers."""

LIKE_ESCAPE = "\\"


def escape_like(value: str) -> str:
    """Escape LIKE/ILIKE wildcards so user input matches literally.

    Use together with `column.ilike(pattern, escape=LIKE_ESCAPE)`.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
