"""
Colloq Database Models
SQLAlchemy ORM models for the student note-sharing platform.
All relationships are explicitly defined with cascade rules for data integrity.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func

from app.core.database import Base


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
    is_banned = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    notes = relationship("Note", back_populates="author", cascade="all, delete-orphan", foreign_keys="Note.user_id")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("UserFavorite", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan", order_by="Notification.created_at")
    reports_submitted = relationship("Report", back_populates="reporter", foreign_keys="Report.reporter_id", cascade="all, delete-orphan")
    feedback_entries = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")


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
    academic_year = Column(String(50), nullable=True)
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
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)

    # Relationships
    author = relationship("User", back_populates="notes", foreign_keys=[user_id])
    university = relationship("University", back_populates="notes")
    subject = relationship("Subject", back_populates="notes")
    reviews = relationship("Review", back_populates="note", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="note", cascade="all, delete-orphan")
    history = relationship("NoteHistory", back_populates="note", cascade="all, delete-orphan", order_by="NoteHistory.id")
    images = relationship("NoteImage", back_populates="note", cascade="all, delete-orphan", order_by="NoteImage.position")
    files = relationship("NoteFile", back_populates="note", cascade="all, delete-orphan", order_by="NoteFile.id")
    favorited_by = relationship("UserFavorite", back_populates="note", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="note", cascade="all, delete-orphan")
    note_tags = relationship("NoteTag", back_populates="note", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="note_tags", backref=backref("notes", overlaps="note_tags"), overlaps="note_tags")
    votes = relationship("Vote", back_populates="note", cascade="all, delete-orphan")


class NoteFile(Base):
    """
    NoteFile model - supports multiple file attachments per note.
    Each file has: file_url, file_type, file_name.
    Files are stored in uploads/notes/{note_id}/{uuid}_{filename}
    """
    __tablename__ = "note_files"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    file_url = Column(String(500), nullable=False)  # Path with forward slashes: notes/{note_id}/{uuid}_{filename}
    file_type = Column(String(50), nullable=False)  # e.g. pdf, doc, docx, jpg, png
    file_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    note = relationship("Note", back_populates="files")


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


class UserFavorite(Base):
    """User's favorite notes (many-to-many)."""
    __tablename__ = "user_favorites"
    __table_args__ = (UniqueConstraint("user_id", "note_id", name="uq_user_favorite"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorites")
    note = relationship("Note", back_populates="favorited_by")


class Notification(Base):
    """In-app notifications (e.g. comment on your note, note approved)."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # comment, note_approved, etc.
    message = Column(Text, nullable=False)
    related_id = Column(Integer, nullable=True)  # note_id or comment_id
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class Report(Base):
    """Reports: note or user (spam, abuse)."""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=True, index=True)
    reported_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    reason = Column(String(100), nullable=False)
    status = Column(String(20), default="pending")  # pending, resolved, dismissed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", back_populates="reports_submitted", foreign_keys=[reporter_id])
    note = relationship("Note", back_populates="reports")
    reported_user = relationship("User", foreign_keys=[reported_user_id])


class Tag(Base):
    """Tags for notes (e.g. egzamin, wykłady)."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    note_tags = relationship("NoteTag", back_populates="tag", cascade="all, delete-orphan", overlaps="notes,tags")


class NoteTag(Base):
    """Many-to-many: notes <-> tags."""
    __tablename__ = "note_tags"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    note = relationship("Note", back_populates="note_tags", overlaps="notes,tags")
    tag = relationship("Tag", back_populates="note_tags", overlaps="notes,tags")


class Feedback(Base):
    """User feedback (1-5 rating + optional comment)."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="feedback_entries")


class Vote(Base):
    """Vote model - tracks user votes on notes (prevents duplicates)."""
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "note_id", name="uq_user_vote"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Integer, default=1)  # +1 upvote, -1 downvote
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="votes")
    note = relationship("Note", back_populates="votes")


class PasswordResetToken(Base):
    """Token for password reset flow."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
