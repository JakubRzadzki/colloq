"""
File upload service: Local file system storage.
Phase 1: Client requests upload URL.
Phase 2: Backend validates file type and returns local upload endpoint URL.
Phase 3: Client uploads to URL, then confirms; backend stores key/url/size in DB.
"""
from __future__ import annotations

import os
import re
import uuid
from typing import Optional, Tuple

from app.core.config import settings

# Allowed extensions and their content types for validation
ALLOWED_FILE_TYPES = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
}


def _validate_file_type(filename: str, file_type: str) -> Tuple[bool, Optional[str]]:
    """
    Validate extension and content type. Returns (ok, error_message).
    Accepts file_type as MIME (e.g. application/pdf) or extension.
    """
    ext = (filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    allowed_mimes = set(ALLOWED_FILE_TYPES.values())
    if not ext or ext not in ALLOWED_FILE_TYPES:
        return False, f"File type not allowed. Allowed: {list(ALLOWED_FILE_TYPES.keys())}"
    expected_mime = ALLOWED_FILE_TYPES.get(ext)
    if file_type.lower() != expected_mime and file_type.lower() not in {m.lower() for m in allowed_mimes}:
        return False, "File type does not match extension"
    return True, None


class FileService:
    """
    Local file upload service.
    Saves files directly to the local file system.
    """

    def __init__(self) -> None:
        # Ensure uploads directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def generate_presigned_post(
        self,
        filename: str,
        file_type: str,
        prefix: Optional[str] = None,
        expires_in: int = 3600,
    ) -> dict:
        """
        Validate file type and return local upload endpoint.
        Returns dict with: upload_url, method ("PUT"), key, expires_in_seconds.
        """
        ok, err = _validate_file_type(filename, file_type)
        if not ok:
            raise ValueError(err or "Invalid file type")

        # Sanitize filename for key
        safe_name = re.sub(r"[^\w.\-]", "_", filename)[:200]
        unique = uuid.uuid4().hex[:12]
        folder = prefix or "notes"
        key = f"{folder}/{unique}_{safe_name}"

        # Return local upload endpoint (must match route: /api/v1/uploads/storage/{key})
        return {
            "upload_url": f"{settings.API_URL}/api/v1/uploads/storage/{key}",
            "method": "PUT",
            "key": key,
            "expires_in_seconds": expires_in,
        }


# Singleton for dependency injection
file_service = FileService()
