# GAA Webapp Architecture & Deployment Guide

## 📋 Overview

This document outlines the complete architecture for the GAA webapp, based on two reference implementations:
- **`1-clann-webapp`** - Full-featured football analysis platform (Express.js backend)
- **`jujitsu-clann`** - Vercel-optimized serverless architecture (Vercel Functions)

**Decision: Use Vercel serverless architecture** (like `jujitsu-clann`) for easier deployment and scalability.

---

## 🏗️ Architecture Overview


### Deployment Model
- **Backend**: Vercel Serverless Functions (`backend/api/` folder structure)
- **Frontend**: Next.js 15 (App Router) deployed separately
- **Database**: PostgreSQL (Vercel Postgres or external)
- **Storage**: AWS S3 for video files
- **Processing**: AWS Lambda for video transcoding/analysis

### Key Differences from Reference Apps

| Feature | 1-clann-webapp | jujitsu-clann | GAA Webapp |
|---------|---------------|---------------|------------|
| Backend | Express.js | Vercel Functions | **Vercel Functions** ✅ |
| Routes | `/routes/*.js` | `/api/*.ts` | `/api/*.ts` |
| Auth | Middleware | Helper functions | Helper functions |
| Video Player | HLS.js + MP4 | MP4 only | **HLS.js + MP4** ✅ |
| Upload | Multipart S3 | Presigned URLs | **Presigned URLs** ✅ |

---

## 📁 Complete File Structure

```
gaa-webapp/
├── backend/
│   ├── api/                          # Vercel serverless functions
│   │   ├── _helpers/
│   │   │   ├── auth.ts               # Authentication & CORS helpers
│   │   │   └── env.ts                # Environment validation
│   │   ├── auth/
│   │   │   ├── login.ts              # POST /api/auth/login
│   │   │   ├── signup.ts             # POST /api/auth/signup
│   │   │   └── me.ts                  # GET /api/auth/me
│   │   ├── teams/
│   │   │   ├── index.ts              # GET /api/teams (list user's teams)
│   │   │   ├── create.ts             # POST /api/teams/create
│   │   │   ├── join.ts               # POST /api/teams/join
│   │   │   └── [teamId]/
│   │   │       └── members.ts        # GET /api/teams/[teamId]/members
│   │   ├── games/
│   │   │   ├── index.ts              # GET /api/games (list user's games)
│   │   │   ├── upload.ts             # POST /api/games/upload (initiate upload)
│   │   │   ├── demo.ts               # GET /api/games/demo (public demo games)
│   │   │   ├── [id]/
│   │   │   │   ├── index.ts          # GET /api/games/[id] (get game with presigned URLs)
│   │   │   │   ├── upload-complete.ts # POST /api/games/[id]/upload-complete
│   │   │   │   └── metadata.ts       # POST /api/games/[id]/metadata (add events/analysis)
│   │   │   └── [id]/
│   │   │       └── process.ts       # POST /api/games/[id]/process (trigger Lambda)
│   │   ├── health.ts                 # GET /api/health
│   │   └── cron/
│   │       └── retry-pending.ts      # GET /api/cron/retry-pending (scheduled job)
│   ├── utils/
│   │   ├── database.ts               # PostgreSQL connection & query helpers
│   │   ├── jwt.ts                    # JWT token generation/verification
│   │   ├── s3.ts                     # S3 presigned URL generation
│   │   └── video-processing.ts       # Lambda invocation helpers
│   ├── vercel.json                   # Vercel configuration (crons, headers)
│   ├── package.json                  # Backend dependencies
│   └── tsconfig.json                 # TypeScript config
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # User dashboard (game list)
│   │   │   ├── games/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Game detail page with video player
│   │   │   ├── teams/
│   │   │   │   ├── page.tsx          # Team list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Team detail
│   │   │   ├── privacy/
│   │   │   │   └── page.tsx          # Privacy policy
│   │   │   └── terms/
│   │   │       └── page.tsx          # Terms of service
│   │   ├── components/
│   │   │   ├── games/
│   │   │   │   ├── VideoPlayer.tsx   # Main video player (from 1-clann-webapp)
│   │   │   │   ├── GameHeader.tsx     # Game info header
│   │   │   │   ├── EventTimeline.tsx  # Event markers on timeline
│   │   │   │   └── UnifiedSidebar.tsx # Events/insights sidebar
│   │   │   ├── demo-game/
│   │   │   │   └── DemoGamePlayer.tsx # Landing page demo player
│   │   │   ├── pitch-finder/
│   │   │   │   └── PitchFinder.tsx   # Existing map component
│   │   │   └── VideoUpload.tsx        # Video upload component
│   │   ├── lib/
│   │   │   ├── api-client.ts          # API client (fetch wrapper)
│   │   │   └── team-utils.ts          # Team color/name helpers
│   │   ├── hooks/
│   │   │   └── useOrientation.ts      # Mobile orientation detection
│   │   └── types/
│   │       └── game.ts                # TypeScript interfaces
│   ├── public/
│   │   ├── clann-logo-white.png       # Logo
│   │   └── hero-video.mp4             # Landing page background video
│   ├── package.json                   # Frontend dependencies
│   ├── next.config.ts                 # Next.js config
│   └── tsconfig.json                  # TypeScript config
│
├── db/
│   ├── schema.sql                     # Initial schema
│   └── migrations/                    # Schema migrations
│       └── 001_add_video_fields.sql   # Add video-related columns
│
├── cmd.txt                            # Local dev commands
└── README.md                          # Setup instructions
```

