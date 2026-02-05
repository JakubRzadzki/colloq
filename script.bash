#!/bin/bash
# Colloq Refactor - File Copy Script
set -e

echo "🚀 Starting Colloq Refactor Installation..."
echo ""

# Create backup
echo "📦 Creating backup..."
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BACKUP_BRANCH"
git add -A
git commit -m "Backup before glassmorphism refactor" || true
git checkout -b feature/glassmorphism-refactor

echo "✅ Backup created at branch: $BACKUP_BRANCH"
echo ""

# Frontend files
echo "📝 Copying frontend files..."

# Ensure directories exist
mkdir -p frontend/src/utils
mkdir -p frontend/src/components
mkdir -p frontend/src/pages

# Copy files (assumes downloaded files are in current directory)
cp frontend_api.ts frontend/src/utils/api.ts
echo "  ✅ api.ts"

cp frontend_Navbar.tsx frontend/src/components/Navbar.tsx
echo "  ✅ Navbar.tsx"

cp frontend_HomePage.tsx frontend/src/pages/HomePage.tsx
echo "  ✅ HomePage.tsx"

cp frontend_AdminPage.tsx frontend/src/pages/AdminPage.tsx
echo "  ✅ AdminPage.tsx"

cp frontend_index.css frontend/src/index.css
echo "  ✅ index.css"

cp frontend_tailwind.config.js frontend/tailwind.config.js
echo "  ✅ tailwind.config.js"

# Backend files
echo ""
echo "📝 Copying backend files..."

# Ensure directories exist
mkdir -p backend/app

# Combine main.py parts
cat backend_main_part1.py backend_main_part2.py > backend/app/main.py
echo "  ✅ main.py (combined)"

cp backend_database.py backend/app/database.py
echo "  ✅ database.py"

# Configuration files
echo ""
echo "📝 Copying configuration files..."

cp docker-compose.yml ./docker-compose.yml
echo "  ✅ docker-compose.yml"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << 'EOF'
SECRET_KEY=your-super-secret-key-change-this-in-production
DATABASE_URL=postgresql://colloq:colloq@db:5432/colloq
VITE_API_URL=http://localhost:8000
EOF
    echo "  ✅ .env (created)"
else
    echo "  ⚠️  .env (already exists, skipped)"
fi

# Create upload directories
echo ""
echo "📁 Creating upload directories..."
mkdir -p backend/uploads/avatars
mkdir -p backend/uploads/notes
mkdir -p backend/uploads/universities
echo "  ✅ Upload directories created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Install dependencies:"
echo "   cd frontend && npm install"
echo "   cd ../backend && pip install -r requirements.txt"
echo ""
echo "2. Start the application:"
echo "   docker-compose up --build"
echo ""
echo "3. Access the app:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
echo "🔄 To rollback:"
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo "📖 For detailed instructions, see INSTALLATION_GUIDE.md"
echo ""