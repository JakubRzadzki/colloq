"""
Colloq PRO - FastAPI Backend Core Module

UPDATED: Added Faculty hierarchy between University and FieldOfStudy
AI CHATBOT REMOVED - HOTFIX VERSION
"""

import os
import shutil
from typing import List, Optional

from fastapi import (
    Body, Depends, FastAPI, File, Form, HTTPException, UploadFile, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from . import auth, database, models, schemas


# ===========================
# CONFIGURATION
# ===========================

class Config:
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@colloq.pl")
    ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
    UPLOAD_DIR = "uploads"
    UNI_IMG_DIR = os.path.join(UPLOAD_DIR, "universities")
    FACULTY_IMG_DIR = os.path.join(UPLOAD_DIR, "faculties")  # NEW
    LEADERBOARD_LIMIT = 5


# Update SEED_DATA to include faculties
SEED_DATA = [
    {
        "reg": "Dolnośląskie",
        "cities": ["Wrocław", "Legnica", "Jelenia Góra", "Wałbrzych"],
        "pl": "Politechnika Wrocławska",
        "en": "Wroclaw University of Science and Technology",
        "faculties": ["Wydział Elektroniki", "Wydział Informatyki", "Wydział Budownictwa"]
    },
    {
        "reg": "Kujawsko-Pomorskie",
        "cities": ["Bydgoszcz", "Toruń", "Włocławek", "Grudziądz"],
        "pl": "Uniwersytet Mikołaja Kopernika",
        "en": "Nicolaus Copernicus University",
        "faculties": ["Wydział Matematyki i Informatyki", "Wydział Fizyki"]
    },
    {
        "reg": "Lubelskie",
        "cities": ["Lublin", "Zamość", "Biała Podlaska", "Chełm"],
        "pl": "Uniwersytet Marii Curie-Skłodowskiej",
        "en": "Maria Curie-Sklodowska University",
        "faculties": ["Wydział Informatyki", "Wydział Elektroniki"]
    },
    {
        "reg": "Mazowieckie",
        "cities": ["Warszawa", "Radom", "Płock", "Siedlce", "Ciechanów"],
        "pl": "Uniwersytet Warszawski",
        "en": "University of Warsaw",
        "faculties": ["Wydział Matematyki", "Wydział Fizyki", "Wydział Chemii"]
    },
    {
        "reg": "Małopolskie",
        "cities": ["Kraków", "Tarnów", "Nowy Sącz", "Nowy Targ"],
        "pl": "Uniwersytet Jagielloński",
        "en": "Jagiellonian University",
        "faculties": ["Wydział Fizyki", "Wydział Matematyki i Informatyki"]
    },
    {
        "reg": "Lubuskie",
        "cities": ["Zielona Góra", "Gorzów Wielkopolski"],
        "pl": "Uniwersytet Zielonogórski",
        "en": "University of Zielona Gora",
        "faculties": ["Wydział Informatyki"]
    },
    {
        "reg": "Łódzkie",
        "cities": ["Łódź", "Piotrków Trybunalski", "Skierniewice"],
        "pl": "Politechnika Łódzka",
        "en": "Lodz University of Technology",
        "faculties": ["Wydział Elektrotechniki", "Wydział Informatyki"]
    },
    {
        "reg": "Opolskie",
        "cities": ["Opole", "Kędzierzyn-Koźle"],
        "pl": "Uniwersytet Opolski",
        "en": "University of Opole",
        "faculties": ["Wydział Matematyki i Informatyki"]
    },
    {
        "reg": "Podkarpackie",
        "cities": ["Rzeszów", "Przemyśl", "Krosno", "Tarnobrzeg"],
        "pl": "Politechnika Rzeszowska",
        "en": "Rzeszow University of Technology",
        "faculties": ["Wydział Elektrotechniki i Informatyki"]
    },
    {
        "reg": "Podlaskie",
        "cities": ["Białystok", "Łomża", "Suwałki"],
        "pl": "Uniwersytet w Białymstoku",
        "en": "University of Bialystok",
        "faculties": ["Wydział Informatyki"]
    },
    {
        "reg": "Pomorskie",
        "cities": ["Gdańsk", "Gdynia", "Słupsk"],
        "pl": "Politechnika Gdańska",
        "en": "Gdansk University of Technology",
        "faculties": ["Wydział Elektroniki", "Wydział Informatyki"]
    },
    {
        "reg": "Śląskie",
        "cities": ["Katowice", "Gliwice", "Częstochowa", "Sosnowiec", "Bielsko-Biała"],
        "pl": "Uniwersytet Śląski",
        "en": "University of Silesia",
        "faculties": ["Wydział Informatyki i Nauki o Materiałach"]
    },
    {
        "reg": "Świętokrzyskie",
        "cities": ["Kielce"],
        "pl": "Politechnika Świętokrzyska",
        "en": "Kielce University of Technology",
        "faculties": ["Wydział Elektrotechniki i Informatyki"]
    },
    {
        "reg": "Warmińsko-Mazurskie",
        "cities": ["Olsztyn", "Elbląg"],
        "pl": "Uniwersytet Warmińsko-Mazurski",
        "en": "University of Warmia and Mazury",
        "faculties": ["Wydział Matematyki i Informatyki"]
    },
    {
        "reg": "Wielkopolskie",
        "cities": ["Poznań", "Kalisz", "Konin", "Leszno", "Gniezno"],
        "pl": "Uniwersytet im. Adama Mickiewicza",
        "en": "Adam Mickiewicz University",
        "faculties": ["Wydział Matematyki i Informatyki"]
    },
    {
        "reg": "Zachodniopomorskie",
        "cities": ["Szczecin", "Koszalin"],
        "pl": "Zachodniopomorski Uniwersytet Technologiczny",
        "en": "West Pomeranian University of Technology",
        "faculties": ["Wydział Informatyki", "Wydział Elektryczny"]
    }
]


# ===========================
# INITIALIZATION
# ===========================

os.makedirs(Config.UNI_IMG_DIR, exist_ok=True)
os.makedirs(Config.FACULTY_IMG_DIR, exist_ok=True)  # NEW

app = FastAPI(
    title="Colloq PRO - Educational Platform API",
    version="4.0.0",  # Updated version
    description="REST API with Faculty hierarchy for managing university structures"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")


def seed_database(db: Session) -> None:
    """Updated seed function with faculties."""
    if db.query(models.University).count() > 0:
        print("⏭️  Database already seeded, skipping...")
        return

    print("🌱 Seeding database with Polish universities and faculties...")
    admin_user = db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first()

    for item in SEED_DATA:
        for city in item["cities"]:
            # Create university
            uni = models.University(
                name=f"{item['pl']} ({city})",
                name_pl=f"{item['pl']} w {city}",
                name_en=f"{item['en']} in {city}",
                city=city,
                region=item["reg"],
                type="Publiczna",
                image_url="https://images.unsplash.com/photo-1523050853064-8bf1952e690b?w=800",
                is_approved=True
            )
            db.add(uni)
            db.commit()

            # Create faculties for this university
            for faculty_name in item.get("faculties", ["Wydział Informatyki"]):
                faculty = models.Faculty(
                    name=f"{faculty_name}",
                    description=f"{faculty_name} {item['pl']} w {city}",
                    university_id=uni.id,
                    is_approved=True,
                    submitted_by_id=admin_user.id if admin_user else None
                )
                db.add(faculty)
                db.commit()

                # Create field of study in this faculty
                field = models.FieldOfStudy(
                    name="Informatyka",
                    degree_level="Inżynierskie",
                    faculty_id=faculty.id,
                    university_id=uni.id,  # For backward compatibility
                    is_approved=True,
                    submitted_by_id=admin_user.id if admin_user else None
                )
                db.add(field)
                db.commit()

                # Create subject
                subject = models.Subject(
                    name="Podstawy Programowania",
                    semester=1,
                    field_of_study_id=field.id,
                    is_approved=True,
                    submitted_by_id=admin_user.id if admin_user else None
                )
                db.add(subject)

    db.commit()
    print("✅ Database with faculties seeded successfully.")


def create_admin_user(db: Session) -> None:
    """Create default admin account if it doesn't exist."""
    if db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first():
        print("⏭️  Admin account already exists, skipping...")
        return

    uni = db.query(models.University).first()
    if not uni:
        # Create a placeholder university for the admin
        uni = models.University(name="System", city="System", region="System", is_approved=True)
        db.add(uni)
        db.commit()

    admin = models.User(
        email=Config.ADMIN_EMAIL,
        hashed_password=auth.get_password_hash(Config.ADMIN_PASS),
        university_id=uni.id,
        is_admin=True,
        nickname="Administrator",
        is_verified=True,
        is_active=True
    )
    db.add(admin)
    db.commit()
    print(f"✅ Created admin account: {Config.ADMIN_EMAIL}")


@app.on_event("startup")
def startup_event() -> None:
    """Application startup hook."""
    print("🔧 Initializing Colloq PRO with Faculty hierarchy...")
    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        seed_database(db)
        create_admin_user(db)
        print("✅ Application ready!")
    except Exception as e:
        print(f"❌ Startup error: {e}")
    finally:
        db.close()


# ===========================
# ENDPOINTS - UNIVERSITIES
# ===========================

@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_universities(
    search: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """Retrieve list of APPROVED universities."""
    query = db.query(models.University).filter(models.University.is_approved == True)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            models.University.name.ilike(search_pattern),
            models.University.name_pl.ilike(search_pattern),
            models.University.name_en.ilike(search_pattern),
            models.University.city.ilike(search_pattern),
            models.University.region.ilike(search_pattern)
        ))

    return query.all()


@app.post("/universities", status_code=status.HTTP_201_CREATED)
async def create_university(
    name: str = Form(...),
    city: str = Form(...),
    region: str = Form(...),
    image: UploadFile = File(None),  # NEW: Image upload support
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Propose a new university with optional image."""
    # Check duplicate
    if db.query(models.University).filter(models.University.name.ilike(name)).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "University already exists.")

    image_url = None
    if image:
        # Save uploaded image
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"uni_{name.replace(' ', '_')}_{current_user.id}{file_extension}"
        file_location = os.path.join(Config.UNI_IMG_DIR, unique_filename)

        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_url = f"/uploads/universities/{unique_filename}"

    new_uni = models.University(
        name=name,
        name_pl=name,
        city=city,
        region=region,
        image_url=image_url,
        is_approved=False,
        submitted_by_id=current_user.id
    )
    db.add(new_uni)
    db.commit()
    return {"msg": "Uczelnia ze zdjęciem dodana do weryfikacji."}


# ===========================
# ENDPOINTS - FACULTIES (NEW)
# ===========================

@app.get("/universities/{uni_id}/faculties", response_model=List[schemas.FacultyOut])
def get_faculties(uni_id: int, db: Session = Depends(database.get_db)):
    """Retrieve approved faculties for a university."""
    return db.query(models.Faculty).filter(
        models.Faculty.university_id == uni_id,
        models.Faculty.is_approved == True
    ).all()


@app.post("/faculties", status_code=status.HTTP_201_CREATED)
async def create_faculty(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    university_id: int = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Propose a new faculty (requires admin approval)."""
    # Check if faculty already exists for this university
    existing = db.query(models.Faculty).filter(
        models.Faculty.name.ilike(name),
        models.Faculty.university_id == university_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty already exists for this university."
        )

    # Check if university exists and is approved
    university = db.query(models.University).filter(
        models.University.id == university_id,
        models.University.is_approved == True
    ).first()

    if not university:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found or not approved."
        )

    # Save image if provided
    image_url = None
    if image:
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"fac_{name.replace(' ', '_')}_{current_user.id}{file_extension}"
        file_location = os.path.join(Config.FACULTY_IMG_DIR, unique_filename)

        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_url = f"/uploads/faculties/{unique_filename}"

    new_faculty = models.Faculty(
        name=name,
        description=description,
        image_url=image_url,
        university_id=university_id,
        is_approved=False,
        submitted_by_id=current_user.id
    )
    db.add(new_faculty)
    db.commit()
    return {"msg": "Wydział dodany i oczekuje na weryfikację."}


# ===========================
# ENDPOINTS - FIELDS OF STUDY (UPDATED)
# ===========================

@app.get("/faculties/{faculty_id}/fields", response_model=List[schemas.FieldOfStudyOut])
def get_fields_by_faculty(faculty_id: int, db: Session = Depends(database.get_db)):
    """Retrieve approved fields for a faculty."""
    return db.query(models.FieldOfStudy).filter(
        models.FieldOfStudy.faculty_id == faculty_id,
        models.FieldOfStudy.is_approved == True
    ).all()


@app.post("/fields", status_code=status.HTTP_201_CREATED)
def create_field(
    field: schemas.FieldOfStudyCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Propose a new field of study (requires admin approval)."""
    # Check if field already exists for this faculty
    existing = db.query(models.FieldOfStudy).filter(
        models.FieldOfStudy.name.ilike(field.name),
        models.FieldOfStudy.faculty_id == field.faculty_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field of study already exists for this faculty."
        )

    # Get faculty to get university_id for backward compatibility
    faculty = db.query(models.Faculty).filter(
        models.Faculty.id == field.faculty_id,
        models.Faculty.is_approved == True
    ).first()

    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found or not approved."
        )

    new_field = models.FieldOfStudy(
        name=field.name,
        degree_level=field.degree_level,
        faculty_id=field.faculty_id,
        university_id=faculty.university_id,  # For backward compatibility
        is_approved=False,
        submitted_by_id=current_user.id
    )
    db.add(new_field)
    db.commit()
    return {"msg": "Kierunek dodany i oczekuje na weryfikację."}


# ===========================
# ENDPOINTS - SUBJECTS
# ===========================

@app.get("/fields/{field_id}/subjects", response_model=List[schemas.SubjectOut])
def get_subjects(field_id: int, db: Session = Depends(database.get_db)):
    """Retrieve approved subjects for a field."""
    return db.query(models.Subject).filter(
        models.Subject.field_of_study_id == field_id,
        models.Subject.is_approved == True
    ).all()


@app.post("/subjects", status_code=status.HTTP_201_CREATED)
def create_subject(
    subject: schemas.SubjectCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Propose a new subject (requires admin approval)."""
    # Check if subject already exists for this field
    existing = db.query(models.Subject).filter(
        models.Subject.name.ilike(subject.name),
        models.Subject.field_of_study_id == subject.field_of_study_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject already exists for this field of study."
        )

    # Check if field exists and is approved
    field = db.query(models.FieldOfStudy).filter(
        models.FieldOfStudy.id == subject.field_of_study_id,
        models.FieldOfStudy.is_approved == True
    ).first()

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field of study not found or not approved."
        )

    new_subject = models.Subject(
        name=subject.name,
        semester=subject.semester,
        field_of_study_id=subject.field_of_study_id,
        is_approved=False,
        submitted_by_id=current_user.id
    )
    db.add(new_subject)
    db.commit()
    return {"msg": "Przedmiot dodany i oczekuje na weryfikację."}


# ===========================
# ENDPOINTS - AUTHENTICATION
# ===========================

@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: schemas.RegisterRequest, db: Session = Depends(database.get_db)):
    """Register user without CAPTCHA."""
    if db.query(models.User).filter(models.User.email == request.user.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already exists.")

    new_user = models.User(
        email=request.user.email,
        hashed_password=auth.get_password_hash(request.user.password),
        university_id=request.user.university_id,
        is_active=True,
        is_admin=False,
        is_verified=False,
        nickname=request.user.email.split('@')[0]
    )
    db.add(new_user)
    db.commit()
    return {"msg": "Account created successfully."}


@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """Authenticate and issue JWT."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect email or password.")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account inactive.")

    access_token = auth.create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin, "nick": user.nickname}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ===========================
# ENDPOINTS - NOTES
# ===========================

@app.post("/notes", status_code=status.HTTP_201_CREATED)
async def create_note(
    university_id: int = Form(...),
    subject_id: int = Form(...),
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    video_url: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Submit a note (Image OR Content required)."""
    if not content and not image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Musisz dodać treść lub zdjęcie."
        )

    image_path = None
    if image:
        file_location = os.path.join(Config.UPLOAD_DIR, image.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_path = f"/uploads/{image.filename}"

    new_note = models.Note(
        title=title or "Materiały bez tytułu",
        content=content or "",
        university_id=university_id,
        subject_id=subject_id,
        video_url=video_url,
        link_url=link_url,
        author_id=current_user.id,
        image_url=image_path,
        is_approved=False
    )
    db.add(new_note)

    if not current_user.is_verified:
        current_user.is_verified = True

    db.commit()
    return {"msg": "Materiały wysłane do akceptacji."}


@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(university_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    """Get approved notes."""
    query = db.query(models.Note).filter(models.Note.is_approved == True)
    if university_id:
        query = query.filter(models.Note.university_id == university_id)
    return query.order_by(models.Note.created_at.desc()).all()


# ===========================
# ENDPOINTS - ADMIN MODERATION
# ===========================

@app.get("/admin/pending_items", response_model=schemas.PendingItemsResponse)
def get_pending_items(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_admin)
):
    """
    Aggregation endpoint for Admin Dashboard.
    Shows EVERYTHING that needs approval.
    """
    return {
        "notes": db.query(models.Note).filter(models.Note.is_approved == False).all(),
        "universities": db.query(models.University).filter(models.University.is_approved == False).all(),
        "faculties": db.query(models.Faculty).filter(models.Faculty.is_approved == False).all(),  # NEW
        "fields": db.query(models.FieldOfStudy).filter(models.FieldOfStudy.is_approved == False).all(),
        "subjects": db.query(models.Subject).filter(models.Subject.is_approved == False).all()
    }


# Approve Endpoints (with faculty support)
@app.post("/admin/approve/note/{note_id}")
def approve_note(note_id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    item = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not item: raise HTTPException(404, "Note not found")
    item.is_approved = True
    db.commit()
    return {"msg": "Note approved successfully."}


@app.post("/admin/approve/university/{uni_id}")
def approve_university(uni_id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    item = db.query(models.University).filter(models.University.id == uni_id).first()
    if not item: raise HTTPException(404, "University not found")
    item.is_approved = True
    db.commit()
    return {"msg": "University approved successfully."}


@app.post("/admin/approve/faculty/{faculty_id}")  # NEW
def approve_faculty(faculty_id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    item = db.query(models.Faculty).filter(models.Faculty.id == faculty_id).first()
    if not item: raise HTTPException(404, "Faculty not found")
    item.is_approved = True
    db.commit()
    return {"msg": "Faculty approved successfully."}


@app.post("/admin/approve/field/{field_id}")
def approve_field(field_id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    item = db.query(models.FieldOfStudy).filter(models.FieldOfStudy.id == field_id).first()
    if not item: raise HTTPException(404, "Field not found")
    item.is_approved = True
    db.commit()
    return {"msg": "Field of study approved successfully."}


@app.post("/admin/approve/subject/{subject_id}")
def approve_subject(subject_id: int, db: Session = Depends(database.get_db), _: models.User = Depends(auth.get_current_active_admin)):
    item = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not item: raise HTTPException(404, "Subject not found")
    item.is_approved = True
    db.commit()
    return {"msg": "Subject approved successfully."}


# ===========================
# OTHER ENDPOINTS
# ===========================

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)):
    results = (
        db.query(models.User, func.count(models.Note.id).label("count"))
        .join(models.Note)
        .filter(models.Note.is_approved == True)
        .group_by(models.User)
        .order_by(func.count(models.Note.id).desc())
        .limit(Config.LEADERBOARD_LIMIT)
        .all()
    )
    return [{"name": u.nickname or u.email, "count": c, "is_verified": u.is_verified} for u, c in results]


@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    return {
        "status": "healthy",
        "version": "4.0.0",
        "database": {
            "universities": db.query(models.University).count(),
            "faculties": db.query(models.Faculty).count(),  # NEW
            "users": db.query(models.User).count(),
            "notes": db.query(models.Note).count(),
            "fields": db.query(models.FieldOfStudy).count(),
            "subjects": db.query(models.Subject).count()
        },
        "pending_reviews": {
            "notes": db.query(models.Note).filter(models.Note.is_approved == False).count(),
            "universities": db.query(models.University).filter(models.University.is_approved == False).count(),
            "faculties": db.query(models.Faculty).filter(models.Faculty.is_approved == False).count(),  # NEW
            "fields": db.query(models.FieldOfStudy).filter(models.FieldOfStudy.is_approved == False).count(),
            "subjects": db.query(models.Subject).filter(models.Subject.is_approved == False).count()
        },
        "ai_available": False  # AI removed in hotfix
    }