---

## 🔌 API Routes Reference

**Base URL:**
- Development: `http://localhost:4011`
- Production: `https://gaa-backend.vercel.app` (or custom domain)

**Authentication:** Protected routes require `Authorization: Bearer <token>` header.

---

### Authentication Routes

#### `POST /api/auth/register` ✅ IMPLEMENTED

**Description:** Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+353123456789"  // optional
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

**Errors:**
- `400` - Missing email/password, password too short (< 6 chars)
- `409` - User already exists
- `500` - Server error

---

#### `POST /api/auth/login` ✅ IMPLEMENTED

**Description:** Login user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

**Errors:**
- `400` - Missing email/password
- `401` - Invalid credentials
- `500` - Server error

---

#### `GET /api/auth/me` ✅ IMPLEMENTED

**Description:** Get current user profile

**Auth:** Required

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `401` - Not authenticated
- `404` - User not found
- `500` - Server error

---

### Team Routes

#### `GET /api/teams/my-teams` ✅ IMPLEMENTED

**Description:** Get all teams user belongs to

**Auth:** Required

**Response (200):**
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "Dublin GAA",
      "description": "Dublin senior football team",
      "invite_code": "ABC123",
      "created_by": "uuid",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `500` - Server error

---

#### `POST /api/teams/create` ✅ IMPLEMENTED

**Description:** Create a new team

**Auth:** Required

**Request:**
```json
{
  "name": "Dublin GAA",
  "description": "Dublin senior football team"  // optional
}
```

