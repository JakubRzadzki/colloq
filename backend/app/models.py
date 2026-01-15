from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class University(Base):
	__tablename__ = "universities"
	id = Column(Integer, primary_key=True, index=True)
	name = Column(String, unique=True, index=True, nullable=False)
	name_en = Column(String, nullable=True)
	name_pl = Column(String, nullable=True)
	city = Column(String, nullable=True)
	region = Column(String, nullable=True)
	type = Column(String, nullable=True)
	image_url = Column(String, nullable=True)

	users = relationship("User", back_populates="university")
	notes = relationship("Note", back_populates="university")
	fields_of_study = relationship("FieldOfStudy", back_populates="university")


class FieldOfStudy(Base):
	__tablename__ = "fields_of_study"
	id = Column(Integer, primary_key=True, index=True)
	name = Column(String, nullable=False)
	degree_level = Column(String, nullable=True)
	university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

	university = relationship("University", back_populates="fields_of_study")
	subjects = relationship("Subject", back_populates="field_of_study")


class Subject(Base):
	__tablename__ = "subjects"
	id = Column(Integer, primary_key=True, index=True)
	name = Column(String, nullable=False)
	semester = Column(Integer, nullable=True)
	field_of_study_id = Column(Integer, ForeignKey("fields_of_study.id"), nullable=False)

	field_of_study = relationship("FieldOfStudy", back_populates="subjects")
	notes = relationship("Note", back_populates="subject")


class User(Base):
	__tablename__ = "users"
	id = Column(Integer, primary_key=True, index=True)
	email = Column(String, unique=True, index=True, nullable=False)
	hashed_password = Column(String, nullable=False)
	nickname = Column(String, nullable=True)
	is_verified = Column(Boolean, default=False)
	is_admin = Column(Boolean, default=False)
	is_active = Column(Boolean, default=True)
	university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)

	university = relationship("University", back_populates="users")
	notes = relationship("Note", back_populates="author")


class Note(Base):
	__tablename__ = "notes"
	id = Column(Integer, primary_key=True, index=True)
	title = Column(String, nullable=False)
	content = Column(Text, nullable=False)

	# Nowe pola
	image_url = Column(String, nullable=True)
	video_url = Column(String, nullable=True)
	link_url = Column(String, nullable=True)

	score = Column(Float, default=0.0)
	is_approved = Column(Boolean, default=False)
	created_at = Column(DateTime(timezone=True), server_default=func.now())

	author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	university_id = Column(Integer, ForeignKey("universities.id"), nullable=False)
	subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

	author = relationship("User", back_populates="notes")
	university = relationship("University", back_populates="notes")
	subject = relationship("Subject", back_populates="notes")