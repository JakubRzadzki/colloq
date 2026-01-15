import os
import shutil
import httpx
import re
from typing import List, Optional
from bs4 import BeautifulSoup
from google import genai
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from . import models, schemas, database, auth

# ===========================
# CONFIGURATION AND CONSTANTS
# ===========================

class Config:
    """Central application configuration"""
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@colloq.pl")
    ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")

    # Directories
    UPLOAD_DIR = "uploads"
    UNI_IMG_DIR = os.path.join(UPLOAD_DIR, "universities")

    # Limits
    MAX_UNIVERSITIES = 120
    LEADERBOARD_LIMIT = 5
    HTTP_TIMEOUT = 15.0

# City to region mapping for SVG map
REGION_MAPPING = {
    "Warszaw": "Mazowieckie",
    "Kraków": "Małopolskie",
    "Wrocław": "Dolnośląskie",
    "Gdańsk": "Pomorskie",
    "Poznań": "Wielkopolskie",
    "Łódź": "Łódzkie",
    "Szczecin": "Zachodniopomorskie",
    "Lublin": "Lubelskie",
    "Katowic": "Śląskie",
    "Białystok": "Podlaskie",
    "Toruń": "Kujawsko-Pomorskie",
    "Bydgoszcz": "Kujawsko-Pomorskie",
    "Opole": "Opolskie",
    "Rzeszów": "Podkarpackie",
    "Kielce": "Świętokrzyskie",
    "Olsztyn": "Warmińsko-Mazurskie",
    "Zielona Góra": "Lubuskie",
    "Gliwic": "Śląskie",
    "Częstochow": "Śląskie"
}

UNIVERSITY_KEYWORDS = [
    "Uniwersytet",
    "Politechnika",
    "Akademia",
    "Wyższa Szkoła",
    "Szkoła Główna"
]

# ===========================
# INITIALIZATION
# ===========================

# Create directories
os.makedirs(Config.UNI_IMG_DIR, exist_ok=True)

# Initialize Gemini AI
client_ai = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None

# Initialize FastAPI
app = FastAPI(
    title="Colloq MVP API",
    description="Student notes system with AI and automatic university data aggregation",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=Config.UPLOAD_DIR), name="uploads")

# ===========================
# SERVICES - EXTERNAL API
# ===========================

