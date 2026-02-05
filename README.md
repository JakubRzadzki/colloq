# 🎓 Colloq

<div align="center">

![Colloq Banner](https://img.shields.io/badge/Colloq-University%20Search%20Platform-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDZWMThNMTIgNkM5LjUgNiA3LjUgNyA2IDhWMjBDNy41IDE5IDkuNSAxOCAxMiAxOE0xMiA2QzE0LjUgNiAxNi41IDcgMTggOFYyMEMxNi41IDE5IDE0LjUgMTggMTIgMTgiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg==)

**A modern, full-stack platform for exploring Polish university programs and subjects**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

Colloq is a comprehensive university search platform that helps students navigate the complex landscape of Polish higher education. With a powerful global search engine, intuitive hierarchy browsing, and full internationalization support, finding your perfect study program has never been easier.

### ✨ Key Highlights

- 🔍 **Global Search** - Find any subject or field of study across all universities instantly
- 🏛️ **Hierarchical Navigation** - Browse universities → faculties → fields → subjects
- 🌍 **Bilingual Support** - Seamlessly switch between Polish and English
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations
- 🔐 **Authentication** - Secure user accounts with JWT tokens
- 📊 **Real Data** - Pre-seeded with Politechnika Krakowska syllabus

---

## 🚀 Features

### For Students

- **Instant Search**: Type any subject name and get results from all universities
- **Detailed Information**: View complete syllabi organized by semester
- **Smart Filters**: Find programs by degree level, faculty, or region
- **Responsive Design**: Perfect experience on desktop, tablet, and mobile

### For Administrators

- **Content Management**: Add and manage universities, faculties, and programs
- **Bulk Operations**: Efficiently update large datasets
- **Access Control**: Role-based permissions system

### Technical Features

- **Type-Safe**: End-to-end TypeScript for frontend reliability
- **RESTful API**: Clean, documented FastAPI backend
- **Auto-Seeding**: Database automatically populates on first run
- **Auto-Documentation**: Swagger UI at `/docs`
- **Debounced Search**: Optimized real-time search performance

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type safety and developer experience |
| **Vite** | Lightning-fast build tool |
| **React Router** | Client-side routing |
| **TailwindCSS** | Utility-first styling |
| **DaisyUI** | Pre-built component library |

### Backend

| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance Python API framework |
| **SQLAlchemy** | ORM for database interactions |
| **PostgreSQL** | Robust relational database |
| **Pydantic** | Data validation and serialization |
| **JWT** | Secure authentication tokens |

---

## ⚡ Quick Start

### Prerequisites

- **Python 3.9+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 14+** ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

### Option A: Docker Setup (Recommended) 🐳

The easiest way to get started is using Docker Compose:

```bash
# From the project root (colloq/)
docker-compose up -d
```

**First time or after changing `backend/requirements.txt`?** Rebuild the backend image so dependencies (e.g. PyJWT) are installed:

```bash
docker-compose up -d --build
```

**Useful commands:**

```bash
# Start all services (detached)
docker-compose up -d

# Start and stream logs
docker-compose up

# Rebuild and start (e.g. after editing requirements.txt)
docker-compose up -d --build

# Stop everything
docker-compose down

# View logs
docker-compose logs -f
```

**That's it!** The application will be available at:
- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**

The database will automatically seed with Politechnika Krakowska data on first startup! 🎉

### Option B: Manual Setup

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/JakubRzadzki/colloq.git
cd colloq
```

#### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
createdb colloq_db
# Or using psql:
# psql -U postgres -c "CREATE DATABASE colloq_db;"
```

Create a `.env` file in the `backend` directory:

```bash
DATABASE_URL=postgresql://postgres:password@localhost/colloq_db
SECRET_KEY=your-secret-key-change-in-production-min-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **Note**: Replace `password` with your PostgreSQL password

```bash
# Start the server
uvicorn app.main:app --reload
```

The backend will be available at **http://localhost:8000**

API documentation: **http://localhost:8000/docs**

#### 3️⃣ Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:5173**

#### 4️⃣ Database Auto-Seeding

The database automatically seeds with **Politechnika Krakowska** data on first startup! 🎉

This includes:
- 1 University (Politechnika Krakowska)
- 1 Faculty (Wydział Informatyki i Telekomunikacji)
- 1 Field of Study (Informatyka w Inżynierii Komputerowej)
- 19 Subjects across 7 semesters

The seeding happens automatically when you start the backend server for the first time. The system checks if the data already exists and only seeds if needed.

---

## 📁 Project Structure

```
colloq/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app & startup seed
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   └── auth.py              # JWT authentication
│   ├── requirements.txt
│   ├── .env                     # Environment variables
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.tsx       # Navigation with i18n
│   │   ├── pages/
│   │   │   ├── HomePage.tsx     # Landing page
│   │   │   ├── TermPage.tsx     # Global search page
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── UniversitiesPage.tsx
│   │   ├── utils/
│   │   │   └── api.ts           # API client functions
│   │   ├── translations.ts      # i18n dictionaries
│   │   ├── App.tsx              # Root component
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml           # Docker orchestration
└── README.md
```

---

## 🔌 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/search/global?q={query}` | Global search |
| `GET` | `/universities` | List all universities |
| `GET` | `/universities/{id}` | Get university details |
| `GET` | `/universities/{id}/faculties` | Get faculties |
| `GET` | `/faculties/{id}/fields` | Get fields of study |
| `GET` | `/fields/{id}/subjects` | Get subjects |
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login user |

### Protected Endpoints (Requires Authentication)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/auth/me` | Get current user | User |
| `POST` | `/universities` | Create university | Admin |

### Example: Global Search

```bash
curl -X GET "http://localhost:8000/search/global?q=informatyka"
```

**Response:**

```json
{
  "fields": [
    {
      "id": 1,
      "name": "Informatyka w Inżynierii Komputerowej",
      "degree": "I stopień",
      "faculty_name": "Wydział Informatyki i Telekomunikacji",
      "university_name": "Politechnika Krakowska",
      "university_id": 1
    }
  ],
  "subjects": [
    {
      "id": 4,
      "name": "Wstęp do Informatyki",
      "semester": 1,
      "field_name": "Informatyka w Inżynierii Komputerowej",
      "faculty_name": "Wydział Informatyki i Telekomunikacji",
      "university_name": "Politechnika Krakowska",
      "university_id": 1
    }
  ]
}
```

---

## 🌍 Internationalization (i18n)

Colloq supports **Polish** and **English** with seamless switching.

### How It Works

1. **Language State**: Managed in `App.tsx` and stored in `localStorage`
2. **Translation Files**: All text in `translations.ts` with type-safe keys
3. **No Hardcoded Strings**: Every UI text uses translation keys
4. **Instant Switching**: No page reload required

### Adding New Languages

1. Add language to `Language` type in `translations.ts`:
   ```typescript
   export type Language = 'en' | 'pl' | 'es'; // Added Spanish
   ```

2. Add translations to the dictionary:
   ```typescript
   export const translations: Record<Language, Translations> = {
     en: { /* ... */ },
     pl: { /* ... */ },
     es: { 
       home: 'Inicio',
       login: 'Iniciar sesión',
       register: 'Registrarse',
       // ... other keys
     }
   };
   ```

3. Update the language switcher in `Navbar.tsx` to include the new option

---

## 🔒 Authentication

### Registration

```typescript
const response = await fetch('http://localhost:8000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'securepassword123'
  })
});
```

### Login

```typescript
const response = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123'
  })
});

const { access_token, user } = await response.json();
localStorage.setItem('token', access_token);
```

### Protected Requests

```typescript
const response = await fetch('http://localhost:8000/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## 🎨 UI Components

### Search Input

```tsx
<input
  type="text"
  placeholder={t.searchPlaceholder}
  className="input input-bordered input-lg w-full"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
```

### Result Card

```tsx
<div className="card bg-white/70 backdrop-blur-md shadow-xl">
  <div className="card-body">
    <h3 className="card-title">{subject.name}</h3>
    <div className="badge badge-primary">
      Semester {subject.semester}
    </div>
  </div>
</div>
```

### Language Switcher

```tsx
<div className="btn-group">
  <button className={`btn ${lang === 'pl' ? 'btn-active' : ''}`}>
    PL
  </button>
  <button className={`btn ${lang === 'en' ? 'btn-active' : ''}`}>
    EN
  </button>
</div>
```

---

## 🧪 Development

### Backend Development

```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Format code
black app/
isort app/

# Type checking
mypy app/
```

### Frontend Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type checking
npm run type-check
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Reset everything (including database)
docker-compose down -v
docker-compose up -d --build
```

---

## 📦 Production Deployment

### Using Docker (Recommended)

The project includes production-ready Dockerfiles and docker-compose configuration. Simply adjust the environment variables for your production environment:

**docker-compose.yml** (Production)
```yaml
version: '3.8'
services:
  db:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Use strong password
      
  backend:
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/colloq_db
      SECRET_KEY: ${SECRET_KEY}  # Use strong 32+ character key
      CORS_ORIGINS: https://your-domain.com
      
  frontend:
    environment:
      VITE_API_BASE_URL: https://api.your-domain.com
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:pass@host:5432/colloq_db
SECRET_KEY=your-production-secret-key-minimum-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=https://your-frontend-domain.com
```

> **Security Note**: When using Docker Compose, environment variables are set in `docker-compose.yml` and you don't need a separate `.env` file. The `.env` file is only needed for manual setup.

**Frontend (.env)**
```env
VITE_API_BASE_URL=https://api.your-domain.com
```

### Manual Deployment

**Backend:**
- Use a production WSGI server like Gunicorn with Uvicorn workers
- Set up HTTPS with reverse proxy (Nginx/Caddy)
- Use managed PostgreSQL service (AWS RDS, DigitalOcean, etc.)

**Frontend:**
- Build with `npm run build`
- Deploy to Vercel, Netlify, or any static hosting
- Configure environment variables in hosting platform

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Jakub Rzadzki**

- GitHub: [@JakubRzadzki](https://github.com/JakubRzadzki)
- Project Link: [https://github.com/JakubRzadzki/colloq](https://github.com/JakubRzadzki/colloq)

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - JavaScript library for building UIs
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [DaisyUI](https://daisyui.com/) - Component library for Tailwind
- [Politechnika Krakowska](https://www.pk.edu.pl/) - Sample data source

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by Jakub Rzadzki

</div>