# Local Setup Guide

Quick guide to get the GAA webapp running on your local machine.

## Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **PostgreSQL** (check with `psql --version`)
- **Git** (check with `git --version`)

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd gaa-webapp
```

## Step 2: Setup Database

```bash
# Create database
createdb gaa_app

# Run schema
psql -d gaa_app -f webapp/gaa-webapp/db/schema.sql
```

**Alternative:** If you don't have PostgreSQL locally, you can use:
- Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`
- Vercel Postgres (free tier)
- AWS RDS

## Step 3: Backend Setup

```bash
cd webapp/gaa-webapp/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/gaa_app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d
PORT=3005
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF

# Start backend (in one terminal)
npm run dev
```

Backend will run on `http://localhost:3005`

## Step 4: Frontend Setup

```bash
# Open a new terminal
cd webapp/gaa-webapp/frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3005
EOF

# Start frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## Step 5: Add Hero Video (Optional)

Place a video file at:
```
webapp/gaa-webapp/frontend/public/hero-video.mp4
```

If you don't have one, the page will still work (just no background video).

## Step 6: Test It Out

1. Open `http://localhost:3000` in your browser
2. You should see the landing page with:
   - Video background (if you added one)
   - Three-step cards
   - Typing animation
   - PitchFinder map of Ireland
3. Click "Get started" to test signup
4. Click "Sign in" to test login

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env` is correct
- Check port 3005 isn't already in use: `lsof -i :3005`

### Frontend can't connect to backend
- Make sure backend is running on port 3005
- Check `NEXT_PUBLIC_API_URL` in `.env.local` matches backend URL
- Check browser console for CORS errors

### Database connection errors
- Verify PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or `brew services list` (Mac)
- Check database exists: `psql -l | grep gaa_app`
- Verify connection string format: `postgresql://user:password@host:port/database`

### Map not showing
- Make sure `leaflet` and `react-leaflet` are installed: `cd webapp/gaa-webapp/frontend && npm install`
- Check browser console for errors
- Verify `gaapitchfinder_data.json` exists in `webapp/gaa-webapp/frontend/src/components/pitch-finder/`

## Quick Commands Reference

```bash
# Start everything (in separate terminals)
cd webapp/gaa-webapp/backend && npm run dev    # Terminal 1
cd webapp/gaa-webapp/frontend && npm run dev    # Terminal 2

# Or use a process manager like concurrently
npm install -g concurrently
concurrently "cd webapp/gaa-webapp/backend && npm run dev" "cd webapp/gaa-webapp/frontend && npm run dev"
```

## Next Steps

- Add your hero video
- Customize colors/branding
- Build out the dashboard
- Add video upload functionality
- Deploy to Vercel

## Environment Variables Reference

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/gaa_app
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d
PORT=3005
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3005
```

