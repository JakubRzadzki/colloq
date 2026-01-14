from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os  # <--- WAŻNE: Import biblioteki systemowej
import httpx
from openai import OpenAI
from . import models, schemas, database, auth

# --- KONFIGURACJA ---
TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA"
ADMIN_EMAIL = "admin@colloq.pl"
ADMIN_PASS = "admin123"

# KONFIGURACJA OPENAI (BEZPIECZNA)
# Pobieramy klucz ze zmiennych środowiskowych (z pliku .env)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
	print("WARNING: OPENAI_API_KEY not found in environment variables!")

client = OpenAI(api_key=OPENAI_API_KEY)

os.makedirs("uploads", exist_ok=True)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Colloq API")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# --- MODELE DANYCH DLA AI ---
class ChatRequest(BaseModel):
	message: str
	note_content: Optional[str] = ""


# --- BAZA UCZELNI (PL + EN + REGION) ---
SEED_UNIVERSITIES = [
	{"pl": "Uniwersytet Warszawski", "en": "University of Warsaw", "reg": "Mazowieckie"},
	{"pl": "Politechnika Warszawska", "en": "Warsaw University of Technology", "reg": "Mazowieckie"},
	{"pl": "Szkoła Główna Handlowa", "en": "Warsaw School of Economics", "reg": "Mazowieckie"},
	{"pl": "Uniwersytet Jagielloński", "en": "Jagiellonian University", "reg": "Małopolskie"},
	{"pl": "Akademia Górniczo-Hutnicza", "en": "AGH University of Science and Technology", "reg": "Małopolskie"},
	{"pl": "Politechnika Krakowska", "en": "Cracow University of Technology", "reg": "Małopolskie"},
	{"pl": "Uniwersytet Wrocławski", "en": "University of Wrocław", "reg": "Dolnośląskie"},
	{"pl": "Politechnika Wrocławska", "en": "Wrocław University of Technology", "reg": "Dolnośląskie"},
	{"pl": "Uniwersytet Gdański", "en": "University of Gdansk", "reg": "Pomorskie"},
	{"pl": "Politechnika Gdańska", "en": "Gdansk University of Technology", "reg": "Pomorskie"},
	{"pl": "Uniwersytet Łódzki", "en": "University of Lodz", "reg": "Łódzkie"},
	{"pl": "Politechnika Łódzka", "en": "Lodz University of Technology", "reg": "Łódzkie"},
	{"pl": "Uniwersytet im. Adama Mickiewicza", "en": "Adam Mickiewicz University", "reg": "Wielkopolskie"},
	{"pl": "Politechnika Poznańska", "en": "Poznan University of Technology", "reg": "Wielkopolskie"},
	{"pl": "Uniwersytet Śląski", "en": "University of Silesia", "reg": "Śląskie"},
	{"pl": "Politechnika Śląska", "en": "Silesian University of Technology", "reg": "Śląskie"},
	{"pl": "Uniwersytet Mikołaja Kopernika", "en": "Nicolaus Copernicus University", "reg": "Kujawsko-Pomorskie"},
	{"pl": "System Admin University", "en": "System Admin University", "reg": "AdminZone"}
]


@app.on_event("startup")
def seed_data():
	db = database.SessionLocal()
	try:
		# 1. Seed Universities
		if db.query(models.University).count() < 3:
			print("Seeding Universities...")
			for u in SEED_UNIVERSITIES:
				if not db.query(models.University).filter(models.University.name_en == u["en"]).first():
					db.add(models.University(name_pl=u["pl"], name_en=u["en"], region=u["reg"]))
			db.commit()

		# 2. Create Super Admin
		user = db.query(models.User).filter(models.User.email == ADMIN_EMAIL).first()
		if not user:
			hashed_pw = auth.get_password_hash(ADMIN_PASS)
			uni = db.query(models.University).filter(models.University.region == "AdminZone").first()
			if uni:
				admin = models.User(
					email=ADMIN_EMAIL, hashed_password=hashed_pw, university_id=uni.id,
					is_admin=True, is_active=True, nickname="The Architect", is_verified=True
				)
				db.add(admin)
				db.commit()
	finally:
		db.close()


async def verify_turnstile(token: str):
	async with httpx.AsyncClient() as client:
		response = await client.post(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			data={"secret": TURNSTILE_SECRET_KEY, "response": token}
		)
		if not response.json().get("success"):
			raise HTTPException(status_code=400, detail="Captcha failed")


# --- ENDPOINTY ---

