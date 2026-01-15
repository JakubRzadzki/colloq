from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ===========================
# USER SCHEMAS
# ===========================

class UserCreate(BaseModel):
	"""Schema for user registration"""
	email: EmailStr
	password: str
	university_id: int


class UserOut(BaseModel):
	"""Schema for user output (public info)"""
	id: int
	email: str
	nickname: Optional[str] = None
	is_admin: bool
	is_verified: bool
	university_id: int

	class Config:
		from_attributes = True


class UserWithUniversity(UserOut):
	"""Extended user schema with university details"""
	university: 'UniversityOut'

	class Config:
		from_attributes = True


# ===========================
# UNIVERSITY SCHEMAS
# ===========================

class UniversityBase(BaseModel):
	"""Base schema for university data"""
	name: str
	name_en: Optional[str] = None
	name_pl: Optional[str] = None
	city: Optional[str] = None
	region: Optional[str] = None
	type: Optional[str] = None
	image_url: Optional[str] = None


class UniversityOut(UniversityBase):
	"""Schema for university output"""
	id: int

	class Config:
		from_attributes = True


class UniversityWithStats(UniversityOut):
	"""University with statistics (e.g., note count)"""
	note_count: int = 0

	class Config:
		from_attributes = True


# ===========================
# NOTE SCHEMAS
# ===========================

class NoteCreate(BaseModel):
	"""Schema for creating a new note"""
	title: str
	content: str
	university_id: int


class NoteOut(BaseModel):
	"""Schema for note output"""
	id: int
	title: str
	content: str
	score: float
	image_url: Optional[str] = None
	is_approved: bool
	created_at: datetime
	university_id: int
	author: UserOut

	class Config:
		from_attributes = True


class NoteWithUniversity(NoteOut):
	"""Extended note schema with university details"""
	university: UniversityOut

	class Config:
		from_attributes = True


# ===========================
# AUTH SCHEMAS
# ===========================

class Token(BaseModel):
	"""Schema for JWT token response"""
	access_token: str
	token_type: str


class TokenData(BaseModel):
	"""Schema for token payload data"""
	email: Optional[str] = None
	is_admin: bool = False
	nickname: Optional[str] = None


# ===========================
# CHAT SCHEMAS
# ===========================

class ChatRequest(BaseModel):
	"""Schema for AI chat request"""
	message: str
	note_content: Optional[str] = ""


class ChatResponse(BaseModel):
	"""Schema for AI chat response"""
	response: str


# ===========================
# LEADERBOARD SCHEMAS
# ===========================

class LeaderboardEntry(BaseModel):
	"""Schema for leaderboard entry"""
	name: str
	count: int
	is_verified: bool