**Response (201):**
```json
{
  "team": {
    "id": "uuid",
    "name": "Dublin GAA",
    "description": "Dublin senior football team",
    "invite_code": "ABC123",
    "created_by": "uuid",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `400` - Missing team name
- `401` - Not authenticated
- `500` - Server error

---

#### `POST /api/teams/join-by-code` ✅ IMPLEMENTED

**Description:** Join a team using invite code

**Auth:** Required

**Request:**
```json
{
  "inviteCode": "ABC123"
}
```

**Response (200):**
```json
{
  "team": {
    "id": "uuid",
    "name": "Dublin GAA",
    "description": "Dublin senior football team",
    "invite_code": "ABC123",
    "created_by": "uuid",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  "message": "Successfully joined team"
}
```

**Errors:**
- `400` - Missing invite code
- `401` - Not authenticated
- `404` - Invalid invite code
- `500` - Server error

---

#### `GET /api/teams/[teamId]/members` ❌ NOT IMPLEMENTED

**Description:** Get all members of a team

**Auth:** Required (must be team member)

**Response (200):**
```json
{
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "joined_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not a team member
- `404` - Team not found
- `500` - Server error

---

### Game Routes

#### `GET /api/games` ✅ IMPLEMENTED

**Description:** Get all games user has access to (via team membership)

**Auth:** Required

**Query Parameters:**
- `teamId` (optional) - Filter by team ID (not yet implemented in code)

**Response (200):**
```json
{
  "games": [
    {
      "id": "uuid",
      "title": "Dublin vs Kerry",
      "description": "Championship match",
      "team_id": "uuid",
      "video_url": "https://veo.co/teams/123/matches/456",
      "events": null,
      "tactical_analysis": null,
      "status": "pending",
      "created_by": "uuid",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `500` - Server error

---

#### `POST /api/games` ✅ IMPLEMENTED (Basic)

**Description:** Create a new game (basic - accepts VEO URL)

**Auth:** Required

**Request:**
```json
{
  "title": "Dublin vs Kerry",
  "description": "Championship match",
  "teamId": "uuid",
  "videoUrl": "https://veo.co/teams/123/matches/456"  // optional - VEO URL
}
```

**Response (201):**
```json
{
  "game": {
    "id": "uuid",
    "title": "Dublin vs Kerry",
    "description": "Championship match",
    "team_id": "uuid",
    "video_url": "https://veo.co/teams/123/matches/456",
    "status": "pending",
    "created_by": "uuid",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Note:** Currently accepts `videoUrl` but doesn't store it. Needs update to store in `video_url` field.

**Errors:**
- `400` - Missing title or teamId
- `401` - Not authenticated
- `403` - Not a member of this team
- `500` - Server error

---

#### `POST /api/games/upload` ❌ NOT IMPLEMENTED

**Description:** Initiate file upload (get presigned S3 URL)

**Auth:** Required

**Request:**
```json
{
  "filename": "game-video.mp4",
  "contentType": "video/mp4",
  "fileSize": 1073741824,  // bytes
  "teamId": "uuid",
  "title": "Dublin vs Kerry",
  "description": "Championship match"
}
```

**Response (200):**
```json
{
  "gameId": "uuid",
  "uploadUrl": "https://s3.amazonaws.com/clann-gaa-videos-nov25/games/uuid/video.mp4?presigned-params",
  "s3Key": "games/uuid/video.mp4",
  "expiresIn": 3600
}
```

**Flow:**
1. Frontend calls this endpoint
2. Backend creates game record with status 'pending'
3. Backend generates presigned S3 URL
4. Frontend uploads file directly to S3
5. Frontend calls `/api/games/[id]/upload-complete` when done

**Errors:**
- `400` - Missing required fields
- `401` - Not authenticated
- `403` - Not a member of this team
- `500` - Server error

---

#### `POST /api/games/[id]/upload-complete` ❌ NOT IMPLEMENTED

**Description:** Mark upload as complete, trigger processing

**Auth:** Required (must own game)

**Request:**
```json
{
  "duration": 3600  // optional - video duration in seconds
}
```

**Response (200):**
```json
{
  "game": {
    "id": "uuid",
    "status": "processing",
    "s3_key": "games/uuid/video.mp4"
  }
}
```

**Flow:**
1. Frontend calls after S3 upload completes
2. Backend updates game record
3. Backend triggers Lambda function (if configured)
4. Status changes to 'processing'

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized (not game owner)
- `404` - Game not found
- `500` - Server error

---

#### `GET /api/games/:id` ✅ IMPLEMENTED (Basic)

**Description:** Get game details

**Auth:** Required (must be team member)

**Response (200):**
```json
{
  "game": {
    "id": "uuid",
    "title": "Dublin vs Kerry",
    "description": "Championship match",
    "team_id": "uuid",
    "video_url": "https://veo.co/teams/123/matches/456",
    "events": null,
    "tactical_analysis": null,
    "status": "pending",
    "created_by": "uuid",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Note:** Currently returns basic game data. Needs update to:
- Return presigned S3 URLs for video playback (if `s3_key` exists)
- Return HLS URL (if `hls_url` exists)
- Return thumbnail URL
- Return events/analysis data

**Errors:**
- `401` - Not authenticated
- `403` - Not a team member
- `404` - Game not found
- `500` - Server error

---

#### `POST /api/games/[id]/metadata` ❌ NOT IMPLEMENTED

**Description:** Add events/analysis metadata to game

**Auth:** Required (must own game)

**Request:**
```json
{
  "events": [
    {
      "type": "goal",
      "team": "Dublin",
      "timestamp": 1234,
      "player": "John Doe",
      "description": "Goal scored"
    }
  ],
  "analysis": {
    "key_moments": [...],
    "tactical_insights": [...]
  }
}
```

**Response (200):**
```json
{
  "game": {
    "id": "uuid",
    "status": "analyzed",
    "events": [...],
    "ai_analysis": {...}
  }
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized
- `404` - Game not found
- `500` - Server error

---

#### `GET /api/games/demo` ❌ NOT IMPLEMENTED

**Description:** Get public demo games for landing page

**Auth:** None (public)

**Response (200):**
```json
{
  "games": [
    {
      "id": "uuid",
      "title": "Demo Game",
      "thumbnail_url": "https://s3.../thumbnail.jpg",
      "is_demo": true,
      "duration": 3600,
      "status": "analyzed"
    }
  ]
}
```

**Errors:**
- `500` - Server error

---

#### `POST /api/games/[id]/process` ❌ NOT IMPLEMENTED

**Description:** Trigger AWS Lambda for video processing

**Auth:** Required (must own game)

**Response (200):**
```json
{
  "message": "Processing started",
  "gameId": "uuid",
  "status": "processing"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not authorized
- `404` - Game not found
- `500` - Server error

---

### Health & Cron Routes

#### `GET /health` ✅ IMPLEMENTED

**Description:** Health check endpoint

**Auth:** None (public)

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "environment": "development"
}
```

---

#### `GET /api/cron/retry-pending` ❌ NOT IMPLEMENTED

**Description:** Retry stuck video processing jobs (scheduled cron)

**Auth:** Vercel Cron (scheduled)

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**Response (200):**
```json
{
  "retried": 2,
  "message": "Retried 2 stuck jobs"
}
```

---

## 📊 Current Implementation Status

### ✅ Implemented Routes
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/teams/my-teams` - List user's teams
- `POST /api/teams/create` - Create team
- `POST /api/teams/join-by-code` - Join team
- `GET /api/games` - List games
- `POST /api/games` - Create game (basic)
- `GET /api/games/:id` - Get game (basic)
- `GET /health` - Health check

### ❌ Missing Routes
- `GET /api/teams/[teamId]/members` - Team members list
- `POST /api/games/upload` - Initiate file upload (presigned S3 URL)
- `POST /api/games/[id]/upload-complete` - Mark upload complete
- `POST /api/games/[id]/metadata` - Add events/analysis
- `GET /api/games/demo` - Public demo games
- `POST /api/games/[id]/process` - Trigger Lambda processing
- `GET /api/cron/retry-pending` - Retry stuck jobs

### ⚠️ Needs Updates
- `POST /api/games` - Should store `videoUrl` in `video_url` field
- `GET /api/games/:id` - Should return presigned URLs, HLS URL, thumbnail, events

---

## 🏗️ Current Serverless Setup

**Status:** ✅ Serverless-ready (monolithic Express approach)

**Current Structure:**
```
backend/
├── server.js          # Single Express app (all routes)
├── routes/
│   ├── auth.js        # Auth routes
│   ├── teams.js       # Team routes
│   └── games.js       # Game routes
└── vercel.json        # Routes all /api/* to server.js
```

**Vercel Configuration:**
- All `/api/*` routes → `server.js`
- `/health` route → `server.js`
- CORS headers configured
- Works on Vercel, but uses monolithic approach

**Future Option:** Convert to individual serverless functions (`backend/api/*.ts`) for better cold start performance.

---

## 🗄️ Database Schema

### Current Schema (`db/schema.sql`)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Teams table (GAA clubs)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  invite_code VARCHAR(50) UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teams_invite_code ON teams(invite_code);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Games table (BASIC - needs video fields)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  video_url VARCHAR(500),
  events JSONB,
  tactical_analysis JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_games_team_id ON games(team_id);
CREATE INDEX idx_games_created_at ON games(created_at);
```

### Required Migration (`db/migrations/001_add_video_fields.sql`)

```sql
-- Add video-related fields to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'veo', -- 'veo', 'upload', 'trace', 'spiideo'
ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS duration INTEGER, -- Duration in seconds
ADD COLUMN IF NOT EXISTS ai_analysis JSONB, -- AI-generated analysis
ADD COLUMN IF NOT EXISTS metadata JSONB, -- Additional metadata
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS transcoded_key VARCHAR(500), -- HLS transcoded version
ADD COLUMN IF NOT EXISTS hls_url VARCHAR(500); -- HLS manifest URL

-- Update status column if needed
ALTER TABLE games
ALTER COLUMN status SET DEFAULT 'pending';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_is_demo ON games(is_demo);
CREATE INDEX IF NOT EXISTS idx_games_uploaded_by ON games(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_games_s3_key ON games(s3_key);
CREATE INDEX IF NOT EXISTS idx_games_file_type ON games(file_type);
CREATE INDEX IF NOT EXISTS idx_games_team_id_status ON games(team_id, status);
```

### Game Status Values
- `pending` - Uploaded, waiting for processing
- `processing` - Currently being analyzed
- `analyzed` - Analysis complete, ready to view
- `failed` - Processing failed

### File Types
- `veo` - VEO URL (primary method)
- `upload` - Direct file upload
- `trace` - Trace URL
- `spiideo` - Spiideo URL

---

## 📦 Dependencies

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "@vercel/node": "^3.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "@aws-sdk/client-lambda": "^3.x",
    "bcrypt": "^6.0.0",
    "pg": "^8.16.3",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/pg": "^8.x",
    "typescript": "^5.x"
  }
}
```

### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "next": "^15.5.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "hls.js": "^1.6.7",
    "lucide-react": "^0.532.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/leaflet": "^1.9.19",
    "typescript": "^5.x",
    "tailwindcss": "^4.x"
  }
}
```

---

## ⚙️ Vercel Configuration

### `backend/vercel.json`
```json
{
  "version": 2,
  "crons": [
    {
      "path": "/api/cron/retry-pending",
      "schedule": "*/5 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        },
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        }
      ]
    }
  ]
}
```

### Frontend (`frontend/vercel.json` - optional)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/gaa_app

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=clann-gaa-videos-nov25

# AWS Lambda (optional - for video processing)
AWS_LAMBDA_FUNCTION_NAME=clann-gaa-video-processor-nov25

# Server
PORT=4011
NODE_ENV=development
CORS_ORIGIN=http://localhost:4012,http://localhost:3013

# Debug
DEBUG=false
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4011
```

