<p align="center">
  <img src="https://img.shields.io/badge/COLLOQ-Student%20Note%E2%80%93Sharing%20Platform-6366f1?style=for-the-badge&labelColor=0f172a" alt="Colloq" />
</p>

<p align="center">
  <strong>A modern platform for Polish students to explore universities, share notes, and collaborate.</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api">API</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
</p>

---

## 📖 Overview

**Colloq** is a full-stack student note-sharing platform focused on Polish higher education. Students browse universities by region, explore faculties and fields of study, upload and share notes with rich content, vote and favorite materials, and interact through reviews and comments. Administrators manage users and content, and approve pending submissions.

| | |
|---|---|
| 🔍 **Global Search** | Find subjects and fields across all universities instantly |
| 📚 **Rich Notes** | Upload study materials with multiple images and files |
| 🗺️ **16 Regions** | Browse universities by Polish voivodeships |
| 👍 **Community** | Vote, favorite, review, and comment on notes |
| 👤 **Profiles** | Reputation, uploads, and activity tracking |
| 🛡️ **Admin Panel** | Manage users, notes, and approve pending content |

---

## ✨ Features

### For Students

| Feature | Description |
|---------|-------------|
| **Browse by Region** | Navigate universities by all 16 Polish voivodeships |
| **Add Content** | Add universities, faculties, fields of study, and subjects |
| **Upload Notes** | Share materials with files and multiple images (Rich Notes) |
| **Interact** | Vote, favorite, write reviews, and comment (With vote duplicate prevention) |
| **Search** | Find notes and subjects across the platform |
| **Paging & Filters** | Semester filters and paginated note responses |
| **Leaderboard** | See top contributors and activity feed |

### For Administrators

| Feature | Description |
|---------|-------------|
| **Users** | View all users with stats and roles |
| **Notes** | Browse and moderate all notes |
| **Pending Items** | Approve or reject notes, universities, faculties, fields, subjects |
| **Image Requests** | Review and approve university logo change requests |

### Technical

- **Type-Safe** — End-to-end TypeScript
- **TanStack Query** — Efficient server state management
- **RESTful API** — FastAPI with auto-generated docs at `/docs`
- **i18n** — Polish and English support
- **Docker** — One-command setup

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, React Router, TanStack Query, TailwindCSS, DaisyUI |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, JWT (OAuth2) |
| **Database** | PostgreSQL 15 |
| **DevOps** | Docker, Docker Compose |

---

## ⚡ Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose  
  *Or:* Python 3.9+, Node.js 18+, PostgreSQL 14+

### Docker (Recommended)

```bash
git clone https://github.com/JakubRzadzki/colloq.git
cd colloq

# Start all services
docker-compose up -d

# First run or after dependency changes
docker-compose up -d --build
```

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |

The database seeds automatically with sample data on first startup.

### Manual Setup

<details>
<summary><b>Backend</b></summary>

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/colloq
SECRET_KEY=your-secret-key-min-32-characters
```

```bash
uvicorn app.main:app --reload
```

</details>

<details>
<summary><b>Frontend</b></summary>

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

</details>

### Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Tests use an in-memory SQLite database. Covers auth (register/login) and notes (create/vote).

---

## 📁 Project Structure

```
colloq/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── migrate.py         # Database migrations
│   │   ├── seed.py            # Initial data seeder
│   │   ├── core/
│   │   │   ├── config.py      # Settings from env
│   │   │   ├── database.py    # SQLAlchemy engine & session
│   │   │   └── security.py    # JWT, password hashing
│   │   ├── routers/           # Auth, notes, universities, users, admin
│   │   └── services/          # File manager, storage
│   ├── tests/                 # Pytest fixtures, test_auth, test_notes
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/        # Modals, Navbar, FilePreview, etc.
│   │   ├── pages/             # Home, University, Admin, Note, etc.
│   │   ├── hooks/             # useFileDownload
│   │   └── utils/             # API client, types, i18n
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔌 API

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/token` | Login (OAuth2: `username`, `password`) |
| `POST` | `/register` | Register new user |

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/universities?region=` | List universities (optional region filter) |
| `GET` | `/universities/{id}` | University details |
| `GET` | `/universities/{id}/faculties` | Faculties |
| `GET` | `/faculties/{id}/fields` | Fields of study |
| `GET` | `/fields/{id}/subjects?semester=` | Subjects (optional semester filter) |
| `GET` | `/notes?university_id=&subject_id=&search=&sort=&page=&page_size=` | Paginated notes |
| `GET` | `/notes/{id}` | Single note by ID |
| `POST` | `/notes` | Create note (auth, multipart: title, content, files, images) |
| `GET` | `/search/global?q=` | Global search |

### Admin (requires admin JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/pending_items` | Pending notes, universities, faculties, fields, subjects, image requests |
| `POST` | `/admin/approve/{type}/{id}` | Approve item |
| `DELETE` | `/admin/reject/{type}/{id}` | Reject item |

---

## 🌍 Internationalization

Supports **Polish (PL)** and **English (EN)**. Language is stored in `localStorage` and switched via the navbar.

---

## 📝 License

This project is **proprietary** — all rights reserved. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Jakub Rzadzki</b><br>
  <a href="https://github.com/JakubRzadzki">GitHub</a> •
  <a href="https://github.com/JakubRzadzki/colloq">Repository</a>
</p>

<p align="center">
  <sub>⭐ Star this repository if you find it helpful!</sub>
</p>
