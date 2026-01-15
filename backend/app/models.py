from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class University(Base):
	"""Database model for universities"""
	__tablename__ = "universities"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String, unique=True, index=True, nullable=False)
	name_en = Column(String, nullable=True)  # English name (optional)
	name_pl = Column(String, nullable=True)  # Polish name (can be same as name)
	city = Column(String, nullable=True)
	region = Column(String, nullable=True)  # Region for SVG map
	type = Column(String, nullable=True)  # e.g., "Publiczna", "Niepubliczna"
	image_url = Column(String, nullable=True)

	# Relationships
	users = relationship("User", back_populates="university")
	notes = relationship("Note", back_populates="university")


class User(Base):
	"""Database model for users"""
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	email = Column(String, unique=True, index=True, nullable=False)
	hashed_password = Column(String, nullable=False)
	nickname = Column(String, nullable=True)
	is_verified = Column(Boolean, default=False)
	is_admin = Column(Boolean, default=False)
	is_active = Column(Boolean, default=True)

	# Foreign key
	university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

	# Relationships
	university = relationship("University", back_populates="users")
	notes = relationship("Note", back_populates="author")


class Note(Base):
	"""Database model for student notes."""
	__tablename__ = "notes"

	id = Column(Integer, primary_key=True, index=True)
	title = Column(String, nullable=False)
	content = Column(Text, nullable=False)
	image_url = Column(String, nullable=True)
	score = Column(Float, default=0.0)  # Rating/score for the note
	is_approved = Column(Boolean, default=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	# Foreign keys
	author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

	# Relationships
	author = relationship("User", back_populates="notes")
	university = relationship("University", back_populates="notes")