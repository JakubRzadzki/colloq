"""
Database models for Colloq PRO.

This module defines all SQLAlchemy ORM models representing:
- Universities (with approval workflow)
- Faculties (NEW: between University and FieldOfStudy)
- Fields of Study (now belongs to Faculty)
- Subjects (with approval workflow)
- Users (students and admins)
- Notes (educational materials)
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class University(Base):
    """
    University model with community-driven creation.
    Users can submit new universities which require admin approval.
    """
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    name_en = Column(String, nullable=True)
    name_pl = Column(String, nullable=True)
    city = Column(String, nullable=False)
    region = Column(String, nullable=False)
    type = Column(String, nullable=True, default="Publiczna")
    image_url = Column(String, nullable=True)

    # Approval workflow
    is_approved = Column(Boolean, default=False, nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="university", foreign_keys="User.university_id")
    submitter = relationship("User", foreign_keys=[submitted_by_id])
    notes = relationship("Note", back_populates="university")
    faculties = relationship("Faculty", back_populates="university")  # UPDATED: Now has faculties


class Faculty(Base):
    """
    NEW MODEL: Faculty (e.g., Faculty of Electronics)
    """
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

    # Approval workflow
    is_approved = Column(Boolean, default=False, nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    university = relationship("University", back_populates="faculties")
    submitter = relationship("User", foreign_keys=[submitted_by_id])
    fields_of_study = relationship("FieldOfStudy", back_populates="faculty")


class FieldOfStudy(Base):
    """
    Field of Study (e.g., Computer Science, Medicine).
    Now belongs to Faculty instead of University.
    """
    __tablename__ = "fields_of_study"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    degree_level = Column(String, nullable=True)

    # UPDATED: Now belongs to Faculty instead of University
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)

    # Legacy field for backward compatibility (can be nullable)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=True)

    # Approval workflow
    is_approved = Column(Boolean, default=False, nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    faculty = relationship("Faculty", back_populates="fields_of_study")
    university = relationship("University")  # For backward compatibility
    submitter = relationship("User", foreign_keys=[submitted_by_id])
    subjects = relationship("Subject", back_populates="field_of_study")


class Subject(Base):
    """
    Subject/Course (e.g., Introduction to Programming).
    Users can submit new subjects which require admin approval.
    """
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    semester = Column(Integer, nullable=True)
    field_of_study_id = Column(Integer, ForeignKey("fields_of_study.id"), nullable=False)

    # Approval workflow
    is_approved = Column(Boolean, default=False, nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    field_of_study = relationship("FieldOfStudy", back_populates="subjects")
    submitter = relationship("User", foreign_keys=[submitted_by_id])
    notes = relationship("Note", back_populates="subject")


class User(Base):
    """User account (student or administrator)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    university = relationship("University", back_populates="users", foreign_keys=[university_id])
    notes = relationship("Note", back_populates="author")


class Note(Base):
    """
    Educational note/material submitted by students.
    Now supports minimal submission (just an image without text).
    """
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)

    # Media attachments
    image_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    link_url = Column(String, nullable=True)

    # Metadata
    score = Column(Float, default=0.0)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign keys
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    # Relationships
    author = relationship("User", back_populates="notes")
    university = relationship("University", back_populates="notes")
    subject = relationship("Subject", back_populates="notes")