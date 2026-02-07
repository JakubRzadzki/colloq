"""
Legacy Pydantic schemas for main.py (Colloq API v2).
Re-exported from app.schemas so "from app.schemas import UserCreate" etc. works.
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
    is_banned: bool = False
    is_verified: bool = False
    reputation_points: int = 0
    uploads_count: int = 0
    university_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


UserResponse = UserOut


class RegisterRequest(BaseModel):
    user: UserCreate


# =============================================================================
# HIERARCHY SCHEMAS
# =============================================================================

class UniversityOut(BaseModel):
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
# NOTE SCHEMAS
# =============================================================================

class NoteImageOut(BaseModel):
    id: int
    note_id: int
    image_url: str
    caption: Optional[str] = None
    position: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    name: str


class NoteOut(BaseModel):
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
    view_count: int = 0
    download_count: int = 0
    author: Optional[UserOut] = None
    subject: Optional[SubjectOut] = None
    images: List[NoteImageOut] = []
    tags: List[TagOut] = []

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
    university_name: Optional[str] = None

    class Config:
        from_attributes = True


class PendingItemsResponse(BaseModel):
    notes: List[NoteOut] = []
    universities: List[UniversityOut] = []
    faculties: List[FacultyOut] = []
    fields: List[FieldOfStudyOut] = []
    subjects: List[SubjectOut] = []
    image_requests: List[ImageRequestOut] = []


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


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    related_id: Optional[int] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    note_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    note_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
