"""
File upload service: S3 presigned URL pattern.
Phase 1: Client requests upload URL.
Phase 2: Backend validates file type and returns presigned PUT URL (or mock).
Phase 3: Client uploads to URL, then confirms; backend stores key/url/size in DB.
"""
from __future__ import annotations

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
    Generates presigned PUT URLs for direct-to-S3 uploads.
    When S3 is not configured, returns a mock URL for development.
    """

    def __init__(self) -> None:
        self._client = None
        if settings.s3_configured:
            try:
                import boto3
                self._client = boto3.client(
                    "s3",
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
            except Exception:
                self._client = None

    def generate_presigned_post(
        self,
        filename: str,
        file_type: str,
        prefix: Optional[str] = None,
        expires_in: int = 3600,
    ) -> dict:
        """
        Validate file type and generate a presigned PUT URL (and key for DB).
        Returns dict with: upload_url, method ("PUT"), key, expires_in_seconds.
        For development without S3, returns a mock URL and a stable key.
        """
        ok, err = _validate_file_type(filename, file_type)
        if not ok:
            raise ValueError(err or "Invalid file type")

        # Sanitize filename for key
        safe_name = re.sub(r"[^\w.\-]", "_", filename)[:200]
        unique = uuid.uuid4().hex[:12]
        folder = prefix or settings.S3_UPLOAD_PREFIX
        key = f"{folder}/{unique}_{safe_name}"

        if self._client and settings.S3_BUCKET:
            url = self._client.generate_presigned_url(
                "put_object",
                Params={"Bucket": settings.S3_BUCKET, "Key": key, "ContentType": file_type},
                ExpiresIn=expires_in,
            )
            return {
                "upload_url": url,
                "method": "PUT",
                "key": key,
                "expires_in_seconds": expires_in,
            }

        # Mock for local/dev: client can POST to our confirm endpoint with the key
        mock_base = "https://mock-s3.local"
        return {
            "upload_url": f"{mock_base}/upload?key={key}",
            "method": "PUT",
            "key": key,
            "expires_in_seconds": expires_in,
        }


# Singleton for dependency injection
file_service = FileService()
