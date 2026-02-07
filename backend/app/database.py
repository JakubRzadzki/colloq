# backend/app/database.py
# Database configuration with fixed credentials

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# FIX #7: Updated default credentials to match docker-compose.yml
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://colloq:colloq@db:5432/colloq"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()