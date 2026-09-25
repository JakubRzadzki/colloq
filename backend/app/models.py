"""
Colloq Database Models
SQLAlchemy ORM models for the student note-sharing platform.
All relationships are explicitly defined with cascade rules for data integrity.

Nullability mirrors the existing schema: columns that only have a Python-side
default (e.g. reputation_points) are nullable in the database, so they are
typed as Optional here as well.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

IntPK = Annotated[int, mapped_column(Integer, primary_key=True, index=True)]
CreatedAt = Annotated[datetime | None, mapped_column(DateTime(timezone=True), server_default=func.now())]


class User(Base):
    """User model - stores student/user accounts with gamification fields."""
    __tablename__ = "users"

    id: Mapped[IntPK]
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nickname: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(String(500))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    reputation_points: Mapped[int | None] = mapped_column(Integer, default=0)
    uploads_count: Mapped[int | None] = mapped_column(Integer, default=0)
    is_active: Mapped[bool | None] = mapped_column(Boolean, default=True)
    is_banned: Mapped[bool | None] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool | None] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool | None] = mapped_column(Boolean, default=False)
    university_id: Mapped[int | None] = mapped_column(ForeignKey("universities.id"))
    created_at: Mapped[CreatedAt]

    # Relationships
    notes: Mapped[list[Note]] = relationship(
        back_populates="author", cascade="all, delete-orphan", foreign_keys="Note.user_id"
    )
    reviews: Mapped[list[Review]] = relationship(back_populates="user", cascade="all, delete-orphan")
    comments: Mapped[list[Comment]] = relationship(back_populates="user", cascade="all, delete-orphan")
    favorites: Mapped[list[UserFavorite]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list[Notification]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="Notification.created_at"
    )
    reports_submitted: Mapped[list[Report]] = relationship(
        back_populates="reporter", foreign_keys="Report.reporter_id", cascade="all, delete-orphan"
    )
    feedback_entries: Mapped[list[Feedback]] = relationship(back_populates="user", cascade="all, delete-orphan")
    votes: Mapped[list[Vote]] = relationship(back_populates="user", cascade="all, delete-orphan")


class University(Base):
    """University model - academic institutions with multilingual name support."""
    __tablename__ = "universities"

    id: Mapped[IntPK]
    name: Mapped[str] = mapped_column(String(300), index=True)
    name_en: Mapped[str | None] = mapped_column(String(300))
    name_pl: Mapped[str | None] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(100))
    region: Mapped[str] = mapped_column(String(100), default="")
    country: Mapped[str] = mapped_column(String(100), default="Poland")
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    banner_url: Mapped[str | None] = mapped_column(String(500))
    is_approved: Mapped[bool | None] = mapped_column(Boolean, default=False)
    created_at: Mapped[CreatedAt]

    # Relationships
    faculties: Mapped[list[Faculty]] = relationship(back_populates="university", cascade="all, delete-orphan")
    notes: Mapped[list[Note]] = relationship(back_populates="university", cascade="all, delete-orphan")
    reviews: Mapped[list[Review]] = relationship(back_populates="university", cascade="all, delete-orphan")


class Faculty(Base):
    """Faculty model - departments within universities."""
    __tablename__ = "faculties"

    id: Mapped[IntPK]
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    university_id: Mapped[int] = mapped_column(ForeignKey("universities.id"))
    is_approved: Mapped[bool | None] = mapped_column(Boolean, default=False)
    created_at: Mapped[CreatedAt]

    # Relationships
    university: Mapped[University] = relationship(back_populates="faculties")
    fields_of_study: Mapped[list[FieldOfStudy]] = relationship(back_populates="faculty", cascade="all, delete-orphan")


class FieldOfStudy(Base):
    """Field of study model - programs within faculties."""
    __tablename__ = "fields_of_study"

    id: Mapped[IntPK]
    name: Mapped[str] = mapped_column(String(200), index=True)
    degree_level: Mapped[str | None] = mapped_column(String(50))
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id"))
    is_approved: Mapped[bool | None] = mapped_column(Boolean, default=False)

    # Relationships
    faculty: Mapped[Faculty] = relationship(back_populates="fields_of_study")
    subjects: Mapped[list[Subject]] = relationship(back_populates="field_of_study", cascade="all, delete-orphan")


class Subject(Base):
    """Subject model - individual courses within fields of study."""
    __tablename__ = "subjects"

    id: Mapped[IntPK]
    name: Mapped[str] = mapped_column(String(200), index=True)
    semester: Mapped[int | None] = mapped_column(Integer)
    academic_year: Mapped[str | None] = mapped_column(String(50))
    field_of_study_id: Mapped[int] = mapped_column(ForeignKey("fields_of_study.id"))
    is_approved: Mapped[bool | None] = mapped_column(Boolean, default=False)

    # Relationships
    field_of_study: Mapped[FieldOfStudy] = relationship(back_populates="subjects")
    notes: Mapped[list[Note]] = relationship(back_populates="subject", cascade="all, delete-orphan")


class Note(Base):
    """
    Note model - uploaded study materials.
    Supports rich content with multiple images via the NoteImage relationship.
    The legacy image_url column is retained for backward compatibility.
    """
    __tablename__ = "notes"

    id: Mapped[IntPK]
    title: Mapped[str | None] = mapped_column(String(300), index=True)
    content: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(500))  # Legacy single-image field
    video_url: Mapped[str | None] = mapped_column(String(500))
    link_url: Mapped[str | None] = mapped_column(String(500))
    score: Mapped[float | None] = mapped_column(Float, default=0.0)  # Net vote sum (upvotes)
    avg_rating: Mapped[float | None] = mapped_column(Float, default=0.0)  # Average of review ratings (1-5)
    rating_count: Mapped[int | None] = mapped_column(Integer, default=0)  # Number of reviews
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    university_id: Mapped[int] = mapped_column(ForeignKey("universities.id"))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    is_approved: Mapped[bool | None] = mapped_column(Boolean, default=True)
    created_at: Mapped[CreatedAt]
    view_count: Mapped[int | None] = mapped_column(Integer, default=0)
    download_count: Mapped[int | None] = mapped_column(Integer, default=0)

    # Relationships
    author: Mapped[User] = relationship(back_populates="notes", foreign_keys=[user_id])
    university: Mapped[University] = relationship(back_populates="notes")
    subject: Mapped[Subject | None] = relationship(back_populates="notes")
    reviews: Mapped[list[Review]] = relationship(back_populates="note", cascade="all, delete-orphan")
    comments: Mapped[list[Comment]] = relationship(back_populates="note", cascade="all, delete-orphan")
    history: Mapped[list[NoteHistory]] = relationship(
        back_populates="note", cascade="all, delete-orphan", order_by="NoteHistory.id"
    )
    images: Mapped[list[NoteImage]] = relationship(
        back_populates="note", cascade="all, delete-orphan", order_by="NoteImage.position"
    )
    files: Mapped[list[NoteFile]] = relationship(
        back_populates="note", cascade="all, delete-orphan", order_by="NoteFile.id"
    )
    favorited_by: Mapped[list[UserFavorite]] = relationship(back_populates="note", cascade="all, delete-orphan")
    reports: Mapped[list[Report]] = relationship(back_populates="note", cascade="all, delete-orphan")
    note_tags: Mapped[list[NoteTag]] = relationship(back_populates="note", cascade="all, delete-orphan")
    tags: Mapped[list[Tag]] = relationship(
        secondary="note_tags", backref=backref("notes", overlaps="note_tags"), overlaps="note_tags"
    )
    votes: Mapped[list[Vote]] = relationship(back_populates="note", cascade="all, delete-orphan")


class NoteFile(Base):
    """
    NoteFile model - supports multiple file attachments per note.
    Each file has: file_url, file_type, file_name.
    Files are stored in PRIVATE_UPLOAD_DIR/notes/{note_id}/{uuid}_{filename}
    """
    __tablename__ = "note_files"

    id: Mapped[IntPK]
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"))
    # Path relative to PRIVATE_UPLOAD_DIR: notes/{note_id}/{uuid}_{filename}
    file_url: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))  # e.g. pdf, doc, docx, jpg, png
    file_name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[CreatedAt]

    # Relationships
    note: Mapped[Note] = relationship(back_populates="files")


class NoteImage(Base):
    """
    NoteImage model - supports multiple images per note.
    Each image has a position for ordering and an optional caption.
    This enables rich note content with images embedded throughout.
    """
    __tablename__ = "note_images"

    id: Mapped[IntPK]
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(String(500))
    position: Mapped[int | None] = mapped_column(Integer, default=0)  # Order index for image placement
    created_at: Mapped[CreatedAt]

    # Relationships
    note: Mapped[Note] = relationship(back_populates="images")


class NoteHistory(Base):
    """NoteHistory model - Git-style version history for notes."""
    __tablename__ = "note_history"

    id: Mapped[IntPK]
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id"))
    content: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(String(300))
    edited_at: Mapped[CreatedAt]
    edited_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

    # Relationships
    note: Mapped[Note] = relationship(back_populates="history", foreign_keys=[note_id])
    editor: Mapped[User] = relationship(foreign_keys=[edited_by])


class Review(Base):
    """Review model - ratings and reviews for notes or universities."""
    __tablename__ = "reviews"
    # One review per user and target; NULLs never collide, so each constraint only covers its own target.
    __table_args__ = (
        UniqueConstraint("user_id", "note_id", name="uq_review_user_note"),
        UniqueConstraint("user_id", "university_id", name="uq_review_user_university"),
    )

    id: Mapped[IntPK]
    rating: Mapped[int] = mapped_column(Integer)  # 1-5 scale
    content: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id"))
    university_id: Mapped[int | None] = mapped_column(ForeignKey("universities.id"))
    created_at: Mapped[CreatedAt]

    # Relationships
    user: Mapped[User] = relationship(back_populates="reviews")
    note: Mapped[Note | None] = relationship(back_populates="reviews")
    university: Mapped[University | None] = relationship(back_populates="reviews")


class Comment(Base):
    """Comment model - user comments on notes."""
    __tablename__ = "comments"

    id: Mapped[IntPK]
    content: Mapped[str] = mapped_column(Text)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id"))
    created_at: Mapped[CreatedAt]

    # Relationships
    user: Mapped[User] = relationship(back_populates="comments")
    note: Mapped[Note] = relationship(back_populates="comments")


class ImageRequest(Base):
    """Image request model - pending image change requests for universities."""
    __tablename__ = "image_requests"

    id: Mapped[IntPK]
    university_id: Mapped[int] = mapped_column(ForeignKey("universities.id"))
    new_image_url: Mapped[str] = mapped_column(String(500))
    status: Mapped[str | None] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[CreatedAt]

    # Relationships
    university: Mapped[University] = relationship(backref="image_requests")

    @property
    def university_name(self) -> str | None:
        return self.university.name if self.university else None


class UserFavorite(Base):
    """User's favorite notes (many-to-many)."""
    __tablename__ = "user_favorites"
    __table_args__ = (UniqueConstraint("user_id", "note_id", name="uq_user_favorite"),)

    id: Mapped[IntPK]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[CreatedAt]

    user: Mapped[User] = relationship(back_populates="favorites")
    note: Mapped[Note] = relationship(back_populates="favorited_by")


