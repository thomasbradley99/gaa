# GAA Webapp - Backend API

Express.js backend deployed as Vercel serverless functions.

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

Backend runs on: **http://localhost:5011**

---

## 📁 Project Structure

```
backend/
├── server.js              # Express app entry point
├── routes/
│   ├── auth.js           # POST /api/auth/login, /signup
│   ├── games.js          # Game management & events
│   ├── teams.js          # Team management
│   └── users.js          # User management
├── middleware/
│   ├── auth.js           # JWT authentication
│   └── lambda-auth.js    # Lambda API key authentication
├── utils/
│   ├── database.js       # PostgreSQL connection pool
│   ├── s3.js            # S3 presigned URLs
│   └── jwt.js           # JWT helpers
└── vercel.json          # Vercel deployment config
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games` - List user's games
- `POST /api/games` - Create game (VEO URL or file upload)
- `GET /api/games/:id` - Get game details (with presigned URLs)
- `POST /api/games/:id/events` - Add events (Lambda only)
- `PUT /api/games/:id/events` - Update events (user edits)
- `DELETE /api/games/:id` - Delete game

### Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create team
- `POST /api/teams/join` - Join team by code
- `GET /api/teams/:id/members` - List team members

### Health
- `GET /health` - Health check

---

## 🔐 Authentication

### User Authentication (JWT)
Endpoints require `Authorization: Bearer <jwt_token>` header.

**Example:**
```bash
curl https://api-gaa.clannai.com/api/games \
  -H "Authorization: Bearer eyJhbGc..."
```

### Lambda Authentication (API Key)
Lambda endpoints use `X-API-Key` header:

```bash
curl -X POST https://api-gaa.clannai.com/api/games/:id/events \
  -H "X-API-Key: your-lambda-api-key" \
  -H "Content-Type: application/json" \
  -d '{"events": [...]}'
```

---

## 🌐 Environment Variables

Create `.env` file:

```bash
# Server
PORT=5011
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host:5432/gaa_app

# JWT Authentication
JWT_SECRET=your-super-secure-secret-key-min-32-chars
JWT_EXPIRY=7d

# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=clann-gaa-videos-nov25

# Lambda
LAMBDA_API_KEY=secure-key-for-lambda-authentication
AI_ANALYZER_FUNCTION_NAME=gaa-ai-analyzer-nov25

# AI (optional - for direct AI calls)
GEMINI_API_KEY=AIzaSy...

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5012
```

---

## 📦 Vercel Deployment

### How It Works

Vercel converts the Express app into serverless functions:
- Each route becomes a serverless function
- `vercel.json` configures routing and rewrites
- Cold starts: ~500ms, Warm: <100ms
- Each function runs independently (stateless)

### Deploy to Vercel

**First Time:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd backend
vercel
```

**Set Environment Variables:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables from `.env` (except PORT)
3. Apply to: Production, Preview, Development

**Deploy to Production:**
```bash
vercel --prod
```

### Auto-Deploy from Git

1. Connect GitHub repo to Vercel
2. Push to `main` branch → Auto-deploys to production
3. Push to other branches → Auto-deploys to preview URLs

### Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "server.js"
    }
  ]
}
```

**What this does:**
- `builds`: Tells Vercel to build `server.js` as a Node.js serverless function
- `rewrites`: Routes all `/api/*` requests to the Express app
- CORS headers: Allows cross-origin requests from frontend

---

## 🗄️ Database

### Connection Pooling

The app uses `pg` with connection pooling:

```javascript
// utils/database.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

**Why pooling?**
- Serverless functions create/destroy rapidly
- Pooling reuses connections
- Prevents exhausting database connections

### Migrations

Run migrations locally or via script:

```bash
# Run migration
psql -d $DATABASE_URL -f db/migrations/001_add_events.sql

# Or use migration script
node backend/run-migration.js
```

---

## 🔧 Local Development Tips

### Run with Live Reload
```bash
npm run dev
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:5011/health

# Login (get JWT)
curl -X POST http://localhost:5011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List games (requires JWT)
curl http://localhost:5011/api/games \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Debug Database Queries

Enable query logging:
```javascript
// In utils/database.js
pool.on('connect', () => {
  console.log('Database connected')
})
```

---

## 🐛 Common Issues

### Database Connection Fails
- Check `DATABASE_URL` is correct
- Ensure database accepts connections from your IP
- For AWS RDS: Check security group allows inbound on port 5432

### CORS Errors
- Add frontend URL to `vercel.json` CORS headers
- Check `Access-Control-Allow-Origin` in response

### Vercel Deployment Fails
```bash
# Check logs
vercel logs

# Verify environment variables
vercel env ls

# Test build locally
vercel dev
```

### Cold Start Latency
- First request after idle: ~500ms
- Solution: Use Vercel Pro for lower cold starts
- Or: Implement warming (periodic pings)

---

## 🧪 Testing

### Manual Testing

```bash
# 1. Start backend
npm run dev

# 2. Test auth
curl -X POST http://localhost:5011/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'

# 3. Test game creation
curl -X POST http://localhost:5011/api/games \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Game","video_url":"https://veo.co/..."}'
```

### Integration Testing

Run with frontend:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Visit: http://localhost:5012

---

## 📊 Performance

### Response Times
- Health check: <50ms
- Database queries: 50-200ms
- S3 presigned URL generation: <100ms
- Lambda invocation: 2-5 seconds (async)

### Optimization
- Database connection pooling
- S3 presigned URLs (avoid proxying large files)
- Async Lambda invocation (don't wait for completion)
- Caching with Vercel Edge

---

## 🔗 Related Docs

- [Main README](../README.md) - Project overview
- [Deployment Guide](../DEPLOYMENT.md) - Full deployment instructions
- [Data Contract](../docs/architecture/DATA_CONTRACT.md) - API data structures

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Game Object
```json
{
  "id": "uuid",
  "title": "Team A vs Team B",
  "team_id": "uuid",
  "team_name": "Kerry GAA",
  "status": "analyzed",
  "video_url": "https://s3-presigned-url...",
  "thumbnail_url": "https://s3-presigned-url...",
  "events": {
    "match_info": { ... },
    "events": [ ... ],
    "team_mapping": { ... }
  },
  "metadata": {
    "teams": {
      "home_team": { "name": "...", "jersey_color": "..." },
      "away_team": { "name": "...", "jersey_color": "..." }
    }
  },
  "created_at": "2025-11-19T10:00:00Z"
}
```

---

**Last Updated:** November 19, 2025  
**Status:** Production Ready

