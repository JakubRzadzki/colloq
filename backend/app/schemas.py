"""
Pydantic schemas for Colloq API.
Defines request/response models for all endpoints.
CRITICAL FIX: UniversityOut now accurately reflects the DB model to prevent 422 errors.
All schemas use from_attributes = True for SQLAlchemy ORM compatibility.
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    university_id: Optional[int] = None


class UserOut(BaseModel):
    """Output schema for user data. Matches User model exactly."""
    id: int
    email: str
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool = False
    is_verified: bool = False
    reputation_points: int = 0
    uploads_count: int = 0
    university_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Legacy alias for backward compatibility
UserResponse = UserOut


class RegisterRequest(BaseModel):
    user: UserCreate


# =============================================================================
# HIERARCHY SCHEMAS
# =============================================================================

class UniversityOut(BaseModel):
    """
    Output schema for University.
    CRITICAL FIX: Every field here must match the University model columns exactly.
    Optional fields have defaults to prevent validation errors when columns are NULL.
    """
    id: int
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: str = ""
    region: str = ""
    country: str = "Poland"
    description: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_approved: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FacultyOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    university_id: int
    is_approved: bool = True

    class Config:
        from_attributes = True


class FieldOfStudyOut(BaseModel):
    id: int
    name: str
    degree_level: Optional[str] = None
    faculty_id: int
    is_approved: bool = True

    class Config:
        from_attributes = True


class SubjectOut(BaseModel):
    id: int
    name: str
    semester: Optional[int] = None
    field_of_study_id: int
    is_approved: bool = True

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    name: str
    semester: int
    field_of_study_id: int


class FieldOfStudyCreate(BaseModel):
    name: str
    degree_level: str
    faculty_id: int


# =============================================================================
# COMMUNITY SCHEMAS
# =============================================================================

class ReviewCreate(BaseModel):
    rating: int
    content: Optional[str] = None
    note_id: Optional[int] = None
    university_id: Optional[int] = None
    user_id: Optional[int] = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    content: str
    created_at: Optional[datetime] = None
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


# =============================================================================
# NOTE IMAGE SCHEMAS (Rich Notes Feature)
# =============================================================================

class NoteImageOut(BaseModel):
    """Output schema for individual note images."""
    id: int
    note_id: int
    image_url: str
    caption: Optional[str] = None
    position: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# =============================================================================
# NOTE SCHEMAS
# =============================================================================

class NoteOut(BaseModel):
    """
    Output schema for notes.
    Includes the new 'images' list for multi-image rich notes,
    plus legacy image_url for backward compatibility.
    """
    id: int
    title: Optional[str] = None
    content: Optional[str] = None
    score: float = 0.0
    file_url: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    created_at: Optional[datetime] = None
    university_id: int = 0
    subject_id: Optional[int] = None
    user_id: Optional[int] = None
    is_approved: bool = True
    author: Optional[UserOut] = None
    subject: Optional[SubjectOut] = None
    images: List[NoteImageOut] = []

    class Config:
        from_attributes = True


class NoteHistoryOut(BaseModel):
    id: int
    note_id: int
    title: Optional[str] = None
    content: Optional[str] = None
    edited_at: Optional[datetime] = None
    edited_by: Optional[int] = None

    class Config:
        from_attributes = True


# =============================================================================
# ADMIN SCHEMAS
# =============================================================================

class ImageRequestOut(BaseModel):
    id: int
    university_id: int
    new_image_url: str
    status: str
    submitted_by_id: int
    created_at: Optional[datetime] = None
    university_name: Optional[str] = None  # Populated when loaded for admin UI

    class Config:
        from_attributes = True


class PendingItemsResponse(BaseModel):
    notes: List[NoteOut] = []
    universities: List[UniversityOut] = []
    faculties: List[FacultyOut] = []
    fields: List[FieldOfStudyOut] = []
    subjects: List[SubjectOut] = []
    image_requests: List[ImageRequestOut] = []


# =============================================================================
# INTERACTION SCHEMAS
# =============================================================================

class VoteResponse(BaseModel):
    msg: str
    new_score: float
    user_has_voted: bool


class FavoriteResponse(BaseModel):
    msg: str
    is_favorited: bool


class UserDashboard(BaseModel):
    my_notes: List[NoteOut] = []
    my_favorites: List[NoteOut] = []
    pending_submissions: dict = {}


class Token(BaseModel):
    access_token: str
    token_type: str