class Notification(Base):
    """In-app notifications (e.g. comment on your note, note approved)."""
    __tablename__ = "notifications"

    id: Mapped[IntPK]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(50))  # comment, note_approved, etc.
    message: Mapped[str] = mapped_column(Text)
    related_id: Mapped[int | None] = mapped_column(Integer)  # note_id or comment_id
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]

    user: Mapped[User] = relationship(back_populates="notifications")


class Report(Base):
    """Reports: note or user (spam, abuse)."""
    __tablename__ = "reports"

    id: Mapped[IntPK]
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[int | None] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    reported_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str] = mapped_column(String(100))
    status: Mapped[str | None] = mapped_column(String(20), default="pending")  # pending, resolved, dismissed
    created_at: Mapped[CreatedAt]

    reporter: Mapped[User] = relationship(back_populates="reports_submitted", foreign_keys=[reporter_id])
    note: Mapped[Note | None] = relationship(back_populates="reports")
    reported_user: Mapped[User | None] = relationship(foreign_keys=[reported_user_id])


class Tag(Base):
    """Tags for notes (e.g. egzamin, wykłady)."""
    __tablename__ = "tags"

    id: Mapped[IntPK]
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    created_at: Mapped[CreatedAt]

    note_tags: Mapped[list[NoteTag]] = relationship(
        back_populates="tag", cascade="all, delete-orphan", overlaps="notes,tags"
    )


