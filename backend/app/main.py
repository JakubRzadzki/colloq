from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database

# Create tables on startup (MVP only)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Colloq API")

# CORS Configuration - allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(db: Session = Depends(database.get_db)):
    """Fetch all notes sorted by creation date (newest first)."""
    return db.query(models.Note).order_by(models.Note.created_at.desc()).all()

@app.post("/notes", response_model=schemas.NoteOut)
def create_note(note: schemas.NoteCreate, db: Session = Depends(database.get_db)):
    """Create a new note."""
    db_note = models.Note(title=note.title, content=note.content)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note