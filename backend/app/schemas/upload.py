"""
Schemas for S3-style presigned upload flow.
"""
from pydantic import BaseModel, Field


class PresignedUploadRequest(BaseModel):
    """Client request for an upload URL (phase 1)."""

    filename: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., min_length=1, max_length=64)  # e.g. application/pdf, image/jpeg


class PresignedUploadResponse(BaseModel):
    """Response with URL and fields for client to upload (phase 2)."""

    upload_url: str
    method: str = "PUT"
    key: str  # Object key to store in DB after client confirms (phase 3)
    expires_in_seconds: int = 3600
