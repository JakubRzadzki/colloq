from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str
    university_id: int

# Update University Schema
class UniversityOut(BaseModel):
    id: int
    name_en: str
    name_pl: str
    region: str
    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: str
    nickname: Optional[str] = None
    is_admin: bool
    is_verified: bool
    # Opcjonalnie można dodać info o uczelni tutaj
    class Config:
        from_attributes = True

class NoteOut(BaseModel):
    id: int
    title: str
    content: str
    score: float
    image_url: Optional[str] = None
    created_at: datetime
    author: UserOut
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str