"""
Colloq PRO - Main Application
"""
import os
import shutil
from typing import List, Optional
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
    UNI_IMG_DIR = os.path.join(UPLOAD_DIR, "universities")
    FACULTY_IMG_DIR = os.path.join(UPLOAD_DIR, "faculties")
    AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")

for d in [Config.UPLOAD_DIR, Config.UNI_IMG_DIR, Config.FACULTY_IMG_DIR, Config.AVATAR_DIR]:
    os.makedirs(d, exist_ok=True)

app = FastAPI(title="Colloq PRO MVP", version="5.0.0")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)
app.mount("/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")

@app.on_event("startup")
def startup():
    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    if db.query(models.University).count() == 0:
        uni = models.University(name="Politechnika Krakowska", name_pl="Politechnika Krakowska", city="Kraków", region="Małopolskie", is_approved=True)
        db.add(uni)
        db.commit()
        admin = models.User(email=Config.ADMIN_EMAIL, hashed_password=auth.get_password_hash(Config.ADMIN_PASS), university_id=uni.id, is_admin=True, nickname="Admin", is_verified=True)
        db.add(admin)
        db.commit()
    db.close()

# --- AUTH ---
@app.post("/token")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not auth.verify_password(form.password, user.hashed_password): raise HTTPException(400, "Invalid credentials")
    return {"access_token": auth.create_access_token({"sub": user.email, "is_admin": user.is_admin}), "token_type": "bearer"}

@app.post("/register", status_code=201)
def register(r: schemas.RegisterRequest, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == r.user.email).first(): raise HTTPException(400, "Email taken")
    db.add(models.User(email=r.user.email, hashed_password=auth.get_password_hash(r.user.password), university_id=r.user.university_id, nickname=r.user.email.split("@")[0]))
    db.commit()
    return {"msg": "OK"}

