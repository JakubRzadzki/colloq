from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import List, Optional
import os
import uuid
from datetime import datetime

from .database import get_db
from .models import User, University, Faculty, Note, Review
from .schemas import (
    UserCreate, UserResponse, UniversityOut, FacultyOut,
    NoteOut, ReviewCreate, ImageRequestOut
)

app = FastAPI(title="Colloq API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Ensure uploads directories exist
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/notes", exist_ok=True)
os.makedirs("uploads/universities", exist_ok=True)
os.makedirs("uploads/faculties", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Colloq API is running"}

# User endpoints
@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(
        or_(User.email == user.email, User.nickname == user.nickname)
    ).first()
    
    if db_user:
        raise HTTPException(status_code=400, detail="Email or nickname already registered")
    
    # Create new user
    new_user = User(
        email=user.email,
        nickname=user.nickname,
        hashed_password=user.password,  # In production, hash this properly
        avatar_url=user.avatar_url
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# University endpoints
@app.post("/universities", response_model=UniversityOut)
async def create_university(
    name: str = Form(...),
    city: str = Form(...),
    country: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Handle image upload
    image_url = None
    if image:
        filename = f"{uuid.uuid4()}_{image.filename}"
        file_path = f"uploads/universities/{filename}"
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        image_url = f"/uploads/universities/{filename}"
    
    # Create university
    university = University(
        name=name,
        city=city,
        country=country,
        description=description,
        image_url=image_url,
        user_id=user_id
    )
    
    db.add(university)
    db.commit()
    db.refresh(university)
    
    return university

@app.get("/universities", response_model=List[UniversityOut])
async def get_universities(db: Session = Depends(get_db)):
    return db.query(University).all()

# Faculty endpoints
@app.post("/faculties", response_model=FacultyOut)
async def create_faculty(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    university_id: int = Form(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    # Check if user and university exist
    user = db.query(User).filter(User.id == user_id).first()
    university = db.query(University).filter(University.id == university_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    # Handle image upload
    image_url = None
    if image:
        filename = f"{uuid.uuid4()}_{image.filename}"
        file_path = f"uploads/faculties/{filename}"
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        image_url = f"/uploads/faculties/{filename}"
    
    # Create faculty
    faculty = Faculty(
        name=name,
        description=description,
        image_url=image_url,
        university_id=university_id,
        user_id=user_id
    )
    
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    
    return faculty

@app.get("/faculties", response_model=List[FacultyOut])
async def get_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).all()

# Note endpoints
@app.post("/notes", response_model=NoteOut)
async def create_note(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user_id: int = Form(...),
    university_id: int = Form(...),
    faculty_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    # Check if user and university exist
    user = db.query(User).filter(User.id == user_id).first()
    university = db.query(University).filter(University.id == university_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    
    # Handle file upload
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = f"uploads/notes/{filename}"
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    file_url = f"/uploads/notes/{filename}"
    
    # Create note
    note = Note(
        title=title,
        description=description,
        file_url=file_url,
        user_id=user_id,
        university_id=university_id,
        faculty_id=faculty_id
    )
    
    # Increment user uploads count and add reputation
    user.uploads_count += 1
    user.reputation_points += 10
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return note

@app.get("/notes", response_model=List[NoteOut])
async def get_notes(db: Session = Depends(get_db)):
    return db.query(Note).all()

# Review endpoints
@app.post("/reviews")
async def create_review(
    review: ReviewCreate,
    db: Session = Depends(get_db)
):
    # Check if user and note exist
    user = db.query(User).filter(User.id == review.user_id).first()
    note = db.query(Note).filter(Note.id == review.note_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check if user already reviewed this note
    existing_review = db.query(Review).filter(
        Review.user_id == review.user_id,
        Review.note_id == review.note_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="User already reviewed this note")
    
    # Create review
    new_review = Review(
        rating=review.rating,
        comment=review.comment,
        user_id=review.user_id,
        note_id=review.note_id
    )
    
    # Update note score
    reviews = db.query(Review).filter(Review.note_id == review.note_id).all()
    total_rating = sum(r.rating for r in reviews) + review.rating
    note.score = total_rating / (len(reviews) + 1)
    
    # Add reputation to note owner
    note.user.reputation_points += 1
    
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    return new_review

# Statistics endpoints
@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    users_count = db.query(User).count()
    notes_count = db.query(Note).count()
    universities_count = db.query(University).count()
    
    return {
        "users": users_count,
        "notes": notes_count,
        "universities": universities_count
    }

@app.get("/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).order_by(desc(User.reputation_points)).limit(5).all()
    
    return [
        {
            "nickname": user.nickname,
            "reputation_points": user.reputation_points,
            "uploads_count": user.uploads_count
        } for user in users
    ]

@app.get("/activity-feed")
async def get_activity_feed(db: Session = Depends(get_db)):
    # Get recent notes and reviews
    recent_notes = db.query(Note).order_by(desc(Note.created_at)).limit(5).all()
    recent_reviews = db.query(Review).order_by(desc(Review.created_at)).limit(5).all()
    
    # Combine and sort by creation date
    activities = []
    
    for note in recent_notes:
        activities.append({
            "type": "note",
            "title": note.title,
            "description": note.description,
            "created_at": note.created_at,
            "user_nickname": note.user.nickname
        })
    
    for review in recent_reviews:
        activities.append({
            "type": "review",
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at,
            "user_nickname": review.user.nickname,
            "note_title": review.note.title
        })
    
    # Sort by created_at
    activities.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Return last 5 activities
    return activities[:5]
