from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    reputation_points = Column(Integer, default=0)
    uploads_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    universities = relationship("University", back_populates="user", cascade="all, delete-orphan")
    faculties = relationship("Faculty", back_populates="user", cascade="all, delete-orphan")

class University(Base):
    __tablename__ = "universities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    description = Column(String(1000), nullable=True)
    image_url = Column(String(500), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="universities")
    faculties = relationship("Faculty", back_populates="university", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="university", cascade="all, delete-orphan")

class Faculty(Base):
    __tablename__ = "faculties"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    description = Column(String(1000), nullable=True)
    image_url = Column(String(500), nullable=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    university = relationship("University", back_populates="faculties")
    user = relationship("User", back_populates="faculties")
    notes = relationship("Note", back_populates="faculty", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(String(1000), nullable=True)
    file_url = Column(String(500), nullable=False)
    score = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notes")
    university = relationship("University", back_populates="notes")
    faculty = relationship("Faculty", back_populates="notes")
    reviews = relationship("Review", back_populates="note", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False)  # 1-5 scale
    comment = Column(String(1000), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="reviews")
    note = relationship("Note", back_populates="reviews")