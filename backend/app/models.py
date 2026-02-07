"""
Colloq Database Models
SQLAlchemy ORM models for the student note-sharing platform.
All relationships are explicitly defined with cascade rules for data integrity.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    """User model - stores student/user accounts with gamification fields."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    bio = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    reputation_points = Column(Integer, default=0)
    uploads_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    notes = relationship("Note", back_populates="author", cascade="all, delete-orphan", foreign_keys="Note.user_id")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")


class University(Base):
    """University model - academic institutions with multilingual name support."""
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), index=True, nullable=False)
    name_en = Column(String(300), nullable=True)
    name_pl = Column(String(300), nullable=True)
    city = Column(String(100), nullable=False)
    region = Column(String(100), nullable=False, default="")
    country = Column(String(100), nullable=False, default="Poland")
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    faculties = relationship("Faculty", back_populates="university", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="university", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="university", cascade="all, delete-orphan")


class Faculty(Base):
    """Faculty model - departments within universities."""
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    university = relationship("University", back_populates="faculties")
    fields_of_study = relationship("FieldOfStudy", back_populates="faculty", cascade="all, delete-orphan")


class FieldOfStudy(Base):
    """Field of study model - programs within faculties."""
    __tablename__ = "fields_of_study"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    degree_level = Column(String(50), nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)
    is_approved = Column(Boolean, default=True)

    # Relationships
    faculty = relationship("Faculty", back_populates="fields_of_study")
    subjects = relationship("Subject", back_populates="field_of_study", cascade="all, delete-orphan")


class Subject(Base):
    """Subject model - individual courses within fields of study."""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    semester = Column(Integer, nullable=True)
    field_of_study_id = Column(Integer, ForeignKey("fields_of_study.id"), nullable=False)
    is_approved = Column(Boolean, default=True)

    # Relationships
    field_of_study = relationship("FieldOfStudy", back_populates="subjects")
    notes = relationship("Note", back_populates="subject", cascade="all, delete-orphan")


class Note(Base):
    """
    Note model - uploaded study materials.
    Supports rich content with multiple images via the NoteImage relationship.
    The legacy image_url column is retained for backward compatibility.
    """
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), index=True, nullable=True)
    content = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)  # Legacy single-image field
    video_url = Column(String(500), nullable=True)
    link_url = Column(String(500), nullable=True)
    score = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    author = relationship("User", back_populates="notes", foreign_keys=[user_id])
    university = relationship("University", back_populates="notes")
    subject = relationship("Subject", back_populates="notes")
    reviews = relationship("Review", back_populates="note", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="note", cascade="all, delete-orphan")
    history = relationship("NoteHistory", back_populates="note", cascade="all, delete-orphan", order_by="NoteHistory.id")
    images = relationship("NoteImage", back_populates="note", cascade="all, delete-orphan", order_by="NoteImage.position")


class NoteImage(Base):
    """
    NoteImage model - supports multiple images per note.
    Each image has a position for ordering and an optional caption.
    This enables rich note content with images embedded throughout.
    """
    __tablename__ = "note_images"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(500), nullable=True)
    position = Column(Integer, default=0)  # Order index for image placement
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    note = relationship("Note", back_populates="images")


class NoteHistory(Base):
    """NoteHistory model - Git-style version history for notes."""
    __tablename__ = "note_history"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    content = Column(Text, nullable=True)
    title = Column(String(300), nullable=True)
    edited_at = Column(DateTime(timezone=True), server_default=func.now())
    edited_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    note = relationship("Note", back_populates="history", foreign_keys=[note_id])
    editor = relationship("User", foreign_keys=[edited_by])


class Review(Base):
    """Review model - ratings and reviews for notes or universities."""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 scale
    content = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reviews")
    note = relationship("Note", back_populates="reviews")
    university = relationship("University", back_populates="reviews")


class Comment(Base):
    """Comment model - user comments on notes."""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="comments")
    note = relationship("Note", back_populates="comments")


class ImageRequest(Base):
    """Image request model - pending image change requests for universities."""
    __tablename__ = "image_requests"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    new_image_url = Column(String(500), nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    university = relationship("University", backref="image_requests")