class NoteTag(Base):
    """Many-to-many: notes <-> tags."""
    __tablename__ = "note_tags"
    __table_args__ = (UniqueConstraint("note_id", "tag_id", name="uq_note_tag"),)

    id: Mapped[IntPK]
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[CreatedAt]

    note: Mapped[Note] = relationship(back_populates="note_tags", overlaps="notes,tags")
    tag: Mapped[Tag] = relationship(back_populates="note_tags", overlaps="notes,tags")


class Feedback(Base):
    """User feedback (1-5 rating + optional comment)."""
    __tablename__ = "feedback"

    id: Mapped[IntPK]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[CreatedAt]

    user: Mapped[User] = relationship(back_populates="feedback_entries")


class Vote(Base):
    """Vote model - tracks user votes on notes (prevents duplicates)."""
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "note_id", name="uq_user_vote"),)

    id: Mapped[IntPK]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), index=True)
    value: Mapped[int | None] = mapped_column(Integer, default=1)  # +1 upvote, -1 downvote
    created_at: Mapped[CreatedAt]

    user: Mapped[User] = relationship(back_populates="votes")
    note: Mapped[Note] = relationship(back_populates="votes")


class PasswordResetToken(Base):
    """Token for password reset flow."""
    __tablename__ = "password_reset_tokens"

    id: Mapped[IntPK]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool | None] = mapped_column(Boolean, default=False)
    created_at: Mapped[CreatedAt]