class ImageScraperService:
    """Service for fetching university images"""

    @staticmethod
    async def scrape_google_image(query: str) -> Optional[str]:
        """Scrape Google Images and return first image URL"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        search_url = f"https://www.google.com/search?q={query}+budynek+kampus+photo&tbm=isch"

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(search_url, headers=headers, timeout=10.0)
                images = re.findall(r'\["(https://[^"]+)",\d+,\d+\]', resp.text)
                return images[0] if images else None
            except Exception as e:
                print(f"⚠️ Google Images error for '{query}': {e}")
                return None

    @staticmethod
    async def get_wiki_thumbnail(page_title: str) -> Optional[str]:
        """Fetch thumbnail from Wikipedia API"""
        async with httpx.AsyncClient() as client:
            url = "https://pl.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "titles": page_title,
                "prop": "pageimages",
                "format": "json",
                "pithumbsize": 1000
            }
            try:
                res = await client.get(url, params=params, timeout=10.0)
                pages = res.json().get("query", {}).get("pages", {})
                for p in pages.values():
                    thumb = p.get("thumbnail", {}).get("source")
                    if thumb:
                        return thumb
            except Exception as e:
                print(f"⚠️ Wikipedia API error for '{page_title}': {e}")
        return None

    @staticmethod
    async def download_and_store_image(img_url: str, uni_name: str) -> Optional[str]:
        """Download image and store locally"""
        try:
            clean_name = re.sub(r'[^a-zA-Z0-9]', '_', uni_name).lower()
            filename = f"{clean_name}.jpg"
            filepath = os.path.join(Config.UNI_IMG_DIR, filename)

            # Check if already exists
            if os.path.exists(filepath):
                return f"/uploads/universities/{filename}"

            async with httpx.AsyncClient() as client:
                resp = await client.get(img_url, timeout=Config.HTTP_TIMEOUT)
                if resp.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(resp.content)
                    return f"/uploads/universities/{filename}"
        except Exception as e:
            print(f"⚠️ Image download error for '{uni_name}': {e}")
        return None

class UniversityETLService:
    """ETL service for university data"""

    @staticmethod
    def extract_city_from_name(name: str) -> str:
        """Extract city name from university name"""
        if " w " in name:
            return name.split(" w ")[-1].strip(" ,.")
        elif " we " in name:
            return name.split(" we ")[-1].strip(" ,.")
        return "Polska"

    @staticmethod
    def determine_region(uni_name: str) -> str:
        """Determine region based on university name"""
        for city_key, region_val in REGION_MAPPING.items():
            if city_key in uni_name:
                return region_val
        return "Inne"

    @staticmethod
    def determine_type(uni_name: str) -> str:
        """Determine university type (public/private)"""
        public_keywords = ["Uniwersytet", "Politechnika", "Akademia"]
        return "Publiczna" if any(k in uni_name for k in public_keywords) else "Niepubliczna"

    @staticmethod
    async def fetch_universities_from_wikipedia() -> List[tuple]:
        """Fetch university list from Wikipedia"""
        wiki_url = "https://pl.wikipedia.org/wiki/Uczelnie_w_Polsce"
        universities = []

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(wiki_url, timeout=10.0)
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.select('div.mw-parser-output ul li a')

                for link in links:
                    name = link.get_text()
                    title = link.get('title')

                    if any(k in name for k in UNIVERSITY_KEYWORDS) and title:
                        universities.append((name, title))

            except Exception as e:
                print(f"❌ Wikipedia fetch error: {e}")

        return universities

    @staticmethod
    async def run_etl(db: Session):
        """Main ETL pipeline: Wikipedia → Scraping → Database"""
        # Check if data already exists
        if db.query(models.University).count() > 0:
            print("ℹ️ University data already exists in database.")
            return

        print("🚀 START ETL: Fetching university data...")

        universities = await UniversityETLService.fetch_universities_from_wikipedia()
        count = 0

        for name, wiki_title in universities:
            # Check for duplicates
            if db.query(models.University).filter(models.University.name == name).first():
                continue

            # 1. Fetch image from Wikipedia
            img_url = await ImageScraperService.get_wiki_thumbnail(wiki_title)

            # 2. If no Wiki image, try Google Images
            if not img_url:
                google_url = await ImageScraperService.scrape_google_image(name)
                if google_url:
                    img_url = await ImageScraperService.download_and_store_image(google_url, name)

            # 3. Extract metadata
            city = UniversityETLService.extract_city_from_name(name)
            region = UniversityETLService.determine_region(name)
            uni_type = UniversityETLService.determine_type(name)

            # 4. Save to database
            new_uni = models.University(
                name=name,
                name_pl=name,  # Polish name (same as name)
                name_en=None,  # English name can be added later
                city=city,
                region=region,
                type=uni_type,
                image_url=img_url or "https://via.placeholder.com/1000x600?text=Brak+Zdjecia"
            )
            db.add(new_uni)
            count += 1

            if count >= Config.MAX_UNIVERSITIES:
                break

        db.commit()
        print(f"✅ ETL completed: Saved {count} universities.")

# ===========================
# SERVICES - BUSINESS LOGIC
# ===========================

class AuthService:
    """Authentication service"""

    @staticmethod
    async def verify_turnstile(token: str):
        """Verify Cloudflare Turnstile"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": Config.TURNSTILE_SECRET_KEY, "response": token},
                timeout=5.0
            )
            if not response.json().get("success"):
                raise HTTPException(status_code=400, detail="Captcha verification failed.")

    @staticmethod
    def create_admin_if_not_exists(db: Session):
        """Create admin account if it doesn't exist"""
        if db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first():
            return

        uni = db.query(models.University).first()
        if not uni:
            print("⚠️ No universities in database - cannot create admin")
            return

        admin = models.User(
            email=Config.ADMIN_EMAIL,
            hashed_password=auth.get_password_hash(Config.ADMIN_PASS),
            university_id=uni.id,
            is_admin=True,
            nickname="Architect",
            is_verified=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Created admin account: {Config.ADMIN_EMAIL}")

class AIService:
    """Gemini AI integration service"""

    @staticmethod
    async def generate_response(message: str, context: Optional[str] = None) -> str:
        """Generate AI response based on question and context"""
        if not client_ai:
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Check GEMINI_API_KEY."
            )

        prompt = f"""You are an AI assistant helping students with their studies.

Note context: {context or 'No context provided'}

Student question: {message}

Provide a helpful, concise, and substantive answer."""

        try:
            response = client_ai.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Gemini AI communication error: {str(e)}"
            )

