"""
Single source of truth for all file I/O: save, delete, path normalization.
Ensures paths use forward slashes for cross-platform (Windows/Linux) previews.
"""
from __future__ import annotations

import logging
import re
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import DomainError

logger = logging.getLogger(__name__)

UPLOADS_URL_PREFIX = "uploads/"

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
        raise DomainError(f"File type {ext or '(none)'} not allowed")
    content_type = (file.content_type or "").lower()
    if content_type and not (
        content_type.startswith("image/") or content_type in ALLOWED_CONTENT_TYPES
    ):
        raise DomainError(f"Content type {content_type} not allowed")


def _normalize_path(path: str) -> str:
    """Return path with forward slashes (fixes preview on frontend/Linux)."""
    if not path:
        return path
    return path.replace("\\", "/").replace("//", "/")


def is_public_url(stored: str) -> bool:
    """Images are stored as "/uploads/..." URLs; note attachments as paths relative to PRIVATE_UPLOAD_DIR."""
    return _normalize_path(stored.strip()).lstrip("/").startswith(UPLOADS_URL_PREFIX)


def _relative_path_from_url(url: Optional[str]) -> Optional[str]:
    """Convert a stored URL like /uploads/notes/abc.jpg to a path relative to UPLOAD_DIR (notes/abc.jpg)."""
    if not url or not url.strip():
        return None
    path = _normalize_path(url.strip()).lstrip("/")
    # save_upload stores "/uploads/<dir>/<name>", while UPLOAD_DIR is the uploads directory itself.
    if path.startswith(UPLOADS_URL_PREFIX):
        path = path[len(UPLOADS_URL_PREFIX):]
    return path


def resolve_physical_path(relative_path: str, base_dir: str | None = None) -> Path:
    """Resolve a stored relative path inside base_dir (UPLOAD_DIR by default).

    Raises ValueError when the resolved path would leave the base directory
    (e.g. "../../etc/passwd" or an absolute path).
    """
    base = Path(base_dir or settings.UPLOAD_DIR).resolve()
    candidate = (base / _normalize_path(relative_path).lstrip("/")).resolve()
    if not candidate.is_relative_to(base):
        raise ValueError(f"Path escapes the upload directory: {relative_path!r}")
    return candidate


def validate_file_size(file: UploadFile, max_size: int, file_type: str = "file") -> None:
    """Validate file size against limit. Raises DomainError (400) if too large."""
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_size:
        raise DomainError(f"{file_type} size exceeds limit of {max_size // (1024*1024)}MB")


def save_upload(file: UploadFile, directory: str) -> str:
    """
    Save uploaded file with uuid4 + original extension. Return URL path with forward slashes.
    directory: one of DIR_AVATARS, DIR_NOTES, DIR_UNIVERSITIES, DIR_FACULTIES.
    """
    validate_file_type(file)
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
    physical = resolve_physical_path(rel)
    physical.parent.mkdir(parents=True, exist_ok=True)
    with open(physical, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return _normalize_path(f"/uploads/{rel}")


def save_upload_for_note(file: UploadFile, note_id: int) -> tuple[str, str, str]:
    """
    Save a note attachment to PRIVATE_UPLOAD_DIR/notes/{note_id}/{uuid}_{filename}.
    Returns (file_url, file_type, file_name); file_url is relative to PRIVATE_UPLOAD_DIR.
    """
    validate_file_type(file)
    validate_file_size(file, settings.MAX_FILE_SIZE, "File")
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
    physical = resolve_physical_path(rel, settings.PRIVATE_UPLOAD_DIR)
    physical.parent.mkdir(parents=True, exist_ok=True)
    with open(physical, "wb") as f:
        shutil.copyfileobj(file.file, f)
    file_url = _normalize_path(f"notes/{note_id}/{stored_filename}")
    file_type = (ext.lstrip(".") or "bin").lower()
    return (file_url, file_type, filename)


def attachment_path(stored: str) -> Path:
    """Physical path of a note attachment. Raises ValueError for paths outside PRIVATE_UPLOAD_DIR."""
    return resolve_physical_path(_relative_path_from_url(stored) or "", settings.PRIVATE_UPLOAD_DIR)


def delete_file(relative_path: Optional[str]) -> bool:
    """
    Delete a stored file: "/uploads/..." URLs from UPLOAD_DIR, other paths (note
    attachments) from PRIVATE_UPLOAD_DIR. Returns True if deleted or already missing.
    Safe to call with None or empty string; no-op and returns True.
    """
    rel = _relative_path_from_url(relative_path)
    if not rel:
        return True
    base_dir = settings.UPLOAD_DIR if is_public_url(relative_path) else settings.PRIVATE_UPLOAD_DIR
    try:
        physical = resolve_physical_path(rel, base_dir)
    except ValueError:
        logger.warning("Refusing to delete a path outside the upload directory: %r", relative_path)
        return False
    try:
        if physical.is_file():
            physical.unlink()
        return True
    except OSError:
        return False


EXTERNAL_URL_PREFIXES = ("http://", "https://", "data:")


def normalize_stored_path(url_or_path: Optional[str]) -> Optional[str]:
    """Normalize a stored image_url/file_url to forward slashes for API responses.

    External URLs are returned untouched: collapsing "//" would turn
    "https://host" into "https:/host".
    """
    if not url_or_path:
        return None
    if url_or_path.lower().startswith(EXTERNAL_URL_PREFIXES):
        return url_or_path
    return _normalize_path(url_or_path)
