from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

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

# === NOWE: Schemat do rejestracji (naprawia błąd Captcha) ===
class RegisterRequest(BaseModel):
    user: UserCreate

# ===========================
# HIERARCHY SCHEMAS (NOWE)
# ===========================

class SubjectBase(BaseModel):
    name: str
    semester: Optional[int] = None

class SubjectOut(SubjectBase):
    id: int
    field_of_study_id: int
    class Config:
        from_attributes = True

class FieldOfStudyOut(BaseModel):
    id: int
    name: str
    degree_level: Optional[str] = None
    university_id: int
    class Config:
        from_attributes = True

# ===========================
# NOTE SCHEMAS (ZAKTUALIZOWANE)
# ===========================

class NoteCreate(BaseModel):
    title: str
    content: str
    university_id: int
    subject_id: int
    video_url: Optional[str] = None
    link_url: Optional[str] = None

class NoteOut(BaseModel):
    id: int
    title: str
    content: str
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
# UNIVERSITY SCHEMAS
# ===========================

class UniversityBase(BaseModel):
    name: str
    name_en: Optional[str] = None
    name_pl: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    type: Optional[str] = None
    image_url: Optional[str] = None

class UniversityOut(UniversityBase):
    id: int
    class Config:
        from_attributes = True

# ===========================
# AUTH & CHAT
# ===========================

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    message: str
    note_content: Optional[str] = ""