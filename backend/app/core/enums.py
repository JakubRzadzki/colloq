"""
Domain enums for type safety and API contracts.
"""
from enum import Enum


class Region(str, Enum):
    """Geographic region for universities."""

    MALOPOLSKIE = "malopolskie"
    MAZOWIECKIE = "mazowieckie"
    SLASKIE = "slaskie"
    WIELKOPOLSKIE = "wielkopolskie"
    POMORSKIE = "pomorskie"
    DOLNOSLASKIE = "dolnoslaskie"
    LODZKIE = "lodzkie"
    OTHER = "other"


class UserRole(str, Enum):
    """User role for authorization."""

    USER = "user"
    ADMIN = "admin"


class NoteVisibility(str, Enum):
    """Note visibility for access control and quick-capture flow."""

    PRIVATE = "private"
    PUBLIC = "public"


class ProcessingStatus(str, Enum):
    """Attachment processing state (S3 async pipeline)."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
