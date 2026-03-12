"""
Local File Storage Service for MVP
Completely bypasses S3 and stores files directly on the local filesystem.
Serves files via FastAPI's StaticFiles.
"""
from __future__ import annotations

import os
import uuid
from typing import Optional

from fastapi import UploadFile

from app.core.config import settings


class LocalFileService:
    """
    Local file storage service for MVP.
    Stores files directly in the UPLOAD_DIR directory.
    Serves files via FastAPI's StaticFiles mounted at /static/uploads.
    """

    def __init__(self) -> None:
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    def upload_file(self, file: UploadFile, destination_path: Optional[str] = None) -> str:
        """
        Upload a file to the local filesystem.
        
        Args:
            file: The uploaded file
            destination_path: Optional custom path. If None, generates a unique filename.
        
        Returns:
            The full public URL to access the file
        """
        # Generate unique filename if not provided
        if not destination_path:
            filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
        else:
            filename = destination_path
        
        # Ensure directory exists (dirname is empty when filename has no path)
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        parent = os.path.dirname(filepath)
        if parent:
            os.makedirs(parent, exist_ok=True)
        
        # Save file
        content = file.file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        # Return full public URL
        return f"{settings.API_URL}/static/uploads/{filename}"

    def delete_file(self, path: str) -> bool:
        """
        Delete a file from the local filesystem.
        
        Args:
            path: The relative path of the file to delete
        
        Returns:
            True if file was deleted, False if file didn't exist
        """
        filepath = os.path.join(settings.UPLOAD_DIR, path)
        try:
            os.remove(filepath)
            return True
        except FileNotFoundError:
            return False
        except Exception:
            return False

    def generate_presigned_url(self, path: str) -> str:
        """
        Generate a presigned URL for a file.
        For local storage, this is just the direct static URL.
        
        Args:
            path: The relative path of the file
        
        Returns:
            The full public URL to access the file
        """
        return f"{settings.API_URL}/static/uploads/{path}"


# Singleton for dependency injection
local_file_service = LocalFileService()