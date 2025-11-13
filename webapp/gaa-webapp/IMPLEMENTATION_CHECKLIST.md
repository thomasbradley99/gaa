# GAA Webapp - Implementation Checklist

## 🎯 Overview
Build a simplified GAA webapp with VEO URL upload as primary method, following the jujitsu-clann structure.

---

## 📋 Phase 1: Database & Backend Foundation

### Database Setup
- [ ] Update `db/schema.sql` to add video fields:
  - [ ] `s3_key VARCHAR(500)`
  - [ ] `original_filename VARCHAR(255)`
  - [ ] `file_size BIGINT`
  - [ ] `file_type VARCHAR(50) DEFAULT 'veo'` (or 'upload')
  - [ ] `thumbnail_url VARCHAR(500)`
  - [ ] `duration INTEGER`
  - [ ] `ai_analysis JSONB`
  - [ ] `metadata JSONB`
  - [ ] `is_demo BOOLEAN DEFAULT false`
  - [ ] `uploaded_by UUID REFERENCES users(id)`
  - [ ] `status VARCHAR(50) DEFAULT 'pending'`
- [ ] Create migration file: `db/migrations/001_add_video_fields.sql`
- [ ] Run migration on local database

### Backend Structure (Vercel Serverless)
- [ ] Create `backend/api/` folder structure
- [ ] Create `backend/api/_helpers/auth.ts` (copy from jujitsu-clann)
- [ ] Create `backend/api/_helpers/env.ts` (copy from jujitsu-clann)
- [ ] Create `backend/utils/database.ts` (adapt from jujitsu-clann)
- [ ] Create `backend/utils/jwt.ts` (copy from jujitsu-clann)
- [ ] Create `backend/utils/s3.ts` (for presigned URLs if needed)
- [ ] Create `backend/vercel.json` (copy from jujitsu-clann)

### Backend Routes - Auth
- [ ] `backend/api/auth/login.ts` - POST /api/auth/login
- [ ] `backend/api/auth/signup.ts` - POST /api/auth/signup
- [ ] `backend/api/auth/me.ts` - GET /api/auth/me

