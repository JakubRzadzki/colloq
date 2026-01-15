"""
Pydantic schemas for request/response validation.

Updated to support:
- Registration without CAPTCHA
- Community-submitted universities, faculties, fields, and subjects
- Optional note content (image-only notes)
- Faculty hierarchy
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ===========================
# USER SCHEMAS
# ===========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    university_id: int


class UserOut(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    is_admin: bool
    is_verified: bool
    university_id: int

    class Config:
        from_attributes = True


# Registration without CAPTCHA
class RegisterRequest(BaseModel):
    user: UserCreate


# ===========================
# HIERARCHY SCHEMAS
# ===========================

# University
class UniversityCreate(BaseModel):
    name: str
    city: str
    region: str


class UniversityOut(BaseModel):
    id: int
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: str
    region: str
    type: Optional[str] = None
    image_url: Optional[str] = None
    is_approved: bool = True

    class Config:
        from_attributes = True


# Faculty
class FacultyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    university_id: int


class FacultyOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    university_id: int
    is_approved: bool = True

    class Config:
        from_attributes = True


# Field of Study
class FieldOfStudyCreate(BaseModel):
    name: str
    degree_level: str
    faculty_id: int  # UPDATED: Now references faculty instead of university


class FieldOfStudyOut(BaseModel):
    id: int
    name: str
    degree_level: Optional[str] = None
    faculty_id: int  # UPDATED
    university_id: Optional[int] = None  # For backward compatibility
    is_approved: bool = True

    class Config:
        from_attributes = True


# Subject
class SubjectCreate(BaseModel):
    name: str
    semester: int
    field_of_study_id: int


class SubjectOut(BaseModel):
    id: int
    name: str
    semester: Optional[int] = None
    field_of_study_id: int
    is_approved: bool = True

    class Config:
        from_attributes = True


# ===========================
# NOTE SCHEMAS
# ===========================

class NoteCreate(BaseModel):
    """Note creation - title and content are now optional."""
    title: Optional[str] = None
    content: Optional[str] = None
    university_id: int
    subject_id: int
    video_url: Optional[str] = None
    link_url: Optional[str] = None


class NoteOut(BaseModel):
    id: int
    title: Optional[str] = None
    content: Optional[str] = None
    score: float
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    created_at: datetime
    university_id: int
    subject_id: Optional[int] = None
    author: UserOut
    subject: Optional[SubjectOut] = None

    class Config:
        from_attributes = True


# ===========================
# ADMIN SCHEMAS
# ===========================

class PendingItemsResponse(BaseModel):
    """Response containing all pending items for admin review."""
    notes: list
    universities: list
    faculties: list  # NEW
    fields: list
    subjects: list


# ===========================
# AUTH SCHEMAS
# ===========================

class Token(BaseModel):
    access_token: str
    token_type: str


class ChatRequest(BaseModel):
    message: str
    note_content: Optional[str] = ""