### Production (Vercel)

**Backend Environment Variables:**
- `DATABASE_URL` - Vercel Postgres connection string
- `JWT_SECRET` - Production JWT secret
- `JWT_EXPIRY` - Token expiry (default: 7d)
- `AWS_REGION` - eu-west-1
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_BUCKET_NAME` - clann-gaa-videos-nov25
- `NODE_ENV` - production
- `CORS_ORIGIN` - https://gaa.clannai.com,https://*.vercel.app

**Frontend Environment Variables:**
- `NEXT_PUBLIC_API_URL` - https://gaa-backend.vercel.app

---

## 🚀 Deployment Steps

### 1. Database Setup
```bash
# Create database
createdb gaa_app

# Run schema
psql -d gaa_app -f db/schema.sql

# Run migrations
psql -d gaa_app -f db/migrations/001_add_video_fields.sql
```

### 2. Backend Deployment

```bash
cd backend

# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project (first time)
vercel link
# - Set up and develop? → Yes
# - Which scope? → your-team
# - Link to existing? → No
# - Project name? → gaa-backend
# - Directory? → ./

# Set environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add AWS_REGION production
# ... (add all required vars)

# Deploy
vercel --prod
```

**Save backend URL**: `https://gaa-backend.vercel.app`

### 3. Frontend Deployment