### Backend Routes - Teams
- [ ] `backend/api/teams/index.ts` - GET /api/teams (list user's teams)
- [ ] `backend/api/teams/create.ts` - POST /api/teams/create
- [ ] `backend/api/teams/join.ts` - POST /api/teams/join
- [ ] `backend/api/teams/[teamId]/members.ts` - GET /api/teams/[teamId]/members

### Backend Routes - Games
- [ ] `backend/api/games/index.ts` - GET /api/games (list user's games)
- [ ] `backend/api/games/upload.ts` - POST /api/games/upload (create game with VEO URL)
- [ ] `backend/api/games/demo.ts` - GET /api/games/demo (public demo games)
- [ ] `backend/api/games/[id]/index.ts` - GET /api/games/[id] (get game with presigned URLs)
- [ ] `backend/api/games/[id]/upload-complete.ts` - POST /api/games/[id]/upload-complete (file upload only)
- [ ] `backend/api/games/[id]/metadata.ts` - POST /api/games/[id]/metadata (add events/analysis)

### Backend Routes - Health & Cron
- [ ] `backend/api/health.ts` - GET /api/health
- [ ] `backend/api/cron/retry-pending.ts` - GET /api/cron/retry-pending (scheduled)

### Backend Dependencies
- [ ] Update `backend/package.json`:
  ```json
  {
    "dependencies": {
      "@vercel/node": "^3.x",
      "@aws-sdk/client-s3": "^3.x",
      "@aws-sdk/s3-request-presigner": "^3.x",
      "bcrypt": "^6.0.0",
      "pg": "^8.16.3",
      "uuid": "^9.x"
    }
  }
  ```
- [ ] Run `npm install` in backend

---

## 📋 Phase 2: Frontend Structure

### Frontend Pages
- [ ] `frontend/src/app/page.tsx` - Landing page (already exists, keep as-is)
- [ ] `frontend/src/app/dashboard/page.tsx` - Games page with sidebar
- [ ] `frontend/src/app/games/[id]/page.tsx` - Game detail page
- [ ] `frontend/src/app/team/page.tsx` - Team details page
- [ ] `frontend/src/app/privacy/page.tsx` - Privacy policy
- [ ] `frontend/src/app/terms/page.tsx` - Terms of service

### Frontend Components - Games
- [ ] `frontend/src/components/games/VideoPlayer.tsx` - Copy from 1-clann-webapp, adapt for GAA
- [ ] `frontend/src/components/games/GameHeader.tsx` - Copy from 1-clann-webapp
- [ ] `frontend/src/components/games/EventTimeline.tsx` - Event markers on timeline
- [ ] `frontend/src/components/games/UnifiedSidebar.tsx` - Copy from 1-clann-webapp
- [ ] `frontend/src/components/games/GameCard.tsx` - Grid card component
- [ ] `frontend/src/components/games/UploadSection.tsx` - URL input + file upload

### Frontend Components - Shared
- [ ] `frontend/src/components/Sidebar.tsx` - Reusable sidebar (Games, Team, Logout)
- [ ] `frontend/src/components/demo-game/DemoGamePlayer.tsx` - Landing page demo

### Frontend Lib & Hooks
- [ ] `frontend/src/lib/api-client.ts` - Update with game/team API methods
- [ ] `frontend/src/lib/team-utils.ts` - Team color/name helpers
- [ ] `frontend/src/hooks/useOrientation.ts` - Mobile orientation detection

### Frontend Dependencies
- [ ] Update `frontend/package.json`:
  ```json
  {
    "dependencies": {
      "hls.js": "^1.6.7",
      "lucide-react": "^0.532.0"
    }
  }
  ```
- [ ] Run `npm install` in frontend

---

## 📋 Phase 3: Core Features

### Games Page (/dashboard)
- [ ] Build sidebar component (Logo, User info, Games, Team, Logout)
- [ ] Build upload section:
  - [ ] URL input field (primary - for VEO URLs)
  - [ ] Team dropdown
  - [ ] Title input
  - [ ] Description textarea
  - [ ] "Add Game" button
  - [ ] File upload option (secondary)
- [ ] Build team filter dropdown
- [ ] Build games grid:
  - [ ] Game cards with thumbnail
  - [ ] Title, team name, status badge
  - [ ] Click to navigate to game detail
- [ ] Implement filtering by team
- [ ] Implement status filtering (All, Pending, Analyzed)

### Game Detail Page (/games/[id])
- [ ] Fetch game data with presigned URLs
- [ ] Integrate VideoPlayer component
- [ ] Build game header (title, team, date, status)
- [ ] Build sidebar with events/insights
- [ ] Implement event timeline
- [ ] Implement click-to-seek functionality
- [ ] Mobile responsive layout

### Team Page (/team)
- [ ] Fetch user's team data
- [ ] Display team info (name, description, invite code)
- [ ] Display team members list
- [ ] "Create Team" if no team
- [ ] "Join by Code" if no team
- [ ] Team actions (edit, regenerate code, leave, delete)

### Landing Page Updates
- [ ] Add demo game player section
- [ ] Fetch demo games from `/api/games/demo`
- [ ] Integrate demo player component

---

## 📋 Phase 4: API Integration

### API Client Methods
- [ ] `auth.login(email, password)`
- [ ] `auth.signup(data)`
- [ ] `auth.me()`
- [ ] `teams.list()`
- [ ] `teams.create(data)`
- [ ] `teams.join(inviteCode)`
- [ ] `games.list(teamId?)`
- [ ] `games.create({ videoUrl, teamId, title, description })` - **VEO URL method**
- [ ] `games.upload({ file, teamId, title, description })` - File upload method
- [ ] `games.get(id)` - Get game with presigned URLs
- [ ] `games.getDemo()` - Get demo games
- [ ] `games.addMetadata(id, { events, analysis })`

### Error Handling
- [ ] Handle API errors gracefully
- [ ] Show user-friendly error messages
- [ ] Handle network failures
- [ ] Handle authentication errors (redirect to login)

---

## 📋 Phase 5: Video Player Integration

### Video Player Setup
- [ ] Copy `VideoPlayer.tsx` from 1-clann-webapp
- [ ] Adapt for GAA:
  - [ ] Team colors (green/white for GAA)
  - [ ] Event types (scores, points, fouls, etc.)
  - [ ] Remove football-specific features
- [ ] Add HLS.js support
- [ ] Add MP4 fallback
- [ ] Test with VEO URLs
- [ ] Test with S3 presigned URLs

### Event Timeline
- [ ] Parse events from `ai_analysis` JSONB
- [ ] Display events on timeline
- [ ] Color-code by team
- [ ] Click event to seek video
- [ ] Show event details on hover/click

---

## 📋 Phase 6: VEO URL Handling

### Backend VEO URL Processing
- [ ] Validate VEO URL format
- [ ] Store VEO URL in `video_url` field
- [ ] Set `file_type = 'veo'`
- [ ] Create game record with status 'pending'
- [ ] (Optional) Trigger processing if needed

### Frontend VEO URL Input
- [ ] URL input validation
- [ ] Detect VEO URL format
- [ ] Show helpful placeholder: "Paste VEO URL (e.g., https://veo.co/...)"
- [ ] Handle VEO URL submission
- [ ] Show success/error messages

---

## 📋 Phase 7: Testing & Polish

### Testing
- [ ] Test auth flow (signup, login, logout)
- [ ] Test team creation/joining
- [ ] Test VEO URL upload
- [ ] Test file upload (secondary)
- [ ] Test game list/filtering
- [ ] Test game detail page
- [ ] Test video player (play, pause, seek)
- [ ] Test event timeline interaction
- [ ] Test mobile responsiveness
- [ ] Test demo games on landing page

### Polish
- [ ] Add loading states
- [ ] Add error states
- [ ] Add empty states (no games, no team)
- [ ] Improve mobile UX
- [ ] Add animations/transitions
- [ ] Optimize images/thumbnails
- [ ] Add SEO meta tags

---

## 📋 Phase 8: Deployment

### Backend Deployment
- [ ] Set up Vercel project for backend
- [ ] Configure environment variables:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_EXPIRY`
  - [ ] `AWS_REGION`
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `AWS_BUCKET_NAME`
- [ ] Deploy backend: `cd backend && vercel --prod`
- [ ] Test backend endpoints

### Frontend Deployment
- [ ] Set up Vercel project for frontend
- [ ] Configure environment variable:
  - [ ] `NEXT_PUBLIC_API_URL` (backend URL)
- [ ] Deploy frontend: `cd frontend && vercel --prod`
- [ ] Test frontend

### Database Setup
- [ ] Set up production database (Vercel Postgres or external)
- [ ] Run schema migration
- [ ] Seed demo games (optional)

---

## 🚀 Quick Start Commands

### Local Development

```bash
# Terminal 1 - Backend
cd gaa/webapp/gaa-webapp/backend
npm install
npm run dev

# Terminal 2 - Frontend
cd gaa/webapp/gaa-webapp/frontend
npm install
npm run dev
```

### Database Migration

```bash
# Create database (if not exists)
createdb gaa_app

# Run schema
psql -d gaa_app -f db/schema.sql

# Run migrations
psql -d gaa_app -f db/migrations/001_add_video_fields.sql
```

---

## 📝 Key Implementation Notes

### VEO URL Priority
- **Primary**: Users paste VEO URLs (e.g., `https://veo.co/teams/123/matches/456`)
- Store in `video_url` field
- Set `file_type = 'veo'`
- Backend handles VEO URL validation/storage

### File Upload (Secondary)
- Only needed if users want to upload files directly
- Use presigned S3 URLs (like jujitsu-clann)
- Store in `s3_key` field
- Set `file_type = 'upload'`

### Game Status Flow
1. **pending** - Game created, waiting for processing
2. **processing** - Currently being analyzed
3. **analyzed** - Analysis complete, ready to view
4. **failed** - Processing failed

### Team Structure
- Users can belong to one team (like jujitsu gym)
- Team has invite code for joining
- Games are associated with teams
- Team members can view all team games

---

## ✅ Priority Order

1. **Phase 1** - Database & Backend Foundation (critical)
2. **Phase 2** - Frontend Structure (critical)
3. **Phase 3** - Core Features (Games page, Team page)
4. **Phase 4** - API Integration
5. **Phase 5** - Video Player Integration
6. **Phase 6** - VEO URL Handling
7. **Phase 7** - Testing & Polish
8. **Phase 8** - Deployment

---

**Start with Phase 1** - Get the database schema updated and backend routes set up, then move to frontend structure.

