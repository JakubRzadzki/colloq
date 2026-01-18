"""
Database models for Colloq PRO.
Includes User, University, Faculty, Field, Subject, Note, and community features.
"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    university = relationship("University", back_populates="users", foreign_keys=[university_id])
    notes = relationship("Note", back_populates="author")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")


class University(Base):
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    name_pl = Column(String, nullable=True)
    name_en = Column(String, nullable=True)
    city = Column(String, nullable=False)
    region = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    banner_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    users = relationship("User", back_populates="university", foreign_keys="User.university_id")
    notes = relationship("Note", back_populates="university")
    faculties = relationship("Faculty", back_populates="university", cascade="all, delete-orphan")
    image_requests = relationship("UniversityImageRequest", back_populates="university", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="university", cascade="all, delete-orphan")


class UniversityImageRequest(Base):
    __tablename__ = "university_image_requests"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"))
    new_image_url = Column(String)
    status = Column(String, default="pending")
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    university = relationship("University", back_populates="image_requests")


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"))
    is_approved = Column(Boolean, default=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    university = relationship("University", back_populates="faculties")
    fields_of_study = relationship("FieldOfStudy", back_populates="faculty", cascade="all, delete-orphan")


class FieldOfStudy(Base):
    __tablename__ = "fields_of_study"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    degree_level = Column(String)
    faculty_id = Column(Integer, ForeignKey("faculties.id"))
    is_approved = Column(Boolean, default=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    faculty = relationship("Faculty", back_populates="fields_of_study")
    subjects = relationship("Subject", back_populates="field_of_study", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    semester = Column(Integer)
    field_of_study_id = Column(Integer, ForeignKey("fields_of_study.id"))
    is_approved = Column(Boolean, default=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    field_of_study = relationship("FieldOfStudy", back_populates="subjects")
    notes = relationship("Note", back_populates="subject", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    image_url = Column(String)
    video_url = Column(String)
    link_url = Column(String)
    score = Column(Float, default=0.0)
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    author_id = Column(Integer, ForeignKey("users.id"))
    university_id = Column(Integer, ForeignKey("universities.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    author = relationship("User", back_populates="notes")
    university = relationship("University", back_populates="notes")
    subject = relationship("Subject", back_populates="notes")
    votes = relationship("Vote", back_populates="note", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="note", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="note", cascade="all, delete-orphan")


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    note_id = Column(Integer, ForeignKey("notes.id"))
    value = Column(Integer, default=1)

    user = relationship("User", back_populates="votes")
    note = relationship("Note", back_populates="votes")
    __table_args__ = (UniqueConstraint('user_id', 'note_id', name='_user_note_vote_uc'),)


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    note_id = Column(Integer, ForeignKey("notes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorites")
    note = relationship("Note", back_populates="favorites")
    __table_args__ = (UniqueConstraint('user_id', 'note_id', name='_user_note_fav_uc'),)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    university_id = Column(Integer, ForeignKey("universities.id"))
    rating = Column(Integer)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reviews")
    university = relationship("University", back_populates="reviews")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    note_id = Column(Integer, ForeignKey("notes.id"))
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="comments")
    note = relationship("Note", back_populates="comments")