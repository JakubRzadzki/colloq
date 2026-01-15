"""
Colloq PRO - FastAPI Backend Core Module

This is the main application file that orchestrates:
- FastAPI app initialization and middleware
- Database seeding (universities, fields, subjects)
- RESTful API endpoints for authentication, notes, hierarchy, and AI chat
- Admin moderation endpoints
- Gamification (leaderboard)

Architecture:
    Request → Middleware → Auth Dependency → Business Logic → Database → Response
"""

import os
import shutil
from typing import List, Optional

import httpx
from fastapi import (
    Body,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from google import genai
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from . import auth, database, models, schemas


# ===========================
# CONFIGURATION
# ===========================

class Config:
    """Application configuration loaded from environment variables."""

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    TURNSTILE_SECRET_KEY = os.getenv(
        "TURNSTILE_SECRET_KEY",
        "1x0000000000000000000000000000000AA"  # Dummy key for local dev
    )
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@colloq.pl")
    ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
    UPLOAD_DIR = "uploads"
    UNI_IMG_DIR = os.path.join(UPLOAD_DIR, "universities")
    LEADERBOARD_LIMIT = 5


# Seed data: Polish universities mapped to regions and cities
# Format: {region: [cities], primary_university_pl, primary_university_en}
SEED_DATA = [
    {
        "reg": "Dolnośląskie",
        "cities": ["Wrocław", "Legnica", "Jelenia Góra", "Wałbrzych"],
        "pl": "Politechnika Wrocławska",
        "en": "Wroclaw University of Science and Technology"
    },
    {
        "reg": "Kujawsko-Pomorskie",
        "cities": ["Bydgoszcz", "Toruń", "Włocławek", "Grudziądz"],
        "pl": "Uniwersytet Mikołaja Kopernika",
        "en": "Nicolaus Copernicus University"
    },
    {
        "reg": "Lubelskie",
        "cities": ["Lublin", "Zamość", "Biała Podlaska", "Chełm"],
        "pl": "Uniwersytet Marii Curie-Skłodowskiej",
        "en": "Maria Curie-Sklodowska University"
    },
    {
        "reg": "Lubuskie",
        "cities": ["Zielona Góra", "Gorzów Wielkopolski"],
        "pl": "Uniwersytet Zielonogórski",
        "en": "University of Zielona Gora"
    },
    {
        "reg": "Łódzkie",
        "cities": ["Łódź", "Piotrków Trybunalski", "Skierniewice"],
        "pl": "Politechnika Łódzka",
        "en": "Lodz University of Technology"
    },
    {
        "reg": "Małopolskie",
        "cities": ["Kraków", "Tarnów", "Nowy Sącz", "Nowy Targ"],
        "pl": "Uniwersytet Jagielloński",
        "en": "Jagiellonian University"
    },
    {
        "reg": "Mazowieckie",
        "cities": ["Warszawa", "Radom", "Płock", "Siedlce", "Ciechanów"],
        "pl": "Uniwersytet Warszawski",
        "en": "University of Warsaw"
    },
    {
        "reg": "Opolskie",
        "cities": ["Opole", "Kędzierzyn-Koźle"],
        "pl": "Uniwersytet Opolski",
        "en": "University of Opole"
    },
    {
        "reg": "Podkarpackie",
        "cities": ["Rzeszów", "Przemyśl", "Krosno", "Tarnobrzeg"],
        "pl": "Politechnika Rzeszowska",
        "en": "Rzeszow University of Technology"
    },
    {
        "reg": "Podlaskie",
        "cities": ["Białystok", "Łomża", "Suwałki"],
        "pl": "Uniwersytet w Białymstoku",
        "en": "University of Bialystok"
    },
    {
        "reg": "Pomorskie",
        "cities": ["Gdańsk", "Gdynia", "Słupsk"],
        "pl": "Politechnika Gdańska",
        "en": "Gdansk University of Technology"
    },
    {
        "reg": "Śląskie",
        "cities": ["Katowice", "Gliwice", "Częstochowa", "Sosnowiec", "Bielsko-Biała"],
        "pl": "Uniwersytet Śląski",
        "en": "University of Silesia"
    },
    {
        "reg": "Świętokrzyskie",
        "cities": ["Kielce"],
        "pl": "Politechnika Świętokrzyska",
        "en": "Kielce University of Technology"
    },
    {
        "reg": "Warmińsko-Mazurskie",
        "cities": ["Olsztyn", "Elbląg"],
        "pl": "Uniwersytet Warmińsko-Mazurski",
        "en": "University of Warmia and Mazury"
    },
    {
        "reg": "Wielkopolskie",
        "cities": ["Poznań", "Kalisz", "Konin", "Leszno", "Gniezno"],
        "pl": "Uniwersytet im. Adama Mickiewicza",
        "en": "Adam Mickiewicz University"
    },
    {
        "reg": "Zachodniopomorskie",
        "cities": ["Szczecin", "Koszalin"],
        "pl": "Zachodniopomorski Uniwersytet Technologiczny",
        "en": "West Pomeranian University of Technology"
    }
]


# ===========================
# INITIALIZATION
# ===========================

# Ensure upload directories exist
os.makedirs(Config.UNI_IMG_DIR, exist_ok=True)

# Initialize Google Gemini AI client (if API key provided)
client_ai = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None

# Initialize FastAPI application
app = FastAPI(
    title="Colloq PRO - Educational Platform API",
    version="3.1.0",
    description="REST API for managing university hierarchies, notes, and AI-powered study assistance"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (images, scans) as static content
app.mount("/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")


# ===========================
# DATABASE SEEDING
# ===========================

def seed_database(db: Session) -> None:
    """
    Populate empty database with initial data.

    Creates:
    - Universities for each region/city combination
    - Sample field of study (Computer Science)
    - Sample subject (Programming Basics) for each university

    This ensures the app isn't empty on first launch.

    Args:
        db: SQLAlchemy database session
    """
    if db.query(models.University).count() > 0:
        print("⏭️  Database already seeded, skipping...")
        return

    print("🌱 Seeding database with Polish universities...")

    for item in SEED_DATA:
        for city in item["cities"]:
            # Create university entry
            uni = models.University(
                name=f"{item['pl']} ({city})",
                name_pl=f"{item['pl']} w {city}",
                name_en=f"{item['en']} in {city}",
                city=city,
                region=item["reg"],
                type="Publiczna",
                image_url="https://images.unsplash.com/photo-1523050853064-8bf1952e690b?w=800"
            )
            db.add(uni)
            db.commit()  # Commit to get university ID

            # Create sample field of study
            field = models.FieldOfStudy(
                name="Informatyka",
                degree_level="Inżynierskie",
                university_id=uni.id
            )
            db.add(field)
            db.commit()  # Commit to get field ID

            # Create sample subject
            subject = models.Subject(
                name="Podstawy Programowania",
                semester=1,
                field_of_study_id=field.id
            )
            db.add(subject)

    db.commit()
    print("✅ Database seeded successfully with universities, fields, and subjects.")


def create_admin_user(db: Session) -> None:
    """
    Create default admin account if it doesn't exist.

    The admin user:
    - Has full moderation privileges (is_admin=True)
    - Is pre-verified (is_verified=True)
    - Is assigned to the first university in database

    Args:
        db: SQLAlchemy database session
    """
    if db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first():
        print("⏭️  Admin account already exists, skipping...")
        return

    # Assign admin to first university
    uni = db.query(models.University).first()
    if not uni:
        print("❌ Cannot create admin: no universities in database")
        return

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
    """
    Application startup hook.

    Executed once when FastAPI starts. Performs:
    1. Database table creation (if not exist)
    2. Initial data seeding
    3. Admin account creation
    """
    print("🔧 Initializing Colloq PRO...")

    # Create database tables (idempotent - won't recreate existing tables)
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
# SERVICES
# ===========================

class AuthService:
    """Service layer for authentication operations."""

    @staticmethod
    async def verify_turnstile(token: str) -> None:
        """
        Verify Cloudflare Turnstile CAPTCHA token.

        In development mode (secret key starts with '1x0000'), verification is skipped.
        In production, makes API call to Cloudflare to validate token.

        Args:
            token: Turnstile response token from frontend

        Raises:
            HTTPException 400: If CAPTCHA verification fails
        """
        # Skip verification in development mode
        if Config.TURNSTILE_SECRET_KEY.startswith("1x0000"):
            print("⚠️  Using dummy Turnstile verification (development mode)")
            return

        # Verify with Cloudflare API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": Config.TURNSTILE_SECRET_KEY,
                    "response": token
                },
                timeout=5.0
            )
            result = response.json()

            if not result.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CAPTCHA verification failed. Please try again."
                )