```bash
cd frontend

# Link project
vercel link
# - Project name? → gaa-frontend
# - Directory? → ./

# Set environment variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://gaa-backend.vercel.app

# Deploy
vercel --prod
```

### 4. Custom Domains (Optional)

```bash
# Backend
cd backend
vercel domains add api-gaa.clannai.com

# Frontend
cd frontend
vercel domains add gaa.clannai.com

# Update frontend env var
vercel env rm NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api-gaa.clannai.com
```

---

## 🔄 Implementation Phases

### Phase 1: Database & Backend Foundation
- [ ] Update database schema (add video fields)
- [ ] Create Vercel serverless function structure
- [ ] Implement auth helpers (`_helpers/auth.ts`, `_helpers/env.ts`)
- [ ] Implement database utils (`utils/database.ts`, `utils/jwt.ts`)
- [ ] Implement S3 utils (`utils/s3.ts`)
- [ ] Create auth routes (`api/auth/*`)
- [ ] Create team routes (`api/teams/*`)
- [ ] Create basic game routes (`api/games/index.ts`, `api/games/[id]/index.ts`)
- [ ] Add health endpoint (`api/health.ts`)
- [ ] Configure `vercel.json`

### Phase 2: Video Upload & Processing
- [ ] Create upload route (`api/games/upload.ts`)
- [ ] Create upload-complete route (`api/games/[id]/upload-complete.ts`)
- [ ] Create metadata route (`api/games/[id]/metadata.ts`)
- [ ] Create process route (`api/games/[id]/process.ts`)
- [ ] Add cron job for retry (`api/cron/retry-pending.ts`)

