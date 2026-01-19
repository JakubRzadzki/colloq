import os
import shutil
from typing import List, Dict, Any
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import or_
from sqlalchemy.orm import Session
from . import auth, database, models, schemas


class Config:
	ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@colloq.pl")
	ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
	UPLOAD_DIR = "uploads"
	# Ensure subdirectories exist
	for d in ["universities", "faculties", "avatars"]:
		os.makedirs(os.path.join(UPLOAD_DIR, d), exist_ok=True)


app = FastAPI(title="Colloq PRO MVP", version="5.2.0")

# CORS setup
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],  # In production replace with specific origin
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Mount static files
app.mount("/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def startup():
	"""
	Initializes the database and seeds required data (Admin, University, Syllabus).
	"""
	models.Base.metadata.create_all(bind=database.engine)
	db = database.SessionLocal()
	try:
		# 1. Seed University: Politechnika Krakowska
		uni_name = "Politechnika Krakowska"
		uni = db.query(models.University).filter(models.University.name == uni_name).first()
		if not uni:
			uni = models.University(
				name=uni_name,
				name_pl=uni_name,
				city="Kraków",
				region="Małopolskie",
				is_approved=True,
				description="Technical university in Krakow."
			)
			db.add(uni)
			db.commit()
			db.refresh(uni)

		# 2. Seed Admin User
		if not db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first():
			admin = models.User(
				email=Config.ADMIN_EMAIL,
				hashed_password=auth.get_password_hash(Config.ADMIN_PASS),
				university_id=uni.id,
				is_admin=True,
				nickname="Admin",
				is_verified=True
			)
			db.add(admin)
			db.commit()

		# 3. Seed Syllabus Hierarchy
		fac_name = "Wydział Informatyki i Telekomunikacji"
		fac = db.query(models.Faculty).filter(
			models.Faculty.name == fac_name,
			models.Faculty.university_id == uni.id
		).first()

		if not fac:
			fac = models.Faculty(name=fac_name, university_id=uni.id, is_approved=True)
			db.add(fac)
			db.commit()
			db.refresh(fac)

		field_name = "Informatyka w Inżynierii Komputerowej"
		field = db.query(models.FieldOfStudy).filter(
			models.FieldOfStudy.name == field_name,
			models.FieldOfStudy.faculty_id == fac.id
		).first()

		if not field:
			print(f"--- SEEDING SYLLABUS: {field_name} ---")
			field = models.FieldOfStudy(
				name=field_name,
				degree_level="I stopień",
				faculty_id=fac.id,
				is_approved=True
			)
			db.add(field)
			db.commit()
			db.refresh(field)

			# Subject List (Semester, Name)
			subjects_data = [
				(1, "Analiza Matematyczna"), (1, "Algebra Liniowa"), (1, "Fizyka"), (1, "Wstęp do Informatyki"),
				(2, "Matematyka Dyskretna"), (2, "Architektura Systemów Komputerowych"), (2, "Programowanie Obiektowe"),
				(3, "Algorytmy i Struktury Danych"), (3, "Systemy Operacyjne"), (3, "Bazy Danych"),
				(4, "Sieci Komputerowe"), (4, "Inżynieria Oprogramowania"), (4, "Grafika Komputerowa"),
				(5, "Sztuczna Inteligencja"), (5, "Systemy Wbudowane"),
				(6, "Bezpieczeństwo Systemów"), (6, "Praktyka Zawodowa"),
				(7, "Seminarium Dyplomowe"), (7, "Praca Dyplomowa")
			]

			for sem, subj_name in subjects_data:
				db.add(models.Subject(
					name=subj_name,
					semester=sem,
					field_of_study_id=field.id,
					is_approved=True
				))
			db.commit()
			print("--- SYLLABUS SEEDED SUCCESSFULLY ---")

	except Exception as e:
		print(f"Startup Error: {e}")
	finally:
		db.close()


# --- AUTH ROUTES ---
@app.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
	user = db.query(models.User).filter(models.User.email == form.username).first()
	if not user or not auth.verify_password(form.password, user.hashed_password):
		raise HTTPException(400, "Invalid credentials")
	return {
		"access_token": auth.create_access_token({"sub": user.email, "is_admin": user.is_admin}),
		"token_type": "bearer"
	}


@app.post("/register", status_code=201)
def register(r: schemas.RegisterRequest, db: Session = Depends(database.get_db)):
	if db.query(models.User).filter(models.User.email == r.user.email).first():
		raise HTTPException(400, "Email taken")

	new_user = models.User(
		email=r.user.email,
		hashed_password=auth.get_password_hash(r.user.password),
		university_id=r.user.university_id,
		nickname=r.user.email.split("@")[0]
	)
	db.add(new_user)
	db.commit()
	return {"msg": "OK"}


@app.get("/users/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
	return user


@app.put("/users/me", response_model=schemas.UserOut)
def update_profile(
		nickname: str = Form(None),
		bio: str = Form(None),
		avatar: UploadFile = File(None),
		db: Session = Depends(database.get_db),
		user: models.User = Depends(auth.get_current_user)
):
	if nickname: user.nickname = nickname
	if bio: user.bio = bio
	if avatar:
		file_path = os.path.join("uploads", "avatars", f"{user.id}_{avatar.filename}")
		with open(file_path, "wb+") as f:
			shutil.copyfileobj(avatar.file, f)
		user.avatar_url = f"/{file_path}"

	db.commit()
	db.refresh(user)
	return user


# --- MVP TERM: GLOBAL SEARCH ---
@app.get("/search/global")
def global_search(q: str, db: Session = Depends(database.get_db)):
	"""
	Search for Fields of Study and Subjects across all universities.
	Case-insensitive search matching the query string 'q'.
	"""
	results = {
		"fields": [],
		"subjects": []
	}

	if not q or len(q) < 2:
		return results

	# Search Fields
	fields = db.query(models.FieldOfStudy).join(models.Faculty).join(models.University) \
		.filter(models.FieldOfStudy.name.ilike(f"%{q}%"), models.FieldOfStudy.is_approved == True).all()

	for f in fields:
		results["fields"].append({
			"id": f.id,
			"name": f.name,
			"degree": f.degree_level,
			"faculty": f.faculty.name,
			"university": f.faculty.university.name,
			"university_id": f.faculty.university.id
		})

	# Search Subjects
	subjects = db.query(models.Subject).join(models.FieldOfStudy).join(models.Faculty).join(models.University) \
		.filter(models.Subject.name.ilike(f"%{q}%"), models.Subject.is_approved == True).all()

	for s in subjects:
		results["subjects"].append({
			"id": s.id,
			"name": s.name,
			"semester": s.semester,
			"field": s.field_of_study.name,
			"university": s.field_of_study.faculty.university.name,
			"university_id": s.field_of_study.faculty.university.id
		})

	return results


# --- STANDARD ENTITIES ---
@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_unis(db: Session = Depends(database.get_db)):
	return db.query(models.University).filter(models.University.is_approved == True).all()


@app.get("/universities/{id}", response_model=schemas.UniversityOut)
def get_uni(id: int, db: Session = Depends(database.get_db)):
	uni = db.query(models.University).filter(models.University.id == id).first()
	if not uni: raise HTTPException(404, "University not found")
	return uni


@app.post("/universities", status_code=201)
def add_uni(
		name: str = Form(...), city: str = Form(...), region: str = Form(...),
		image: UploadFile = File(None),
		db: Session = Depends(database.get_db),
		user: models.User = Depends(auth.get_current_user)
):
	path = None
	if image:
		path = f"/uploads/universities/uni_{user.id}_{image.filename}"
		with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
	db.add(models.University(name=name, city=city, region=region, image_url=path, submitted_by_id=user.id))
	db.commit()
	return {"msg": "OK"}


@app.post("/universities/{id}/image_request")
def img_req(id: int, image: UploadFile = File(...), db: Session = Depends(database.get_db),
            user: models.User = Depends(auth.get_current_user)):
	path = f"uploads/universities/req_{id}_{user.id}_{image.filename}"
	with open(path, "wb+") as f: shutil.copyfileobj(image.file, f)

	db.add(models.UniversityImageRequest(
		university_id=id,
		new_image_url=f"/{path}",
		submitted_by_id=user.id
	))
	db.commit()
	return {"msg": "Requested"}


@app.get("/universities/{id}/reviews", response_model=List[schemas.ReviewOut])
def get_reviews(id: int, db: Session = Depends(database.get_db)):
	return db.query(models.Review).filter(models.Review.university_id == id).all()


@app.post("/reviews")
def add_review(r: schemas.ReviewCreate, db: Session = Depends(database.get_db),
               user: models.User = Depends(auth.get_current_user)):
	db.add(models.Review(user_id=user.id, university_id=r.university_id, rating=r.rating, content=r.content))
	db.commit()
	return {"msg": "Added"}


@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(search: str = None, university_id: int = None, db: Session = Depends(database.get_db)):
	q = db.query(models.Note).filter(models.Note.is_approved == True)
	if university_id: q = q.filter(models.Note.university_id == university_id)
	if search: q = q.filter(or_(models.Note.title.ilike(f"%{search}%"), models.Note.content.ilike(f"%{search}%")))
	return q.order_by(models.Note.score.desc()).all()


@app.post("/notes", status_code=201)
def add_note(
		university_id: int = Form(...), subject_id: int = Form(...),
		title: str = Form(None), content: str = Form(None),
		image: UploadFile = File(None),
		db: Session = Depends(database.get_db),
		user: models.User = Depends(auth.get_current_user)
):
	path = None
	if image:
		path = f"/uploads/{image.filename}"
		with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)

	db.add(models.Note(
		title=title, content=content, image_url=path,
		university_id=university_id, subject_id=subject_id, author_id=user.id
	))
	db.commit()
	return {"msg": "OK"}


@app.get("/notes/{id}/comments", response_model=List[schemas.CommentOut])
def get_comments(id: int, db: Session = Depends(database.get_db)):
	return db.query(models.Comment).filter(models.Comment.note_id == id).all()


@app.post("/notes/{id}/comments", response_model=schemas.CommentOut)
def add_comment(id: int, c: schemas.CommentCreate, db: Session = Depends(database.get_db),
                user: models.User = Depends(auth.get_current_user)):
	comm = models.Comment(user_id=user.id, note_id=id, content=c.content)
	db.add(comm)
	db.commit()
	db.refresh(comm)
	return comm


@app.post("/notes/{id}/vote")
def vote(id: int, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
	note = db.query(models.Note).get(id)
	if not note: raise HTTPException(404)

	existing = db.query(models.Vote).filter(models.Vote.user_id == user.id, models.Vote.note_id == id).first()
	if existing:
		db.delete(existing)
		note.score -= 1
		msg = "Removed"
	else:
		db.add(models.Vote(user_id=user.id, note_id=id, value=1))
		note.score += 1
		msg = "Voted"
	db.commit()
	return {"msg": msg}


@app.post("/notes/{id}/favorite")
def fav(id: int, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
	existing = db.query(models.Favorite).filter(models.Favorite.user_id == user.id,
	                                            models.Favorite.note_id == id).first()
	if existing:
		db.delete(existing)
		msg = "Removed"
	else:
		db.add(models.Favorite(user_id=user.id, note_id=id))
		msg = "Added"
	db.commit()
	return {"msg": msg}


# --- ADMIN ---
@app.get("/admin/pending_items", response_model=schemas.PendingItemsResponse)
def get_pending(db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
	return {
		"notes": db.query(models.Note).filter(models.Note.is_approved == False).all(),
		"universities": db.query(models.University).filter(models.University.is_approved == False).all(),
		"faculties": db.query(models.Faculty).filter(models.Faculty.is_approved == False).all(),
		"fields": db.query(models.FieldOfStudy).filter(models.FieldOfStudy.is_approved == False).all(),
		"subjects": db.query(models.Subject).filter(models.Subject.is_approved == False).all(),
		"image_requests": db.query(models.UniversityImageRequest).filter(
			models.UniversityImageRequest.status == "pending").all()
	}


@app.post("/admin/approve/{type}/{id}")
def approve(type: str, id: int, db: Session = Depends(database.get_db),
            _: models.User = Depends(auth.get_current_active_admin)):
	model_map = {
		"university": models.University,
		"faculty": models.Faculty,
		"field": models.FieldOfStudy,
		"subject": models.Subject,
		"note": models.Note
	}
	item = db.query(model_map[type]).get(id)
	if item:
		item.is_approved = True
		db.commit()
	return {"msg": "Approved"}


@app.delete("/admin/reject/{type}/{id}")
def reject(type: str, id: int, db: Session = Depends(database.get_db),
           _: models.User = Depends(auth.get_current_active_admin)):
	model_map = {
		"university": models.University,
		"faculty": models.Faculty,
		"field": models.FieldOfStudy,
		"subject": models.Subject,
		"note": models.Note
	}
	item = db.query(model_map[type]).get(id)
	if item:
		db.delete(item)
		db.commit()
	return {"msg": "Rejected"}


@app.post("/admin/approve_image_request/{id}")
def approve_img(id: int, db: Session = Depends(database.get_db),
                _: models.User = Depends(auth.get_current_active_admin)):
	req = db.query(models.UniversityImageRequest).get(id)
	if req:
		uni = db.query(models.University).get(req.university_id)
		uni.image_url = req.new_image_url
		req.status = "approved"
		db.commit()
	return {"msg": "Approved"}


@app.post("/admin/reject_image_request/{id}")
def reject_img(id: int, db: Session = Depends(database.get_db),
               _: models.User = Depends(auth.get_current_active_admin)):
	req = db.query(models.UniversityImageRequest).get(id)
	if req:
		req.status = "rejected"
		db.commit()
	return {"msg": "Rejected"}


@app.patch("/admin/universities/{id}/image")
def update_uni_img(id: int, image: UploadFile = File(...), db: Session = Depends(database.get_db),
                   _: models.User = Depends(auth.get_current_active_admin)):
	path = f"/uploads/universities/admin_{id}_{image.filename}"
	with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
	uni = db.query(models.University).get(id)
	uni.image_url = path
	db.commit()
	return {"msg": "Updated"}


@app.put("/universities/{id}")
def update_uni(id: int, description: str = Form(None), banner: UploadFile = File(None),
               db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_active_admin)):
	uni = db.query(models.University).get(id)
	if description: uni.description = description
	if banner:
		path = f"/uploads/universities/banner_{id}_{banner.filename}"
		with open(f".{path}", "wb+") as f: shutil.copyfileobj(banner.file, f)
		uni.banner_url = path
	db.commit()
	return {"msg": "OK"}


# --- FACULTIES/FIELDS/SUBJECTS CRUD ---
@app.get("/universities/{id}/faculties", response_model=List[schemas.FacultyOut])
def get_facs(id: int, db: Session = Depends(database.get_db)): return db.query(models.Faculty).filter(
	models.Faculty.university_id == id, models.Faculty.is_approved == True).all()


@app.post("/faculties")
def add_fac(name: str = Form(...), university_id: int = Form(...), db: Session = Depends(database.get_db),
            user: models.User = Depends(auth.get_current_user)):
	db.add(models.Faculty(name=name, university_id=university_id, submitted_by_id=user.id))
	db.commit()
	return {"msg": "OK"}


@app.get("/faculties/{id}/fields", response_model=List[schemas.FieldOfStudyOut])
def get_fields(id: int, db: Session = Depends(database.get_db)): return db.query(models.FieldOfStudy).filter(
	models.FieldOfStudy.faculty_id == id, models.FieldOfStudy.is_approved == True).all()


@app.post("/fields")
def add_field(f: schemas.FieldOfStudyCreate, db: Session = Depends(database.get_db),
              user: models.User = Depends(auth.get_current_user)):
	db.add(models.FieldOfStudy(**f.dict(), submitted_by_id=user.id))
	db.commit()
	return {"msg": "OK"}


@app.get("/fields/{id}/subjects", response_model=List[schemas.SubjectOut])
def get_subjects(id: int, db: Session = Depends(database.get_db)): return db.query(models.Subject).filter(
	models.Subject.field_of_study_id == id, models.Subject.is_approved == True).all()


@app.post("/subjects")
def add_subject(s: schemas.SubjectCreate, db: Session = Depends(database.get_db),
                user: models.User = Depends(auth.get_current_user)):
	db.add(models.Subject(**s.dict(), submitted_by_id=user.id))
	db.commit()
	return {"msg": "OK"}