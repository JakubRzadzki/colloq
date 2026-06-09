"""
Single source of truth for all file I/O: save, delete, path normalization.
Ensures paths use forward slashes for cross-platform (Windows/Linux) previews.
"""
from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

from app.core.config import settings

# Subdirs under UPLOAD_DIR
DIR_AVATARS = "avatars"
DIR_NOTES = "notes"
DIR_UNIVERSITIES = "universities"
DIR_FACULTIES = "faculties"

# Allow-list for uploaded files (defence against stored-XSS / executable uploads).
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    # Some clients send a generic type; the extension check above is the hard gate.
    "application/octet-stream",
}


def validate_file_type(file: UploadFile) -> None:
    """Reject uploads whose extension or content-type is not in the allow-list."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext or '(none)'} not allowed")
    content_type = (file.content_type or "").lower()
    if content_type and not (
        content_type.startswith("image/") or content_type in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(status_code=400, detail=f"Content type {content_type} not allowed")


def _normalize_path(path: str) -> str:
    """Return path with forward slashes (fixes preview on frontend/Linux)."""
    if not path:
        return path
    return path.replace("\\", "/").replace("//", "/")


def _relative_path_from_url(url: Optional[str]) -> Optional[str]:
    """Convert URL like /uploads/notes/abc.jpg to relative path uploads/notes/abc.jpg."""
    if not url or not url.strip():
        return None
    path = url.strip()
    if path.startswith("/"):
        path = path.lstrip("/")
    return _normalize_path(path)


def _resolve_physical_path(relative_path: str) -> Path:
    """Resolve relative path (with /) to absolute file path. Prevents path traversal."""
    normalized = _normalize_path(relative_path)
    normalized = re.sub(r"\.\.+", "", normalized)
    parts = [p for p in normalized.split("/") if p]
    return Path(settings.UPLOAD_DIR).joinpath(*parts)


def validate_file_size(file: UploadFile, max_size: int, file_type: str = "file") -> None:
    """Validate file size against limit. Raises HTTPException if too large."""
    from fastapi import HTTPException
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    if size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"{file_type} size exceeds limit of {max_size // (1024*1024)}MB"
        )


def save_upload(file: UploadFile, directory: str) -> str:
    """
    Save uploaded file with uuid4 + original extension. Return URL path with forward slashes.
    directory: one of DIR_AVATARS, DIR_NOTES, DIR_UNIVERSITIES, DIR_FACULTIES.
    """
    validate_file_type(file)
    # Validate file size based on directory type
    if directory in [DIR_AVATARS, DIR_UNIVERSITIES, DIR_FACULTIES]:
        validate_file_size(file, settings.MAX_IMAGE_SIZE, "Image")
    else:
        validate_file_size(file, settings.MAX_FILE_SIZE, "File")
    
    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    safe_ext = ext if re.match(r"^\.\w+$", ext) else ""
    name = f"{uuid.uuid4().hex[:12]}{safe_ext}"
    subdir = directory.strip().strip("/")
    rel = f"{subdir}/{name}"
    physical = _resolve_physical_path(rel)
    physical.parent.mkdir(parents=True, exist_ok=True)
    content = file.file.read()
    with open(physical, "wb") as f:
        f.write(content)
    return _normalize_path(f"/uploads/{rel}")


def save_upload_for_note(file: UploadFile, note_id: int) -> tuple[str, str, str]:
    """
    Save file for a note to uploads/notes/{note_id}/{uuid}_{filename}.
    Returns (file_url, file_type, file_name) - all with forward slashes in paths.
    """
    validate_file_type(file)
    filename = file.filename or "file"
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    safe_ext = ext if re.match(r"^\.\w+$", ext) else ""
    safe_name = re.sub(r"[^\w.\-]", "_", filename)[:200]
    unique = uuid.uuid4().hex[:12]
    stored_filename = f"{unique}_{safe_name}"
    subdir = f"{DIR_NOTES}/{note_id}"
    rel = f"{subdir}/{stored_filename}"
    physical = _resolve_physical_path(rel)
    physical.parent.mkdir(parents=True, exist_ok=True)
    content = file.file.read()
    with open(physical, "wb") as f:
        f.write(content)
    file_url = _normalize_path(f"notes/{note_id}/{stored_filename}")
    file_type = (ext.lstrip(".") or "bin").lower()
    return (file_url, file_type, filename)


def delete_file(relative_path: Optional[str]) -> bool:
    """
    Delete file by relative path or URL path. Returns True if deleted or already missing.
    Safe to call with None or empty string; no-op and returns True.
    """
    rel = _relative_path_from_url(relative_path)
    if not rel:
        return True
    physical = _resolve_physical_path(rel)
    try:
        if physical.is_file():
            physical.unlink()
        return True
    except OSError:
        return False


def normalize_stored_path(url_or_path: Optional[str]) -> Optional[str]:
    """Normalize a stored image_url/file_url to forward slashes for API responses."""
    return _normalize_path(url_or_path) if url_or_path else None
