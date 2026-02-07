"""
Pydantic schemas for domain entities (API input/output).
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import NoteVisibility, ProcessingStatus, Region, UserRole


# -----------------------------------------------------------------------------
# User
# -----------------------------------------------------------------------------


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.USER
    is_verified_student: bool = False


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    reputation_points: int = 0
    uploaded_notes_count: int = 0
    role: UserRole
    is_verified_student: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# University
# -----------------------------------------------------------------------------


class UniversityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    region: Region
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class UniversityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    slug: str = Field(..., min_length=1, max_length=120)
    region: Region = Region.OTHER
    is_active: bool = True


# -----------------------------------------------------------------------------
# Faculty
# -----------------------------------------------------------------------------


class FacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    university_id: int
    created_at: datetime
    updated_at: datetime


class FacultyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    university_id: int


# -----------------------------------------------------------------------------
# Major
# -----------------------------------------------------------------------------


class MajorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    faculty_id: int
    created_at: datetime
    updated_at: datetime


class MajorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    faculty_id: int


# -----------------------------------------------------------------------------
# Subject
# -----------------------------------------------------------------------------


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    major_id: int
    semester: int = Field(..., ge=1, le=10)
    created_at: datetime
    updated_at: datetime


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    major_id: int
    semester: int = Field(..., ge=1, le=10)


# -----------------------------------------------------------------------------
# Note & Attachment
# -----------------------------------------------------------------------------


class AttachmentOut(BaseModel):
    """Attachment output; file_url and file_key are None when access is restricted (give-to-get)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    note_id: int
    file_key: Optional[str] = None  # S3 object key; None when masked
    file_url: Optional[str] = None  # Presigned/public URL; None when masked
    file_type: str
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    file_size_bytes: Optional[int] = None
    created_at: datetime


class NoteOut(BaseModel):
    """
    Note output. When can_view_full_content is False:
    - description is None (masked)
    - attachments: file_url and file_key are None (blurred preview CTA)
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None  # None when masked (give-to-get)
    visibility: NoteVisibility = NoteVisibility.PRIVATE
    user_id: int
    subject_id: Optional[int] = None  # None for draft/quick-capture notes
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentOut] = []


class NoteCreate(BaseModel):
    """Create note. Quick-capture: subject_id can be None for draft; visibility=PUBLIC requires subject_id (enforced in service)."""

    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    visibility: NoteVisibility = NoteVisibility.PRIVATE
    subject_id: Optional[int] = None


class AttachmentConfirmCreate(BaseModel):
    """Payload when client confirms upload (phase 3): store key, url, type, size in DB."""

    key: str = Field(..., min_length=1, max_length=1024)
    file_type: str = Field(..., min_length=1, max_length=64)
    file_size_bytes: Optional[int] = Field(None, ge=0)
