# Run the backend locally with auto-reload.
# Requires: Python, pip install -r requirements.txt, a running PostgreSQL (e.g. docker-compose up -d db)
Set-Location $PSScriptRoot
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://colloq:colloq123@localhost:5432/colloq" }
Write-Host "Backend: http://localhost:8000 (API docs: http://localhost:8000/docs)" -ForegroundColor Green
Write-Host "Database: $env:DATABASE_URL" -ForegroundColor Gray
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
