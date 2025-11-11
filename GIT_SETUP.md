# Git Repository Setup

Your GAA webapp is now a git repository! Here's how to push it to GitHub/GitLab and pull it elsewhere.

## Current Status

✅ Git repository initialized
✅ Initial commit created
✅ All files committed

## Push to GitHub

### Option 1: Create New Repository on GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it `gaa-webapp` (or whatever you prefer)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

2. **Add remote and push:**
   ```bash
   cd /home/ubuntu/clann/gaa/webapp/map-frontend/gaa-webapp
   
   # Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR_USERNAME/gaa-webapp.git
   
   # Rename branch to main (if you prefer)
   git branch -M main
   
   # Push to GitHub
   git push -u origin main
   ```

### Option 2: Push to Existing Repository

```bash
cd /home/ubuntu/clann/gaa/webapp/map-frontend/gaa-webapp

# Add remote
git remote add origin <your-repo-url>

# Push
git push -u origin master
```

## Pull and Run Locally (On Another Machine)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/gaa-webapp.git
cd gaa-webapp

# Follow SETUP.md instructions
# 1. Setup database
createdb gaa_app
psql -d gaa_app -f db/schema.sql

# 2. Setup backend
cd backend
npm install
# Create .env file (see SETUP.md)
npm run dev

# 3. Setup frontend (in new terminal)
cd frontend
npm install
# Create .env.local file (see SETUP.md)
npm run dev
```

## Common Git Commands

```bash
# Check status
git status

# See commit history
git log --oneline

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to remote
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main
```

## Repository Structure

```
gaa-webapp/
├── .git/              # Git repository data
├── .gitignore         # Files to ignore
├── README.md          # Main documentation
├── SETUP.md           # Local setup guide
├── backend/           # Express.js backend
├── frontend/          # Next.js frontend
└── db/                # Database schema
```

## What's Committed

✅ All source code
✅ Configuration files
✅ Database schema
✅ PitchFinder data (2,800+ clubs)
✅ Documentation

## What's NOT Committed (via .gitignore)

❌ `node_modules/` - Dependencies (install with `npm install`)
❌ `.env` files - Environment variables (create locally)
❌ `.next/` - Next.js build files
❌ `.vercel/` - Vercel deployment files
❌ Log files

## Next Steps

1. Push to GitHub/GitLab
2. Share the repo URL with your team
3. Set up CI/CD (optional)
4. Deploy to Vercel (see README.md)

