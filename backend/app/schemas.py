"""
Pydantic schemas for Colloq PRO.
"""
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# --- USER ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    university_id: int

class UserOut(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: bool
    is_verified: bool
    university_id: int
    class Config:
        from_attributes = True

class RegisterRequest(BaseModel):
    user: UserCreate

# --- HIERARCHY ---
class UniversityOut(BaseModel):
    id: int
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: str
    region: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_approved: bool = True
    class Config:
        from_attributes = True

class FacultyOut(BaseModel):
    id: int
    name: str
    image_url: Optional[str] = None
    university_id: int
    class Config:
        from_attributes = True

class FieldOfStudyOut(BaseModel):
    id: int
    name: str
    degree_level: Optional[str] = None
    faculty_id: int
    class Config:
        from_attributes = True

class SubjectCreate(BaseModel):
    name: str
    semester: int
    field_of_study_id: int

class SubjectOut(BaseModel):
    id: int
    name: str
    semester: Optional[int] = None
    field_of_study_id: int
    class Config:
        from_attributes = True

class FieldOfStudyCreate(BaseModel):
    name: str
    degree_level: str
    faculty_id: int

# --- COMMUNITY ---
class ReviewCreate(BaseModel):
    university_id: int
    rating: int
    content: str

class ReviewOut(BaseModel):
    id: int
    rating: int
    content: str
    created_at: datetime
    user: UserOut
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str

class CommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    user: UserOut
    class Config:
        from_attributes = True

# --- NOTES ---
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
    author: UserOut
    subject: Optional[SubjectOut] = None
    class Config:
        from_attributes = True

# --- ADMIN ---
class ImageRequestOut(BaseModel):
    id: int
    university_id: int
    new_image_url: str
    status: str
    submitted_by_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PendingItemsResponse(BaseModel):
    notes: List[NoteOut]
    universities: List[UniversityOut]
    faculties: List[FacultyOut]
    fields: List[FieldOfStudyOut]
    subjects: List[SubjectOut]
    image_requests: List[ImageRequestOut]

# --- INTERACTIONS ---
class VoteResponse(BaseModel):
    msg: str
    new_score: float
    user_has_voted: bool

class FavoriteResponse(BaseModel):
    msg: str
    is_favorited: bool

class UserDashboard(BaseModel):
    my_notes: List[NoteOut]
    my_favorites: List[NoteOut]
    pending_submissions: dict

class Token(BaseModel):
    access_token: str
    token_type: str