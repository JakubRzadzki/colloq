from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


# ===========================
# USER & AUTH SCHEMAS
# ===========================

class UserCreate(BaseModel):
    """Schema for user creation data"""
    email: EmailStr
    password: str
    university_id: int


class RegisterRequest(BaseModel):
    """
    Wrapper schema for registration request.
    """
    user: UserCreate


class UserOut(BaseModel):
    """Public user profile schema"""
    id: int
    email: str
    nickname: Optional[str] = None
    is_admin: bool
    is_verified: bool
    university_id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT Token schema"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Data embedded in JWT token"""
    email: Optional[str] = None
    is_admin: bool = False
    nickname: Optional[str] = None


# ===========================
# HIERARCHY SCHEMAS
# ===========================

class SubjectOut(BaseModel):
    """Subject schema for responses"""
    id: int
    name: str
    semester: Optional[int] = None
    field_of_study_id: int
    is_approved: Optional[bool] = None

    class Config:
        from_attributes = True


class FieldOfStudyOut(BaseModel):
    """Field of Study schema for responses"""
    id: int
    name: str
    degree_level: Optional[str] = None
    university_id: int

    class Config:
        from_attributes = True


class UniversityOut(BaseModel):
    """University schema for responses"""
    id: int
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    type: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


# ===========================
# AI & FLASHCARDS SCHEMAS
# ===========================

class FlashcardBase(BaseModel):
    """Base schema for flashcard data"""
    question: str
    answer: str


class FlashcardOut(FlashcardBase):
    """Flashcard schema with ID"""
    id: int

    class Config:
        from_attributes = True


class AISummaryRequest(BaseModel):
    """Request schema for generating a summary"""
    note_content: str


class AIFlashcardsRequest(BaseModel):
    """Request schema for generating flashcards"""
    note_content: str


# ===========================
# NOTE SCHEMAS
# ===========================

class NoteCreate(BaseModel):
    """Schema for creating a new note"""
    title: Optional[str] = None
    content: Optional[str] = None
    university_id: int
    subject_id: int
    video_url: Optional[str] = None
    link_url: Optional[str] = None


class NoteOut(BaseModel):
    """Detailed note response schema"""
    id: int
    title: str
    content: str
    score: float
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    tags: Optional[str] = None
    is_approved: bool
    created_at: datetime

    university_id: int
    subject_id: Optional[int] = None

    author: UserOut
    subject: Optional[SubjectOut] = None
    flashcards: List[FlashcardOut] = []

    class Config:
        from_attributes = True


# ===========================
# CHAT SCHEMAS
# ===========================

class ChatRequest(BaseModel):
    """Schema for AI Chat interactions"""
    message: str
    note_content: Optional[str] = ""


class ChatResponse(BaseModel):
    """Schema for AI Chat response"""
    response: str


# ===========================
# NEW SCHEMAS FOR CREATING UNIVERSITIES, FIELDS AND SUBJECTS
# ===========================

class UniversityCreate(BaseModel):
    """Schema for creating a new university"""
    name: str
    city: str
    region: str


class FieldOfStudyCreate(BaseModel):
    """Schema for creating a new field of study"""
    name: str
    degree_level: str
    university_id: int


class SubjectCreate(BaseModel):
    """Schema for creating a new subject"""
    name: str
    semester: int
    field_of_study_id: int