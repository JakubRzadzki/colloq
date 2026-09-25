"""
Colloq API — Consolidated Pydantic schemas.
Define child models before parents to avoid forward-reference issues.
"""
from datetime import datetime
from enum import Enum
from typing import Annotated, List, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.file_manager import normalize_stored_path

# Stored upload paths are returned with forward slashes; external URLs pass through unchanged.
NormalizedPath = Annotated[Optional[str], AfterValidator(normalize_stored_path)]


# -----------------------------------------------------------------------------
# User (defined first; referenced by ReviewOut, CommentOut, NoteOut)
# -----------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    university_id: Optional[int] = None


class UserOut(BaseModel):
    """Output schema for user data. Matches User model."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: NormalizedPath = None
    is_admin: bool = False
    is_banned: bool = False
    is_verified: bool = False
    reputation_points: int = 0
    uploads_count: int = 0
    university_id: Optional[int] = None
    created_at: Optional[datetime] = None



class PublicUserOut(BaseModel):
    """Public-facing user info (no email). Used for nested author/user fields."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    nickname: Optional[str] = None
    avatar_url: NormalizedPath = None
    reputation_points: int = 0


class RegisterRequest(BaseModel):
    user: UserCreate


# -----------------------------------------------------------------------------
# Hierarchy (no forward refs)
# -----------------------------------------------------------------------------

class UniversityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: str = ""
    region: str = ""
    country: str = "Poland"
    description: Optional[str] = None
    image_url: NormalizedPath = None
    banner_url: NormalizedPath = None
    is_approved: bool = True
    created_at: Optional[datetime] = None


class FacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    image_url: NormalizedPath = None
    university_id: int
    is_approved: bool = True


class FieldOfStudyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    degree_level: Optional[str] = None
    faculty_id: int
    is_approved: bool = True


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    field_of_study_id: int
    is_approved: bool = True


class SubjectCreate(BaseModel):
    name: str
    semester: int
    academic_year: Optional[str] = None
    field_of_study_id: int


class FieldOfStudyCreate(BaseModel):
    name: str
    degree_level: str
    faculty_id: int


# -----------------------------------------------------------------------------
# Community (ReviewOut, CommentOut use UserOut — already defined)
# -----------------------------------------------------------------------------

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    content: Optional[str] = None
    note_id: Optional[int] = None
    university_id: Optional[int] = None


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rating: int
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    user: Optional[PublicUserOut] = None


class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    created_at: Optional[datetime] = None
    user: Optional[PublicUserOut] = None


# -----------------------------------------------------------------------------
# Note-related (NoteFileOut, NoteImageOut, TagOut before NoteOut)
# -----------------------------------------------------------------------------

class NoteFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    note_id: int
    file_url: NormalizedPath
    file_type: str
    file_name: str
    created_at: Optional[datetime] = None


class NoteImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    note_id: int
    image_url: NormalizedPath
    caption: Optional[str] = None
    position: int = 0
    created_at: Optional[datetime] = None


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class TagCreate(BaseModel):
    name: str = Field(max_length=80)


class NoteTagsUpdate(BaseModel):
    tag_ids: List[int] = []


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: Optional[str] = None
    content: Optional[str] = None
    score: float = 0.0
    avg_rating: float = 0.0
    rating_count: int = 0
    file_url: NormalizedPath = None
    image_url: NormalizedPath = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    created_at: Optional[datetime] = None
    university_id: int = 0
    subject_id: Optional[int] = None
    user_id: Optional[int] = None
    is_approved: bool = True
    view_count: int = 0
    download_count: int = 0
    author: Optional[PublicUserOut] = None
    subject: Optional[SubjectOut] = None
    images: List[NoteImageOut] = []
    files: List[NoteFileOut] = []
    tags: List[TagOut] = []


class NoteHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    note_id: int
    title: Optional[str] = None
    content: Optional[str] = None
    edited_at: Optional[datetime] = None
    edited_by: Optional[int] = None


# -----------------------------------------------------------------------------
# Admin (ImageRequestOut before PendingItemsResponse)
# -----------------------------------------------------------------------------

class ImageRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    university_id: int
    new_image_url: str
    status: str
    submitted_by_id: int
    created_at: Optional[datetime] = None
    university_name: Optional[str] = None


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


class Token(BaseModel):
    access_token: str
    token_type: str


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    type: str
    message: str
    related_id: Optional[int] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ReportCreate(BaseModel):
    note_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str = Field(max_length=100)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reporter_id: int
    note_id: Optional[int] = None
    reported_user_id: Optional[int] = None
    reason: str
    status: str
    created_at: Optional[datetime] = None


class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None


class BanUserBody(BaseModel):
    banned: bool = False


class NoteSort(str, Enum):
    date = "date"
    score = "score"
    views = "views"


class NoteFilters(BaseModel):
    """Query parameters of GET /notes."""
    university_id: Optional[int] = None
    subject_id: Optional[int] = None
    semester: Optional[int] = None
    # The frontend sends tag ids as a single comma-separated value: tag_ids=1,2,3
    tag_ids: List[int] = []
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None
    sort: NoteSort = NoteSort.date
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator("tag_ids", mode="before")
    @classmethod
    def _split_tag_ids(cls, value: object) -> object:
        if value is None:
            return []
        raw = [value] if isinstance(value, str) else value
        if not isinstance(raw, list):
            return value
        return [part.strip() for item in raw for part in str(item).split(",") if part.strip()]

    @field_validator("search")
    @classmethod
    def _blank_search_to_none(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() or None if value else None


class PaginatedNotesResponse(BaseModel):
    """Paginated response for notes listing."""
    items: List[NoteOut] = []
    total: int = 0
    page: int = 1
    page_size: int = 20


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