class AIService:
    """Service layer for Google Gemini AI integration."""

    @staticmethod
    async def generate_response(message: str, context: Optional[str] = None) -> str:
        """
        Generate AI response using Google Gemini with optional note context.

        The AI acts as a study assistant that can answer questions about
        specific notes or general study topics.

        Args:
            message: User's question or prompt
            context: Optional note content to provide as context

        Returns:
            AI-generated response text

        Raises:
            HTTPException 500: If AI service is not configured or fails
        """
        if not client_ai:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AI service is not configured. Please contact administrator."
            )

        # Build contextual prompt
        prompt = f"""Jesteś asystentem AI pomagającym studentom w nauce.
Kontekst notatki: {context or 'Brak kontekstu'}
Pytanie studenta: {message}

Udziel pomocnej, zwięzłej i merytorycznej odpowiedzi."""

        try:
            response = client_ai.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI communication error: {str(e)}"
            )


# ===========================
# ENDPOINTS - UNIVERSITIES & HIERARCHY
# ===========================

@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_universities(
    search: Optional[str] = None,
    db: Session = Depends(database.get_db)
) -> List[dict]:
    """
    Retrieve list of universities with optional search filter.

    Search is case-insensitive and matches across:
    - University name (Polish/English)
    - City
    - Region

    Args:
        search: Optional search query string
        db: Database session

    Returns:
        List of university objects with all fields
    """
    query = db.query(models.University)

    # Apply search filter if provided
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            models.University.name.ilike(search_pattern),
            models.University.name_pl.ilike(search_pattern),
            models.University.name_en.ilike(search_pattern),
            models.University.city.ilike(search_pattern),
            models.University.region.ilike(search_pattern)
        ))

    # Map to ensure optional fields are handled correctly
    universities = query.all()
    result = []
    for uni in universities:
        result.append({
            "id": uni.id,
            "name": uni.name,
            "name_en": uni.name_en or uni.name,
            "name_pl": uni.name_pl or uni.name,
            "city": uni.city,
            "region": uni.region,
            "type": uni.type,
            "image_url": uni.image_url
        })

    return result


