"""
Colloq domain models — SQLAlchemy 2.0 style.
Hierarchy: University → Faculty → Major → Subject → Note → Attachment.
Uses Mapped[], mapped_column(), FKs with CASCADE, and performance indices.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import NoteVisibility, ProcessingStatus, Region, UserRole
from app.db.database import Base

if TYPE_CHECKING:
    pass


# -----------------------------------------------------------------------------
# User
# -----------------------------------------------------------------------------


class User(Base):
    """User account: email, hashed password, reputation, role, gamification metrics."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    reputation_points: Mapped[int] = mapped_column(default=0, nullable=False)
    uploaded_notes_count: Mapped[int] = mapped_column(default=0, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        default=UserRole.USER,
        nullable=False,
    )
    is_verified_student: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    notes: Mapped[List["Note"]] = relationship(
        "Note",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Note.user_id",
    )

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN


# -----------------------------------------------------------------------------
# University
# -----------------------------------------------------------------------------


class University(Base):
    """University: id, name, slug, region (enum), is_active."""

    __tablename__ = "universities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(300), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    region: Mapped[Region] = mapped_column(
        SQLEnum(Region),
        nullable=False,
        default=Region.OTHER,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    faculties: Mapped[List["Faculty"]] = relationship(
        "Faculty",
        back_populates="university",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# -----------------------------------------------------------------------------
# Faculty
# -----------------------------------------------------------------------------


class Faculty(Base):
    """Faculty belongs to one University. One University has many Faculties."""

    __tablename__ = "faculties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    university_id: Mapped[int] = mapped_column(
        ForeignKey("universities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    university: Mapped["University"] = relationship("University", back_populates="faculties")
    majors: Mapped[List["Major"]] = relationship(
        "Major",
        back_populates="faculty",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# -----------------------------------------------------------------------------
# Major
# -----------------------------------------------------------------------------


class Major(Base):
    """Major belongs to one Faculty. One Faculty has many Majors."""

    __tablename__ = "majors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    faculty_id: Mapped[int] = mapped_column(
        ForeignKey("faculties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    faculty: Mapped["Faculty"] = relationship("Faculty", back_populates="majors")
    subjects: Mapped[List["Subject"]] = relationship(
        "Subject",
        back_populates="major",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# -----------------------------------------------------------------------------
# Subject
# -----------------------------------------------------------------------------


class Subject(Base):
    """Subject belongs to one Major; semester 1–10. One Major has many Subjects."""

    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    major_id: Mapped[int] = mapped_column(
        ForeignKey("majors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    semester: Mapped[int] = mapped_column(nullable=False)  # 1–10
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    major: Mapped["Major"] = relationship("Major", back_populates="subjects")
    notes: Mapped[List["Note"]] = relationship(
        "Note",
        back_populates="subject",
        cascade="save-update, merge",
        passive_deletes=True,
    )


# -----------------------------------------------------------------------------
# Note
# -----------------------------------------------------------------------------


class Note(Base):
    """
    Note: title, description, user_id, optional subject_id (draft/quick-capture), visibility.
    Rule: if visibility=PUBLIC, subject_id MUST be set (enforced in service layer).
    Rule: if subject_id is None, note is Draft/Private.
    """

    __tablename__ = "notes"
    __table_args__ = (
        Index("ix_notes_user_id", "user_id"),
        Index("ix_notes_subject_id", "subject_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    visibility: Mapped[NoteVisibility] = mapped_column(
        SQLEnum(NoteVisibility),
        default=NoteVisibility.PRIVATE,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="notes", foreign_keys=[user_id])
    subject: Mapped["Subject"] = relationship("Subject", back_populates="notes")
    attachments: Mapped[List["Attachment"]] = relationship(
        "Attachment",
        back_populates="note",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# -----------------------------------------------------------------------------
# Attachment
# -----------------------------------------------------------------------------


class Attachment(Base):
    """
    Attachment: S3 pattern — file_key (object key), file_url (presigned/public), processing_status.
    No files on disk; all storage via object storage.
    """

    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_key: Mapped[str] = mapped_column(String(1024), nullable=False)  # S3 object key
    file_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)  # presigned or public URL
    file_type: Mapped[str] = mapped_column(String(64), nullable=False)  # MIME type
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        SQLEnum(ProcessingStatus),
        default=ProcessingStatus.PENDING,
        nullable=False,
    )
    file_size_bytes: Mapped[Optional[int]] = mapped_column(nullable=True)  # optional, for UX
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    note: Mapped["Note"] = relationship("Note", back_populates="attachments")
