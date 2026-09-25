"""File storage used by services. Injected via Depends so tests can swap it for a fake."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Protocol

from app.services import file_manager


class Upload(Protocol):
    """The part of an uploaded file the storage needs (satisfied by fastapi.UploadFile)."""
    filename: str | None
    content_type: str | None
    file: BinaryIO


@dataclass(frozen=True)
class SavedFile:
    url: str
    type: str
    name: str


class LocalFileStorage:
    """Stores files under settings.UPLOAD_DIR through file_manager."""

    def save_image(self, file: Upload, directory: str = file_manager.DIR_NOTES) -> str:
        return file_manager.save_upload(file, directory)  # type: ignore[arg-type]

    def save_note_attachment(self, file: Upload, note_id: int) -> SavedFile:
        url, file_type, name = file_manager.save_upload_for_note(file, note_id)  # type: ignore[arg-type]
        return SavedFile(url=url, type=file_type, name=name)

    def delete(self, path: str | None) -> None:
        # Seeded/default images are external URLs; only files we stored locally are removed.
        if not path or path.lower().startswith(file_manager.EXTERNAL_URL_PREFIXES):
            return
        file_manager.delete_file(path)

    def path_for(self, stored_path: str) -> Path:
        return file_manager.resolve_physical_path(stored_path)


def get_storage() -> LocalFileStorage:
    return LocalFileStorage()
