from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class University(Base):
    __tablename__ = "universities"
    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String) # Angielska nazwa
    name_pl = Column(String) # Polska nazwa
    region = Column(String)  # Województwo
    users = relationship("User", back_populates="university")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    nickname = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)

    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    university_id = Column(Integer, ForeignKey("universities.id"))
    university = relationship("University", back_populates="users")
    notes = relationship("Note", back_populates="author")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    image_url = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    score = Column(Float, default=0.0)

    author_id = Column(Integer, ForeignKey("users.id"))
    university_id = Column(Integer, ForeignKey("universities.id"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    author = relationship("User", back_populates="notes")