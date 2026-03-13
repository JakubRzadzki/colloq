import sys
import os

# Set up to import from backend
sys.path.insert(0, os.path.abspath("."))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Register / login
client.post("/register", json={"user": {"email": "debug@example.com", "password": "testpass123", "university_id": None}})
r = client.post("/token", data={"username": "debug@example.com", "password": "testpass123"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

uni = client.post("/universities", data={"name": "Debug Uni", "city": "City", "region": "test", "country": "Poland"}, headers=headers)
uni_id = uni.json()["id"]

fac = client.post("/faculties", data={"name": "Test Faculty", "university_id": uni_id}, headers=headers)
fac_id = fac.json()["id"]

print("Creating field...")
field = client.post("/fields", json={"name": "Informatyka", "degree_level": "inżynier", "faculty_id": fac_id}, headers=headers)
print("Status:", field.status_code)
print("JSON:", field.json())