# --- USER PROFILE ---
@app.get("/users/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)): return user

@app.put("/users/me", response_model=schemas.UserOut)
def update_profile(nickname: str = Form(None), bio: str = Form(None), avatar: UploadFile = File(None), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    if nickname: user.nickname = nickname
    if bio: user.bio = bio
    if avatar:
        path = f"/uploads/avatars/{user.id}_{avatar.filename}"
        with open(f".{path}", "wb+") as f: shutil.copyfileobj(avatar.file, f)
        user.avatar_url = path
    db.commit()
    return user

@app.get("/user/dashboard", response_model=schemas.UserDashboard)
def dashboard(db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    return {
        "my_notes": db.query(models.Note).filter(models.Note.author_id == user.id).all(),
        "my_favorites": db.query(models.Note).join(models.Favorite).filter(models.Favorite.user_id == user.id).all(),
        "pending_submissions": {}
    }

# --- UNIVERSITIES ---
@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_unis(db: Session = Depends(database.get_db)): return db.query(models.University).filter(models.University.is_approved == True).all()

@app.get("/universities/{id}", response_model=schemas.UniversityOut)
def get_uni(id: int, db: Session = Depends(database.get_db)): return db.query(models.University).filter(models.University.id == id).first()

@app.post("/universities", status_code=201)
def add_uni(name: str=Form(...), city: str=Form(...), region: str=Form(...), image: UploadFile=File(None), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    path = None
    if image:
        path = f"/uploads/universities/uni_{name}_{user.id}_{image.filename}"
        with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
    db.add(models.University(name=name, city=city, region=region, image_url=path, submitted_by_id=user.id))
    db.commit()
    return {"msg": "OK"}

@app.put("/universities/{id}")
def update_uni(id: int, description: str=Form(None), banner: UploadFile=File(None), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_active_admin)):
    uni = db.query(models.University).get(id)
    if description: uni.description = description
    if banner:
        path = f"/uploads/universities/banner_{id}_{banner.filename}"
        with open(f".{path}", "wb+") as f: shutil.copyfileobj(banner.file, f)
        uni.banner_url = path
    db.commit()
    return {"msg": "OK"}

@app.post("/universities/{id}/image_request")
def img_req(id: int, image: UploadFile=File(...), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    path = f"/uploads/universities/req_{id}_{user.id}_{image.filename}"
    with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
    db.add(models.UniversityImageRequest(university_id=id, new_image_url=path, submitted_by_id=user.id))
    db.commit()
    return {"msg": "Requested"}

# --- REVIEWS ---
@app.get("/universities/{id}/reviews", response_model=List[schemas.ReviewOut])
def get_reviews(id: int, db: Session = Depends(database.get_db)): return db.query(models.Review).filter(models.Review.university_id == id).all()

@app.post("/reviews")
def add_review(r: schemas.ReviewCreate, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    db.add(models.Review(user_id=user.id, university_id=r.university_id, rating=r.rating, content=r.content))
    db.commit()
    return {"msg": "Added"}

@app.delete("/reviews/{id}")
def del_review(id: int, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    r = db.query(models.Review).get(id)
    if r.user_id != user.id and not user.is_admin: raise HTTPException(403)
    db.delete(r)
    db.commit()
    return {"msg": "Deleted"}

# --- FACULTIES/FIELDS/SUBJECTS ---
@app.get("/universities/{id}/faculties", response_model=List[schemas.FacultyOut])
def get_facs(id: int, db: Session = Depends(database.get_db)): return db.query(models.Faculty).filter(models.Faculty.university_id == id, models.Faculty.is_approved == True).all()

@app.post("/faculties")
def add_fac(name: str=Form(...), university_id: int=Form(...), image: UploadFile=File(None), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    path = None
    if image:
        path = f"/uploads/faculties/fac_{user.id}_{image.filename}"
        with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
    db.add(models.Faculty(name=name, university_id=university_id, image_url=path, submitted_by_id=user.id))
    db.commit()
    return {"msg": "OK"}

@app.get("/faculties/{id}/fields", response_model=List[schemas.FieldOfStudyOut])
def get_fields(id: int, db: Session = Depends(database.get_db)): return db.query(models.FieldOfStudy).filter(models.FieldOfStudy.faculty_id == id, models.FieldOfStudy.is_approved == True).all()

@app.post("/fields")
def add_field(f: schemas.FieldOfStudyCreate, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    db.add(models.FieldOfStudy(**f.dict(), submitted_by_id=user.id))
    db.commit()
    return {"msg": "OK"}

@app.get("/fields/{id}/subjects", response_model=List[schemas.SubjectOut])
def get_subjects(id: int, db: Session = Depends(database.get_db)): return db.query(models.Subject).filter(models.Subject.field_of_study_id == id, models.Subject.is_approved == True).all()

@app.post("/subjects")
def add_subject(s: schemas.SubjectCreate, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    db.add(models.Subject(**s.dict(), submitted_by_id=user.id))
    db.commit()
    return {"msg": "OK"}

# --- NOTES ---
@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(search: str=None, university_id: int=None, db: Session = Depends(database.get_db)):
    q = db.query(models.Note).filter(models.Note.is_approved == True)
    if university_id: q = q.filter(models.Note.university_id == university_id)
    if search: q = q.filter(or_(models.Note.title.ilike(f"%{search}%"), models.Note.content.ilike(f"%{search}%")))
    return q.order_by(models.Note.score.desc()).all()

@app.post("/notes", status_code=201)
def add_note(university_id: int=Form(...), subject_id: int=Form(...), title: str=Form(None), content: str=Form(None), image: UploadFile=File(None), db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    path = None
    if image:
        path = f"/uploads/{image.filename}"
        with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
    if not content and not path: raise HTTPException(400)
    db.add(models.Note(title=title, content=content, image_url=path, university_id=university_id, subject_id=subject_id, author_id=user.id))
    db.commit()
    return {"msg": "OK"}

@app.post("/notes/{id}/vote")
def vote(id: int, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    v = db.query(models.Vote).filter(models.Vote.user_id == user.id, models.Vote.note_id == id).first()
    n = db.query(models.Note).get(id)
    if v:
        db.delete(v)
        n.score -= 1
        msg = "Removed"
    else:
        db.add(models.Vote(user_id=user.id, note_id=id, value=1))
        n.score += 1
        msg = "Voted"
    db.commit()
    return {"msg": msg, "new_score": n.score}

@app.post("/notes/{id}/favorite")
def fav(id: int, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    f = db.query(models.Favorite).filter(models.Favorite.user_id == user.id, models.Favorite.note_id == id).first()
    if f:
        db.delete(f)
        msg = "Removed"
    else:
        db.add(models.Favorite(user_id=user.id, note_id=id))
        msg = "Added"
    db.commit()
    return {"msg": msg}

@app.get("/notes/{id}/comments", response_model=List[schemas.CommentOut])
def get_comments(id: int, db: Session = Depends(database.get_db)): return db.query(models.Comment).filter(models.Comment.note_id == id).all()

@app.post("/notes/{id}/comments", response_model=schemas.CommentOut)
def add_comment(id: int, c: schemas.CommentCreate, db: Session = Depends(database.get_db), user: models.User = Depends(auth.get_current_user)):
    comm = models.Comment(user_id=user.id, note_id=id, content=c.content)
    db.add(comm)
    db.commit()
    db.refresh(comm)
    return comm

# --- ADMIN ---
@app.get("/admin/pending_items", response_model=schemas.PendingItemsResponse)
def get_pending(db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    return {
        "notes": db.query(models.Note).filter(models.Note.is_approved == False).all(),
        "universities": db.query(models.University).filter(models.University.is_approved == False).all(),
        "faculties": db.query(models.Faculty).filter(models.Faculty.is_approved == False).all(),
        "fields": db.query(models.FieldOfStudy).filter(models.FieldOfStudy.is_approved == False).all(),
        "subjects": db.query(models.Subject).filter(models.Subject.is_approved == False).all(),
        "image_requests": db.query(models.UniversityImageRequest).filter(models.UniversityImageRequest.status == "pending").all()
    }

@app.post("/admin/approve/{type}/{id}")
def approve(type: str, id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    m = {"university": models.University, "faculty": models.Faculty, "field": models.FieldOfStudy, "subject": models.Subject, "note": models.Note}
    item = db.query(m[type]).get(id)
    item.is_approved = True
    db.commit()
    return {"msg": "Approved"}

@app.delete("/admin/reject/{type}/{id}")
def reject(type: str, id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    m = {"university": models.University, "faculty": models.Faculty, "field": models.FieldOfStudy, "subject": models.Subject, "note": models.Note}
    db.delete(db.query(m[type]).get(id))
    db.commit()
    return {"msg": "Rejected"}

@app.post("/admin/approve_image_request/{id}")
def app_img(id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    req = db.query(models.UniversityImageRequest).get(id)
    uni = db.query(models.University).get(req.university_id)
    uni.image_url = req.new_image_url
    req.status = "approved"
    db.commit()
    return {"msg": "Approved"}

@app.post("/admin/reject_image_request/{id}")
def rej_img(id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    req = db.query(models.UniversityImageRequest).get(id)
    req.status = "rejected"
    db.commit()
    return {"msg": "Rejected"}

@app.patch("/admin/universities/{id}/image")
def update_uni_img(id: int, image: UploadFile=File(...), db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    path = f"/uploads/universities/admin_{id}_{image.filename}"
    with open(f".{path}", "wb+") as f: shutil.copyfileobj(image.file, f)
    uni = db.query(models.University).get(id)
    uni.image_url = path
    db.commit()
    return {"msg": "Updated"}