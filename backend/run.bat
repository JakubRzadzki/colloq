@echo off
cd /d "%~dp0"
if not defined DATABASE_URL set DATABASE_URL=postgresql://colloq:colloq123@localhost:5432/colloq
echo Backend: http://localhost:8000  ^(docs: http://localhost:8000/docs^)
echo Baza: %DATABASE_URL%
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
