"""
Permission and access-level schemas for the give-to-get (leech protection) feature.
The API returns this so the frontend can show blurred content instead of 403.
"""
from pydantic import BaseModel, ConfigDict


class PermissionState(BaseModel):
    """
    Indicates whether the current user can view full note content (including file_url).
    When can_view_full_content is False, the API should return note metadata but
    mask or null out file_url / attachment URLs so the frontend can render a blurred page.
    """

    model_config = ConfigDict(frozen=True)

    can_view_full_content: bool
    reason: str = ""  # e.g. "contributor" | "admin" | "must_contribute_first"
