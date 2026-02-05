# backend/app/main.py
# Complete version with all bug fixes applied

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import update  # ✅ FIX #5 & #8: For atomic updates
from pathlib import Path  # ✅ FIX #4: Cross-platform path handling
from typing import Optional, List
import os
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from .database import get_db, engine
from . import models, schemas

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Colloq API")

# CORS
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# ✅ FIX #4: Create upload directories using pathlib
UPLOAD_DIR = Path("uploads")
(UPLOAD_DIR / "avatars").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "notes").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "universities").mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Helper functions
def verify_password(plain_password, hashed_password):
	return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
	return pwd_context.hash(password)


def create_access_token(data: dict):
	to_encode = data.copy()
	expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
	credentials_exception = HTTPException(
		status_code=401,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		email: str = payload.get("sub")
		if email is None:
			raise credentials_exception
	except jwt.PyJWTError:
		raise credentials_exception

	user = db.query(models.User).filter(models.User.email == email).first()
	if user is None:
		raise credentials_exception
	return user


def require_admin(current_user: models.User = Depends(get_current_user)):
	if not current_user.is_admin:
		raise HTTPException(status_code=403, detail="Admin access required")
	return current_user


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
	# Check if user exists
	db_user = db.query(models.User).filter(models.User.email == user.email).first()
	if db_user:
		raise HTTPException(status_code=400, detail="Email already registered")

	# Create new user
	hashed_password = get_password_hash(user.password)
	new_user = models.User(
		email=user.email,
		nickname=user.nickname,
		hashed_password=hashed_password,
		university_id=user.university_id,
		is_admin=False
	)
	db.add(new_user)
	db.commit()
	db.refresh(new_user)
	return new_user


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
	user = db.query(models.User).filter(models.User.email == form_data.username).first()
	if not user or not verify_password(form_data.password, user.hashed_password):
		raise HTTPException(status_code=401, detail="Incorrect email or password")

	access_token = create_access_token(data={"sub": user.email})
	return {"access_token": access_token, "token_type": "bearer"}


# ============================================
# USER ENDPOINTS
# ============================================

@app.get("/users/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
	return current_user


@app.patch("/users/me", response_model=schemas.UserResponse)
async def update_profile(
		nickname: Optional[str] = Form(None),
		file: Optional[UploadFile] = File(None),
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	if nickname:
		current_user.nickname = nickname

	if file:
		# ✅ FIX #4: Use pathlib for cross-platform compatibility
		avatar_dir = UPLOAD_DIR / "avatars"
		file_path = avatar_dir / f"{current_user.id}_{file.filename}"

		# Save file
		with open(file_path, "wb") as f:
			f.write(await file.read())

		# ✅ FIX #4: Use as_posix() for forward slashes in URLs
		current_user.avatar_url = f"/{file_path.as_posix()}"

	db.commit()
	db.refresh(current_user)
	return current_user


# ============================================
# UNIVERSITY ENDPOINTS
# ============================================

@app.get("/universities", response_model=List[schemas.UniversityResponse])
def get_universities(db: Session = Depends(get_db)):
	universities = db.query(models.University).all()
	return universities


@app.get("/universities/{university_id}", response_model=schemas.UniversityResponse)
def get_university(university_id: int, db: Session = Depends(get_db)):
	# ✅ FIX #5: Use db.get() instead of deprecated db.query().get()
	university = db.get(models.University, university_id)
	if not university:
		raise HTTPException(status_code=404, detail="University not found")
	return university


@app.get("/universities/region/{region}", response_model=List[schemas.UniversityResponse])
def get_universities_by_region(region: str, db: Session = Depends(get_db)):
	universities = db.query(models.University).filter(models.University.region == region).all()
	return universities


@app.get("/universities/search", response_model=List[schemas.UniversityResponse])
def search_universities(q: str, db: Session = Depends(get_db)):
	universities = db.query(models.University).filter(
		models.University.name.ilike(f"%{q}%")
	).all()
	return universities


@app.post("/universities/{university_id}/image")
async def upload_university_image(
		university_id: int,
		file: UploadFile = File(...),
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	university = db.query(models.University).filter(
		models.University.id == university_id
	).first()
	if not university:
		raise HTTPException(status_code=404, detail="University not found")

	# ✅ FIX #4: Use pathlib for cross-platform compatibility
	uni_dir = UPLOAD_DIR / "universities"
	file_path = uni_dir / f"{university_id}_{file.filename}"

	# Save file
	with open(file_path, "wb") as f:
		f.write(await file.read())

	# Create image request (model uses new_image_url, submitted_by_id)
	image_request = models.UniversityImageRequest(
		university_id=university_id,
		new_image_url=f"/{file_path.as_posix()}",
		submitted_by_id=current_user.id,
		status="pending"
	)

	db.add(image_request)
	db.commit()
	db.refresh(image_request)
	return image_request


# ============================================
# NOTES ENDPOINTS
# ============================================

@app.get("/universities/{university_id}/notes", response_model=List[schemas.NoteResponse])
def get_notes_by_university(university_id: int, db: Session = Depends(get_db)):
	notes = db.query(models.Note).filter(
		models.Note.university_id == university_id,
		models.Note.is_approved == True
	).all()
	return notes


@app.get("/notes/search", response_model=List[schemas.NoteResponse])
def search_notes(q: str, db: Session = Depends(get_db)):
	notes = db.query(models.Note).filter(
		models.Note.title.ilike(f"%{q}%"),
		models.Note.is_approved == True
	).all()
	return notes


@app.post("/notes", response_model=schemas.NoteResponse)
async def upload_note(
		title: str = Form(...),
		description: Optional[str] = Form(None),
		course_name: str = Form(...),
		university_id: int = Form(...),
		file: UploadFile = File(...),
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	# ✅ FIX #4: Use pathlib for cross-platform compatibility
	notes_dir = UPLOAD_DIR / "notes"
	file_path = notes_dir / f"{current_user.id}_{file.filename}"

	# Save file
	with open(file_path, "wb") as f:
		f.write(await file.read())

	# Create note (model uses author_id, file_url, course_name, description)
	new_note = models.Note(
		title=title,
		description=description,
		content=description,
		course_name=course_name,
		university_id=university_id,
		file_url=f"/{file_path.as_posix()}",
		author_id=current_user.id,
		is_approved=False
	)

	db.add(new_note)
	db.commit()
	db.refresh(new_note)
	return new_note


@app.post("/notes/{note_id}/vote")
def vote_note(
		note_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	# ✅ FIX #5: Use db.get() instead of deprecated db.query().get()
	note = db.get(models.Note, note_id)
	if not note:
		raise HTTPException(status_code=404, detail="Note not found")

	# Check if already voted
	existing_vote = db.query(models.Vote).filter(
		models.Vote.user_id == current_user.id,
		models.Vote.note_id == note_id
	).first()

	if existing_vote:
		raise HTTPException(status_code=400, detail="Already voted")

	# ✅ FIX #8: Atomic update to prevent race conditions
	db.execute(
		update(models.Note)
		.where(models.Note.id == note_id)
		.values(score=models.Note.score + 1)
	)

	# Add vote record
	new_vote = models.Vote(user_id=current_user.id, note_id=note_id)
	db.add(new_vote)
	db.commit()

	# Refresh to get updated score
	db.refresh(note)

	return {"message": "Vote recorded", "new_score": note.score}


# backend/app/main.py - PART 2
# Continuation of main.py with remaining endpoints

# ============================================
# COMMENTS ENDPOINTS
# ============================================

@app.get("/notes/{note_id}/comments", response_model=List[schemas.CommentResponse])
def get_note_comments(note_id: int, db: Session = Depends(get_db)):
	comments = db.query(models.Comment).filter(
		models.Comment.note_id == note_id
	).all()
	return comments


@app.post("/notes/{note_id}/comments", response_model=schemas.CommentResponse)
def add_note_comment(
		note_id: int,
		comment: schemas.CommentCreate,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	# ✅ FIX #5: Use db.get()
	note = db.get(models.Note, note_id)
	if not note:
		raise HTTPException(status_code=404, detail="Note not found")

	new_comment = models.Comment(
		note_id=note_id,
		user_id=current_user.id,
		content=comment.content
	)

	db.add(new_comment)
	db.commit()
	db.refresh(new_comment)
	return new_comment


# ============================================
# REVIEWS ENDPOINTS
# ============================================

@app.get("/universities/{university_id}/reviews", response_model=List[schemas.ReviewResponse])
def get_university_reviews(university_id: int, db: Session = Depends(get_db)):
	reviews = db.query(models.Review).filter(
		models.Review.university_id == university_id,
		models.Review.is_approved == True
	).all()
	return reviews


@app.post("/universities/{university_id}/reviews", response_model=schemas.ReviewResponse)
def add_university_review(
		university_id: int,
		review: schemas.ReviewCreate,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(get_current_user)
):
	# ✅ FIX #5: Use db.get()
	university = db.get(models.University, university_id)
	if not university:
		raise HTTPException(status_code=404, detail="University not found")

	# Check if user already reviewed
	existing_review = db.query(models.Review).filter(
		models.Review.university_id == university_id,
		models.Review.user_id == current_user.id
	).first()

	if existing_review:
		raise HTTPException(status_code=400, detail="You have already reviewed this university")

	new_review = models.Review(
		university_id=university_id,
		user_id=current_user.id,
		rating=review.rating,
		content=review.content,
		is_approved=False
	)

	db.add(new_review)
	db.commit()
	db.refresh(new_review)
	return new_review


# ============================================
# ADMIN ENDPOINTS
# ============================================

@app.get("/admin/pending", response_model=schemas.PendingContentResponse)
def get_pending_content(
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	pending_notes = db.query(models.Note).filter(
		models.Note.is_approved == False
	).all()

	pending_reviews = db.query(models.Review).filter(
		models.Review.is_approved == False
	).all()

	pending_images = db.query(models.UniversityImageRequest).filter(
		models.UniversityImageRequest.status == "pending"
	).all()

	return {
		"notes": pending_notes,
		"reviews": pending_reviews,
		"image_requests": pending_images  # ✅ Correct key for frontend
	}


@app.post("/admin/notes/{note_id}/approve", response_model=schemas.NoteResponse)
def approve_note(
		note_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get() instead of deprecated db.query().get()
	note = db.get(models.Note, note_id)
	if not note:
		raise HTTPException(status_code=404, detail="Note not found")

	note.is_approved = True
	db.commit()
	db.refresh(note)
	return note


@app.post("/admin/notes/{note_id}/reject")
def reject_note(
		note_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get()
	note = db.get(models.Note, note_id)
	if not note:
		raise HTTPException(status_code=404, detail="Note not found")

	# Delete the file if it exists
	if note.file_url:
		file_path = Path(note.file_url.lstrip('/'))
		if file_path.exists():
			file_path.unlink()

	db.delete(note)
	db.commit()
	return {"message": "Note rejected and deleted"}


@app.post("/admin/reviews/{review_id}/approve", response_model=schemas.ReviewResponse)
def approve_review(
		review_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get()
	review = db.get(models.Review, review_id)
	if not review:
		raise HTTPException(status_code=404, detail="Review not found")

	review.is_approved = True
	db.commit()
	db.refresh(review)
	return review


@app.post("/admin/reviews/{review_id}/reject")
def reject_review(
		review_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get()
	review = db.get(models.Review, review_id)
	if not review:
		raise HTTPException(status_code=404, detail="Review not found")

	db.delete(review)
	db.commit()
	return {"message": "Review rejected and deleted"}


@app.post("/admin/images/{request_id}/approve")
def approve_image_request(
		request_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get()
	image_request = db.get(models.UniversityImageRequest, request_id)
	if not image_request:
		raise HTTPException(status_code=404, detail="Image request not found")

	image_request.status = "approved"

	# Update university's image URL (model uses new_image_url)
	university = db.get(models.University, image_request.university_id)
	if university:
		university.image_url = image_request.new_image_url

	db.commit()
	return {"message": "Image approved and set as university image"}


@app.post("/admin/images/{request_id}/reject")
def reject_image_request(
		request_id: int,
		db: Session = Depends(get_db),
		current_user: models.User = Depends(require_admin)
):
	# ✅ FIX #5: Use db.get()
	image_request = db.get(models.UniversityImageRequest, request_id)
	if not image_request:
		raise HTTPException(status_code=404, detail="Image request not found")

	# Delete the file if it exists
	if image_request.new_image_url:
		file_path = Path(image_request.new_image_url.lstrip('/'))
		if file_path.exists():
			file_path.unlink()

	db.delete(image_request)
	db.commit()
	return {"message": "Image request rejected and deleted"}


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/")
def root():
	return {
		"message": "Colloq API",
		"version": "2.0",
		"status": "running",
		"bugs_fixed": [
			"API URL environment variable",
			"Admin images tab",
			"Username display",
			"Windows path compatibility",
			"SQLAlchemy 2.0 compatibility",
			"TypeScript interfaces",
			"Database credentials",
			"Race conditions in voting"
		]
	}


@app.get("/health")
def health_check():
	return {"status": "healthy"}


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=8000)