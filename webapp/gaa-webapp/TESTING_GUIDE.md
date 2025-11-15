# 🧪 GAA Webapp Testing Guide

## 🚀 Quick Start

### 1. Start Backend Server

**Terminal 1:**
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/backend
npm run dev
```

**Expected Output:**
```
🚀 GAA Backend server running on port 4011
📡 Environment: development
✅ Connected to PostgreSQL database
```

**Backend URL:** http://localhost:4011

---

### 2. Start Frontend Server

**Terminal 2:**
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 15.5.2
  - Local:        http://localhost:4012
  - Ready in X seconds
```

**Frontend URL:** http://localhost:4012

---

## ✅ Testing Checklist

### Step 1: Landing Page
1. Open http://localhost:4012
2. ✅ Should see landing page with ClannAI logo
3. ✅ Should see "Sign In" and "Get Started" buttons
4. ✅ Click "Get Started" → Should open signup modal

### Step 2: Create Account
1. Fill in signup form:
   - Email: `test@example.com`
   - Password: `password123`
   - Name: `Test User`
2. ✅ Click "Sign Up"
3. ✅ Should redirect to `/dashboard`
4. ✅ Should see sidebar with user info

### Step 3: Create Team
1. ✅ Should see message: "You need to create or join a team"
2. Click "Go to Team Page" (or click "Team" in sidebar)
3. ✅ Should navigate to `/team`
4. Click "Create Team"
5. Fill in:
   - Name: `Dublin GAA`
   - Description: `Test team`
6. ✅ Should create team and show team details
7. ✅ Should see invite code

### Step 4: Add Game (VEO URL)
1. Navigate back to Dashboard (`/dashboard`)
2. ✅ Should see "Add New Game" section
3. Fill in form:
   - **Team:** Select "Dublin GAA"
   - **Title:** `Dublin vs Kerry`
   - **Description:** `Championship match`
   - **Video URL:** `https://veo.co/teams/123/matches/456` (or any test URL)
4. ✅ Click "Add Game"
5. ✅ Should see success (game added)
6. ✅ Should see game card in grid below

### Step 5: View Games Grid
1. ✅ Should see game card with:
   - Title: "Dublin vs Kerry"
   - Team name: "Dublin GAA"
   - Status badge: "Pending"
   - Date
2. ✅ Click game card → Should navigate to `/games/[id]` (page may not exist yet)

### Step 6: Filter Games
1. ✅ Use team filter dropdown
2. Select "Dublin GAA"
3. ✅ Should filter games by team
4. Select "All Teams"
5. ✅ Should show all games

### Step 7: Team Page
1. Click "Team" in sidebar
2. ✅ Should see team details:
   - Team name
   - Description
   - Invite code
3. ✅ Should see team members list
4. ✅ Should see your user as admin

### Step 8: Logout
1. Click "Logout" in sidebar
2. ✅ Should redirect to landing page
3. ✅ Token should be removed

### Step 9: Login
1. Click "Sign In"
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
3. ✅ Should login and redirect to dashboard
4. ✅ Should see your games

---

## 🐛 Common Issues & Fixes

### Backend won't start
**Error:** `EADDRINUSE: address already in use :::4011`
**Fix:**
```bash
lsof -ti:4011 | xargs kill -9
```

### Frontend won't start
**Error:** `Port 4012 is already in use`
**Fix:**
```bash
lsof -ti:4012 | xargs kill -9
```

### Database connection error
**Error:** `❌ Database connection error`
**Fix:**
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Run migration: `psql -d gaa_app -f db/migrations/001_add_video_fields.sql`

### API calls failing
**Error:** `Failed to fetch` or CORS errors
**Fix:**
- Check backend is running on port 4011
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local` is `http://localhost:4011`
- Check backend CORS allows `http://localhost:4012`

### Games not showing
**Possible causes:**
- No team created yet → Create team first
- Database migration not run → Run migration
- Backend error → Check backend terminal for errors

---

## 🔍 Testing API Directly

### Test Backend Health
```bash
curl http://localhost:4011/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "environment": "development"
}
```

### Test Signup
```bash
curl -X POST http://localhost:4011/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123",
    "name": "Test User 2"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:4011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the token** from response for next requests.

### Test Get Games (with token)
```bash
curl http://localhost:4011/api/games \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Create Game (with token)
```bash
curl -X POST http://localhost:4011/api/games \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Game",
    "description": "Test description",
    "teamId": "YOUR_TEAM_ID",
    "videoUrl": "https://veo.co/teams/123/matches/456"
  }'
```

---

## 📊 What to Verify

### Backend Routes
- ✅ `POST /api/auth/register` - Creates user
- ✅ `POST /api/auth/login` - Returns token
- ✅ `GET /api/auth/me` - Returns user (with token)
- ✅ `GET /api/teams/my-teams` - Returns user's teams
- ✅ `POST /api/teams/create` - Creates team
- ✅ `POST /api/teams/join-by-code` - Joins team
- ✅ `GET /api/teams/:teamId/members` - Returns team members
- ✅ `GET /api/games` - Returns user's games
- ✅ `POST /api/games` - Creates game with VEO URL
- ✅ `GET /api/games/demo` - Returns demo games (public)
- ✅ `GET /api/games/:id` - Returns game details

### Frontend Pages
- ✅ Landing page (`/`) - Shows logo, signup/login
- ✅ Dashboard (`/dashboard`) - Shows sidebar, upload form, games grid
- ✅ Team page (`/team`) - Shows team details (may need to be built)

### Frontend Components
- ✅ Sidebar - Navigation, user info, logout
- ✅ UploadSection - Form for adding games
- ✅ GameCard - Game display in grid

---

## 🎯 Next Steps After Testing

Once basic flow works:
1. Build Team page (`/team`)
2. Build Game detail page (`/games/[id]`)
3. Add video player component
4. Add S3 integration for file uploads
5. Add demo games to landing page

---

**Happy Testing! 🚀**