### Phase 3: Frontend Video Player
- [ ] Copy `VideoPlayer.tsx` from `1-clann-webapp`
- [ ] Adapt for GAA (team colors, event types)
- [ ] Add HLS.js support
- [ ] Create `GameHeader.tsx`
- [ ] Create `EventTimeline.tsx`
- [ ] Create `UnifiedSidebar.tsx`
- [ ] Update API client (`lib/api-client.ts`)

### Phase 4: Landing Page Demo
- [ ] Create `DemoGamePlayer.tsx` component
- [ ] Add demo game seeding script
- [ ] Integrate demo player into landing page
- [ ] Add demo games endpoint (`api/games/demo.ts`)

### Phase 5: Dashboard & Game List
- [ ] Create dashboard page (`app/dashboard/page.tsx`)
- [ ] Create game list component
- [ ] Create game detail page (`app/games/[id]/page.tsx`)
- [ ] Add video upload component (`components/VideoUpload.tsx`)

---

## 📝 Key Implementation Notes

### Vercel Serverless Functions
- Each route is a separate file in `api/` folder
- Use `VercelRequest` and `VercelResponse` types
- Export default async function
- Handle CORS in each function (use helpers)

### Authentication Pattern
```typescript
import { authenticateToken } from '../_helpers/auth';

export default authenticateToken(async (req, res) => {
  const userId = req.user!.userId;
  // ... handler logic
});
```

### S3 Presigned URLs
- Generate presigned upload URLs for direct browser → S3 upload
- Generate presigned playback URLs (24-hour expiry)
- Store S3 keys in database, generate URLs on-demand

### Video Player
- Use HLS.js for adaptive streaming (if available)
- Fallback to MP4 direct playback
- Support event timeline with click-to-seek
- Mobile-optimized with auto-hide overlays

### Demo Games
- Mark games with `is_demo = true`
- Public access (no auth required)
- Use for landing page showcase

---

## 🔍 Reference Files to Copy/Adapt

### From `jujitsu-clann`:
- `backend/api/_helpers/auth.ts` → Authentication & CORS helpers
- `backend/api/_helpers/env.ts` → Environment validation
- `backend/api/auth/login.ts` → Login route pattern
- `backend/api/videos/upload.ts` → Upload route pattern
- `backend/utils/database.ts` → Database connection pattern
- `backend/utils/jwt.ts` → JWT utilities
- `backend/vercel.json` → Vercel configuration

### From `1-clann-webapp`:
- `frontend/src/components/games/VideoPlayer.tsx` → Main video player
- `frontend/src/components/games/GameHeader.tsx` → Game header
- `frontend/src/components/games/UnifiedSidebar.tsx` → Sidebar component
- `frontend/src/lib/api-client.ts` → API client pattern
- `backend/utils/s3.js` → S3 utilities (adapt to TypeScript)

---

## ✅ Testing Checklist

### Backend
- [ ] Health endpoint returns 200
- [ ] Auth endpoints work (login/signup/me)
- [ ] Team CRUD operations work
- [ ] Game upload generates presigned URL
- [ ] Game retrieval returns presigned playback URLs
- [ ] Demo games endpoint is public
- [ ] CORS headers are set correctly

### Frontend
- [ ] Landing page loads
- [ ] Demo video player works
- [ ] Auth flow works (signup/login)
- [ ] Dashboard shows user's games
- [ ] Video player loads and plays
- [ ] Event timeline works
- [ ] Mobile responsive

### Integration
- [ ] Video upload completes successfully
- [ ] Presigned URLs work (upload & playback)
- [ ] Events display correctly on timeline
- [ ] Game detail page loads all data

---

## 📚 Additional Resources

- [Vercel Serverless Functions Docs](https://vercel.com/docs/functions)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [Next.js 15 App Router](https://nextjs.org/docs/app)

---

**Last Updated**: 2025-01-13
**Status**: Planning Phase