# ===========================
# STARTUP EVENT
# ===========================

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("🔧 Initializing database...")
    models.Base.metadata.create_all(bind=database.engine)

    db = database.SessionLocal()
    try:
        # Run ETL for universities
        await UniversityETLService.run_etl(db)

        # Create admin
        AuthService.create_admin_if_not_exists(db)

        print("✅ Application ready!")
    except Exception as e:
        print(f"❌ Startup error: {e}")
    finally:
        db.close()

# ===========================
# ENDPOINTS - UNIVERSITIES
# ===========================

@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_universities(db: Session = Depends(database.get_db)):
    """Return list of all universities"""
    universities = db.query(models.University).all()

    # Ensure all required fields are present
    result = []
    for uni in universities:
        result.append({
            "id": uni.id,
            "name": uni.name,
            "name_en": uni.name_en or uni.name,  # Fallback to name if name_en is None
            "name_pl": uni.name_pl or uni.name,  # Fallback to name if name_pl is None
            "city": uni.city,
            "region": uni.region,
            "type": uni.type,
            "image_url": uni.image_url
        })

    return result

# ===========================
# ENDPOINTS - AUTHENTICATION
# ===========================

@app.post("/register")
async def register(
    user: schemas.UserCreate,
    captcha_token: str = Body(..., embed=True),
    db: Session = Depends(database.get_db)
):
    """Register new user"""
    await AuthService.verify_turnstile(captcha_token)

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already taken.")

    new_user = models.User(
        email=user.email,
        hashed_password=auth.get_password_hash(user.password),
        university_id=user.university_id,
        is_active=True,
        nickname=user.email.split('@')[0]
    )
    db.add(new_user)
    db.commit()

    return {"msg": "Account created successfully."}

@app.post("/token", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """User login"""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    token = auth.create_access_token(data={
        "sub": user.email,
        "is_admin": user.is_admin,
        "nick": user.nickname
    })

    return {"access_token": token, "token_type": "bearer"}

# ===========================
# ENDPOINTS - PROFILE
# ===========================

@app.put("/users/me")
def update_profile(
    nickname: str = Body(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update user profile"""
    if nickname:
        current_user.nickname = nickname

    db.commit()
    return {"msg": "Profile updated."}

# ===========================
# ENDPOINTS - NOTES
# ===========================

@app.post("/notes")
async def create_note(
    title: str = Form(...),
    content: str = Form(...),
    university_id: int = Form(...),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Create new note"""
    image_path = None

    if image:
        file_location = os.path.join(Config.UPLOAD_DIR, image.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_path = f"/uploads/{image.filename}"

    new_note = models.Note(
        title=title,
        content=content,
        university_id=university_id,
        author_id=current_user.id,
        image_url=image_path,
        is_approved=False
    )
    db.add(new_note)

    # Verify user after first note
    if not current_user.is_verified:
        current_user.is_verified = True

    db.commit()
    return {"msg": "Note submitted and awaiting moderation."}

@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(
    university_id: int = None,
    db: Session = Depends(database.get_db)
):
    """Fetch approved notes"""
    query = db.query(models.Note).filter(models.Note.is_approved == True)

    if university_id:
        query = query.filter(models.Note.university_id == university_id)

    return query.order_by(models.Note.created_at.desc()).all()

# ===========================
# ENDPOINTS - ADMIN
# ===========================

@app.get("/admin/pending_notes", response_model=List[schemas.NoteOut])
def get_pending_notes(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Fetch notes awaiting moderation (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required.")

    return db.query(models.Note).filter(models.Note.is_approved == False).all()

@app.post("/admin/approve/{note_id}")
def approve_note(
    note_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Approve note (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required.")

    note = db.query(models.Note).filter(models.Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    note.is_approved = True
    db.commit()

    return {"msg": "Note approved."}

# ===========================
# ENDPOINTS - AI CHAT
# ===========================

@app.post("/chat")
async def chat_with_ai(
    request: schemas.ChatRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Chat with AI assistant"""
    response_text = await AIService.generate_response(
        message=request.message,
        context=request.note_content
    )

    return {"response": response_text}

# ===========================
# ENDPOINTS - LEADERBOARD
# ===========================

@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)):
    """Ranking of most active users"""
    results = db.query(
        models.User,
        func.count(models.Note.id).label("count")
    ).join(models.Note) \
     .filter(models.Note.is_approved == True) \
     .group_by(models.User) \
     .order_by(func.count(models.Note.id).desc()) \
     .limit(Config.LEADERBOARD_LIMIT) \
     .all()

    return [
        {
            "name": user.nickname or user.email,
            "count": count,
            "is_verified": user.is_verified
        }
        for user, count in results
    ]