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
from sqlalchemy import func, or_
from pydantic import BaseModel

from . import models, schemas, database, auth


# ===========================
# CONFIGURATION
# ===========================

class Config:
	GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
	TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA")
	ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@colloq.pl")
	ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
	UPLOAD_DIR = "uploads"
	UNI_IMG_DIR = os.path.join(UPLOAD_DIR, "universities")
	LEADERBOARD_LIMIT = 5


# PEŁNE DANE STARTOWE (Seeding) - 16 Województw i kluczowe miasta
SEED_DATA = [
	{"reg": "Dolnośląskie", "cities": ["Wrocław", "Legnica", "Jelenia Góra", "Wałbrzych"],
	 "pl": "Politechnika Wrocławska", "en": "Wroclaw University of Science and Technology"},
	{"reg": "Kujawsko-Pomorskie", "cities": ["Bydgoszcz", "Toruń", "Włocławek", "Grudziądz"],
	 "pl": "Uniwersytet Mikołaja Kopernika", "en": "Nicolaus Copernicus University"},
	{"reg": "Lubelskie", "cities": ["Lublin", "Zamość", "Biała Podlaska", "Chełm"],
	 "pl": "Uniwersytet Marii Curie-Skłodowskiej", "en": "Maria Curie-Sklodowska University"},
	{"reg": "Lubuskie", "cities": ["Zielona Góra", "Gorzów Wielkopolski"], "pl": "Uniwersytet Zielonogórski",
	 "en": "University of Zielona Góra"},
	{"reg": "Łódzkie", "cities": ["Łódź", "Piotrków Trybunalski", "Skierniewice"], "pl": "Politechnika Łódzka",
	 "en": "Lodz University of Technology"},
	{"reg": "Małopolskie", "cities": ["Kraków", "Tarnów", "Nowy Sącz", "Nowy Targ"], "pl": "Uniwersytet Jagielloński",
	 "en": "Jagiellonian University"},
	{"reg": "Mazowieckie", "cities": ["Warszawa", "Radom", "Płock", "Siedlce", "Ciechanów"],
	 "pl": "Uniwersytet Warszawski", "en": "University of Warsaw"},
	{"reg": "Opolskie", "cities": ["Opole", "Kędzierzyn-Koźle"], "pl": "Uniwersytet Opolski",
	 "en": "University of Opole"},
	{"reg": "Podkarpackie", "cities": ["Rzeszów", "Przemyśl", "Krosno", "Tarnobrzeg"], "pl": "Politechnika Rzeszowska",
	 "en": "Rzeszow University of Technology"},
	{"reg": "Podlaskie", "cities": ["Białystok", "Łomża", "Suwałki"], "pl": "Uniwersytet w Białymstoku",
	 "en": "University of Bialystok"},
	{"reg": "Pomorskie", "cities": ["Gdańsk", "Gdynia", "Słupsk"], "pl": "Politechnika Gdańska",
	 "en": "Gdansk University of Technology"},
	{"reg": "Śląskie", "cities": ["Katowice", "Gliwice", "Częstochowa", "Sosnowiec", "Bielsko-Biała"],
	 "pl": "Uniwersytet Śląski", "en": "University of Silesia"},
	{"reg": "Świętokrzyskie", "cities": ["Kielce"], "pl": "Politechnika Świętokrzyska",
	 "en": "Kielce University of Technology"},
	{"reg": "Warmińsko-Mazurskie", "cities": ["Olsztyn", "Elbląg"], "pl": "Uniwersytet Warmińsko-Mazurski",
	 "en": "University of Warmia and Mazury"},
	{"reg": "Wielkopolskie", "cities": ["Poznań", "Kalisz", "Konin", "Leszno", "Gniezno"],
	 "pl": "Uniwersytet im. Adama Mickiewicza", "en": "Adam Mickiewicz University"},
	{"reg": "Zachodniopomorskie", "cities": ["Szczecin", "Koszalin"],
	 "pl": "Zachodniopomorski Uniwersytet Technologiczny", "en": "West Pomeranian University of Technology"}
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
	title="Colloq PRO - Pełna Mapa i Baza",
	version="3.0.0"
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
# DATABASE SEEDING
# ===========================

def seed_database(db: Session):
	"""Initialize database with seed data"""
	if db.query(models.University).count() == 0:
		print("🌱 Seeding database with Polish universities...")

		for item in SEED_DATA:
			for city in item["cities"]:
				db.add(models.University(
					name=f"{item['pl']} ({city})",
					name_pl=f"{item['pl']} w {city}",
					name_en=f"{item['en']} in {city}",
					city=city,
					region=item["reg"],
					type="Publiczna",
					image_url="https://images.unsplash.com/photo-1523050853064-8bf1952e690b?w=800"
				))

		db.commit()
		print(f"✅ Database seeded with {db.query(models.University).count()} universities")


def create_admin_user(db: Session):
	"""Create admin user if doesn't exist"""
	if not db.query(models.User).filter(models.User.email == Config.ADMIN_EMAIL).first():
		uni = db.query(models.University).first()
		if uni:
			admin = models.User(
				email=Config.ADMIN_EMAIL,
				hashed_password=auth.get_password_hash(Config.ADMIN_PASS),
				university_id=uni.id,
				is_admin=True,
				nickname="Administrator",
				is_verified=True
			)
			db.add(admin)
			db.commit()
			print(f"✅ Created admin account: {Config.ADMIN_EMAIL}")


@app.on_event("startup")
def startup_event():
	"""Initialize application on startup"""
	print("🔧 Initializing Colloq PRO...")
	models.Base.metadata.create_all(bind=database.engine)

	db = database.SessionLocal()
	try:
		# Seed database with universities
		seed_database(db)

		# Create admin user
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
	"""Authentication service with Turnstile verification"""

	@staticmethod
	async def verify_turnstile(token: str):
		"""Verify Cloudflare Turnstile captcha"""
		if Config.TURNSTILE_SECRET_KEY.startswith("1x0000"):
			print("⚠️ Using dummy Turnstile verification (development mode)")
			return

		async with httpx.AsyncClient() as client:
			response = await client.post(
				"https://challenges.cloudflare.com/turnstile/v0/siteverify",
				data={"secret": Config.TURNSTILE_SECRET_KEY, "response": token},
				timeout=5.0
			)
			if not response.json().get("success"):
				raise HTTPException(status_code=400, detail="Captcha verification failed.")


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
				status_code=500,
				detail=f"Błąd komunikacji z AI: {str(e)}"
			)


# ===========================
# ENDPOINTS - UNIVERSITIES
# ===========================

@app.get("/universities", response_model=List[schemas.UniversityOut])
def get_universities(
		search: Optional[str] = None,
		db: Session = Depends(database.get_db)
):
	"""Return list of all universities with optional search"""
	query = db.query(models.University)

	if search:
		query = query.filter(or_(
			models.University.name.ilike(f"%{search}%"),
			models.University.name_pl.ilike(f"%{search}%"),
			models.University.name_en.ilike(f"%{search}%"),
			models.University.city.ilike(f"%{search}%"),
			models.University.region.ilike(f"%{search}%")
		))

	universities = query.all()

	# Ensure all required fields are present
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


# ===========================
# HEALTH CHECK
# ===========================

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
	"""Health check endpoint"""
	uni_count = db.query(models.University).count()
	user_count = db.query(models.User).count()
	note_count = db.query(models.Note).count()

	return {
		"status": "healthy",
		"version": "3.0.0",
		"database": {
			"universities": uni_count,
			"users": user_count,
			"notes": note_count
		},
		"ai_available": client_ai is not None
	}