@app.get("/universities/{uni_id}/fields", response_model=List[schemas.FieldOfStudyOut])
def get_fields(
    uni_id: int,
    db: Session = Depends(database.get_db)
) -> List[models.FieldOfStudy]:
    """
    Retrieve all fields of study for a specific university.

    Part of the hierarchical drill-down: University → Fields → Subjects

    Args:
        uni_id: University ID
        db: Database session

    Returns:
        List of fields of study (e.g., Computer Science, Medicine)
    """
    return db.query(models.FieldOfStudy).filter(
        models.FieldOfStudy.university_id == uni_id
    ).all()


@app.get("/fields/{field_id}/subjects", response_model=List[schemas.SubjectOut])
def get_subjects(
    field_id: int,
    db: Session = Depends(database.get_db)
) -> List[models.Subject]:
    """
    Retrieve all subjects for a specific field of study.

    Final level of hierarchical drill-down: University → Fields → Subjects

    Args:
        field_id: Field of study ID
        db: Database session

    Returns:
        List of subjects (e.g., Programming Basics, Data Structures)
    """
    return db.query(models.Subject).filter(
        models.Subject.field_of_study_id == field_id
    ).all()


# ===========================
# ENDPOINTS - AUTHENTICATION
# ===========================

@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: schemas.RegisterRequest,
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Register a new user account with CAPTCHA verification.

    Flow:
    1. Verify Turnstile CAPTCHA token
    2. Check if email already exists
    3. Hash password with bcrypt
    4. Create new user in database
    5. Auto-generate nickname from email

    Args:
        request: Registration request containing user data and CAPTCHA token
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 400: If CAPTCHA fails or email already taken
    """
    await AuthService.verify_turnstile(request.captcha_token)

    # Check for duplicate email
    existing_user = db.query(models.User).filter(
        models.User.email == request.user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Create new user with hashed password
    new_user = models.User(
        email=request.user.email,
        hashed_password=auth.get_password_hash(request.user.password),
        university_id=request.user.university_id,
        is_active=True,
        is_admin=False,
        is_verified=False,
        nickname=request.user.email.split('@')[0]  # Default nickname from email
    )

    db.add(new_user)
    db.commit()

    return {"msg": "Account created successfully. You can now log in."}


@app.post("/token", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Authenticate user and issue JWT access token.

    Uses OAuth2 password flow (username/password exchange for token).
    Note: 'username' field contains email address.

    Flow:
    1. Look up user by email
    2. Verify password hash
    3. Generate JWT with user claims (email, admin status, nickname)
    4. Return token for Authorization header

    Args:
        form_data: OAuth2 form containing username (email) and password
        db: Database session

    Returns:
        JWT access token and token type

    Raises:
        HTTPException 400: If credentials are invalid
        HTTPException 403: If account is inactive
    """
    # Find user by email (form_data.username contains email)
    user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    # Verify user exists and password is correct
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact support."
        )

    # Generate JWT with user claims
    access_token = auth.create_access_token(
        data={
            "sub": user.email,  # Subject: unique user identifier
            "is_admin": user.is_admin,
            "nick": user.nickname
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ===========================
# ENDPOINTS - USER PROFILE
# ===========================

@app.put("/users/me")
def update_profile(
    nickname: str = Body(None, embed=True),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Update current user's profile information.

    Currently supports updating nickname only.
    Can be extended to support other fields (avatar, bio, etc.).

    Args:
        nickname: New nickname (optional)
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        Success message
    """
    if nickname:
        current_user.nickname = nickname

    db.commit()
    return {"msg": "Profile updated successfully."}


# ===========================
# ENDPOINTS - NOTES
# ===========================

@app.post("/notes", status_code=status.HTTP_201_CREATED)
async def create_note(
    title: str = Form(...),
    content: str = Form(...),
    university_id: int = Form(...),
    subject_id: int = Form(...),
    video_url: Optional[str] = Form(None),
    link_url: Optional[str] = Form(None),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Create a new note with multimedia support.

    Supports:
    - Text content (required)
    - Image upload (optional, saved to /uploads)
    - Video URL (optional, embedded link)
    - Reference link (optional, external resource)

    Flow:
    1. Accept multipart form data
    2. Save uploaded image to disk (if provided)
    3. Create note in database (status: pending approval)
    4. Auto-verify user on first note submission

    Args:
        title: Note title
        content: Note text content (markdown supported)
        university_id: University ID
        subject_id: Subject ID (hierarchical link)
        video_url: Optional YouTube/Vimeo URL
        link_url: Optional external reference link
        image: Optional image file upload
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        Success message
    """
    image_path = None

    # Handle image upload if provided
    if image:
        file_location = os.path.join(Config.UPLOAD_DIR, image.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_path = f"/uploads/{image.filename}"

    # Create note entry (pending approval by default)
    new_note = models.Note(
        title=title,
        content=content,
        university_id=university_id,
        subject_id=subject_id,
        video_url=video_url,
        link_url=link_url,
        author_id=current_user.id,
        image_url=image_path,
        is_approved=False  # Requires admin approval
    )
    db.add(new_note)

    # Auto-verify user on first note submission
    if not current_user.is_verified:
        current_user.is_verified = True

    db.commit()

    return {"msg": "Note submitted successfully and is awaiting moderation."}


@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(
    university_id: Optional[int] = None,
    db: Session = Depends(database.get_db)
) -> List[models.Note]:
    """
    Retrieve approved notes with optional university filter.

    Only returns notes that have been approved by admin.
    Can be filtered by university to show campus-specific content.

    Args:
        university_id: Optional university ID filter
        db: Database session

    Returns:
        List of approved notes, ordered by newest first
    """
    query = db.query(models.Note).filter(models.Note.is_approved == True)

    # Filter by university if specified
    if university_id:
        query = query.filter(models.Note.university_id == university_id)

    return query.order_by(models.Note.created_at.desc()).all()


# ===========================
# ENDPOINTS - ADMIN MODERATION
# ===========================

@app.get("/admin/pending_notes", response_model=List[schemas.NoteOut])
def get_pending_notes(
    current_user: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(database.get_db)
) -> List[models.Note]:
    """
    Retrieve all notes pending approval (admin only).

    Args:
        current_user: Admin user from JWT
        db: Database session

    Returns:
        List of unapproved notes

    Raises:
        HTTPException 403: If user is not admin
    """
    return db.query(models.Note).filter(models.Note.is_approved == False).all()


@app.post("/admin/approve/{note_id}")
def approve_note(
    note_id: int,
    current_user: models.User = Depends(auth.get_current_active_admin),
    db: Session = Depends(database.get_db)
) -> dict:
    """
    Approve a pending note (admin only).

    Args:
        note_id: Note ID to approve
        current_user: Admin user from JWT
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 403: If user is not admin
        HTTPException 404: If note not found
    """
    note = db.query(models.Note).filter(models.Note.id == note_id).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found."
        )

    note.is_approved = True
    db.commit()

    return {"msg": "Note approved successfully."}


# ===========================
# ENDPOINTS - AI CHAT
# ===========================

@app.post("/chat")
async def chat_with_ai(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(auth.get_current_user)
) -> dict:
    """
    Context-aware AI chat for study assistance.

    The AI receives both the user's question and the content of the note
    they're currently viewing, enabling precise, contextual answers.

    Args:
        request: Chat request containing message and optional note content
        current_user: Authenticated user from JWT

    Returns:
        AI-generated response

    Raises:
        HTTPException 500: If AI service fails
    """
    response_text = await AIService.generate_response(
        message=request.message,
        context=request.note_content
    )

    return {"response": response_text}


# ===========================
# ENDPOINTS - GAMIFICATION
# ===========================

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)) -> List[dict]:
    """
    Retrieve top contributors leaderboard.

    Ranks users by number of approved notes (contributions).
    Encourages participation through gamification.

    Args:
        db: Database session

    Returns:
        Top 5 contributors with their stats
    """
    results = (
        db.query(models.User, func.count(models.Note.id).label("count"))
        .join(models.Note)
        .filter(models.Note.is_approved == True)
        .group_by(models.User)
        .order_by(func.count(models.Note.id).desc())
        .limit(Config.LEADERBOARD_LIMIT)
        .all()
    )

    return [
        {
            "name": user.nickname or user.email,
            "count": count,
            "is_verified": user.is_verified
        }
        for user, count in results
    ]


# ===========================
# HEALTH CHECK
# ===========================

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)) -> dict:
    """
    System health and status endpoint.

    Provides:
    - Application version
    - Database connectivity and record counts
    - AI service availability

    Used for monitoring and debugging.

    Args:
        db: Database session

    Returns:
        Health status information
    """
    return {
        "status": "healthy",
        "version": "3.1.0",
        "database": {
            "universities": db.query(models.University).count(),
            "users": db.query(models.User).count(),
            "notes": db.query(models.Note).count()
        },
        "ai_available": client_ai is not None
    }