# 1. CHATBOT AI
@app.post("/chat")
async def chat_with_ai(request: ChatRequest, current_user: models.User = Depends(auth.get_current_user)):
	"""
	Endpoint, który wysyła zapytanie do ChatGPT z kontekstem notatki.
	"""
	system_prompt = (
		"Jesteś pomocnym asystentem edukacyjnym w aplikacji 'Colloq' dla studentów. "
		"Twoim zadaniem jest pomaganie w nauce na podstawie przesłanych notatek. "
		"Bądź zwięzły, konkretny i pomocny. Odpowiadaj w języku polskim."
	)

	if request.note_content:
		system_prompt += f"\n\nKONTEKST (Treść notatki studenta):\n{request.note_content}"

	try:
		completion = client.chat.completions.create(
			model="gpt-3.5-turbo",
			messages=[
				{"role": "system", "content": system_prompt},
				{"role": "user", "content": request.message}
			]
		)
		return {"response": completion.choices[0].message.content}
	except Exception as e:
		print(f"OpenAI Error: {e}")
		raise HTTPException(status_code=500, detail="Usługa AI jest chwilowo niedostępna.")


# 2. AUTORYZACJA I DANE
@app.post("/register")
async def register(user: schemas.UserCreate, captcha_token: str = Body(..., embed=True),
                   db: Session = Depends(database.get_db)):
	await verify_turnstile(captcha_token)
	if db.query(models.User).filter(models.User.email == user.email).first():
		raise HTTPException(status_code=400, detail="Email occupied")

	hashed_pw = auth.get_password_hash(user.password)
	new_user = models.User(
		email=user.email, hashed_password=hashed_pw, university_id=user.university_id,
		is_active=True, nickname=user.email.split('@')[0]
	)
	db.add(new_user)
	db.commit()
	return {"msg": "User created"}


@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
	user = db.query(models.User).filter(models.User.email == form_data.username).first()
	if not user or not auth.verify_password(form_data.password, user.hashed_password):
		raise HTTPException(status_code=400, detail="Incorrect login")

	access_token = auth.create_access_token(data={"sub": user.email, "is_admin": user.is_admin, "nick": user.nickname})
	return {"access_token": access_token, "token_type": "bearer"}


@app.get("/universities")
def get_universities(db: Session = Depends(database.get_db)):
	return db.query(models.University).all()


# 3. NOTATKI I ADMIN
@app.post("/notes")
async def create_note(
		title: str = Form(...), content: str = Form(...), university_id: int = Form(...),
		image: UploadFile = File(None), current_user: models.User = Depends(auth.get_current_user),
		db: Session = Depends(database.get_db)
):
	image_path = None
	if image:
		file_location = f"uploads/{image.filename}"
		with open(file_location, "wb+") as file_object:
			shutil.copyfileobj(image.file, file_object)
		image_path = f"/uploads/{image.filename}"

	new_note = models.Note(
		title=title, content=content, university_id=university_id,
		author_id=current_user.id, image_url=image_path, is_approved=False
	)
	db.add(new_note)
	db.commit()

	if not current_user.is_verified:
		current_user.is_verified = True
		db.commit()

	return {"msg": "Submitted"}


@app.get("/notes", response_model=List[schemas.NoteOut])
def get_notes(university_id: int = None, db: Session = Depends(database.get_db)):
	query = db.query(models.Note).filter(models.Note.is_approved == True)
	if university_id:
		query = query.filter(models.Note.university_id == university_id)
	return query.order_by(models.Note.created_at.desc()).all()


@app.get("/admin/pending_notes", response_model=List[schemas.NoteOut])
def get_pending_notes(current_user: models.User = Depends(auth.get_current_user),
                      db: Session = Depends(database.get_db)):
	if not current_user.is_admin: raise HTTPException(403, "Admin only")
	return db.query(models.Note).filter(models.Note.is_approved == False).all()


@app.post("/admin/approve/{note_id}")
def approve_note(note_id: int, current_user: models.User = Depends(auth.get_current_user),
                 db: Session = Depends(database.get_db)):
	if not current_user.is_admin: raise HTTPException(403, "Admin only")
	note = db.query(models.Note).filter(models.Note.id == note_id).first()
	if note:
		note.is_approved = True
		db.commit()
	return {"msg": "Approved"}


@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)):
	results = db.query(models.User, func.count(models.Note.id).label("count")) \
		.join(models.Note).filter(models.Note.is_approved == True) \
		.group_by(models.User).order_by(func.count(models.Note.id).desc()).limit(5).all()
	return [{"name": user.nickname or user.email, "count": count, "is_verified": user.is_verified} for user, count in
	        results]