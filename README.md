# GAA Webapp - Complete Application

Full-stack GAA (Gaelic Athletic Association) video analysis platform with landing page and authentication.

## 🏗️ Structure

```
gaa-webapp/
├── frontend/          # Next.js 15 frontend
│   ├── src/
│   │   ├── app/      # Pages (landing page)
│   │   └── lib/      # API client
│   └── package.json
│
├── backend/           # Express.js backend (Vercel serverless)
│   ├── routes/       # API routes (auth, teams, games)
│   ├── middleware/   # Auth middleware
│   ├── utils/        # Database, JWT helpers
│   ├── server.js     # Express server
│   └── vercel.json   # Vercel configuration
│
└── db/               # Database schema
    └── schema.sql
```

## 🚀 Quick Start

### 1. Setup Database

```bash
# Create database
createdb gaa_app

# Run schema
psql -d gaa_app -f db/schema.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/gaa_app
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=7d
PORT=3005
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF

# Run locally
npm run dev

# Or test Vercel locally
npm run vercel:dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3005
EOF

# Run development server
npm run dev
```

Visit: http://localhost:3000

## 📦 Deployment to Vercel

### Backend Deployment

1. **Connect to Vercel:**
   ```bash
   cd backend
   npx vercel
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   - `DATABASE_URL` - Your PostgreSQL connection string (Vercel Postgres or external)
   - `JWT_SECRET` - Random secret key
   - `JWT_EXPIRY` - Token expiry (default: 7d)
   - `CORS_ORIGIN` - Your frontend URL

3. **Deploy:**
   ```bash
   npx vercel --prod
   ```

### Frontend Deployment

1. **Connect to Vercel:**
   ```bash
   cd frontend
   npx vercel
   ```

2. **Set Environment Variables:**
   - `NEXT_PUBLIC_API_URL` - Your backend API URL (from Vercel deployment)

3. **Deploy:**
   ```bash
   npx vercel --prod
   ```

## 🎨 Features

### Landing Page
- ✅ Full-screen video background
- ✅ Three-step feature cards
- ✅ Typing animation for features
- ✅ Modal-based authentication
- ✅ **Interactive map of Ireland with GAA club search** (PitchFinder)
- ✅ Responsive design

### Authentication
- ✅ Sign up / Sign in
- ✅ JWT token-based auth
- ✅ Protected routes
- ✅ User profile management

### API Endpoints

**Auth:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user (protected)

**Teams:**
- `GET /api/teams/my-teams` - List user's teams (protected)
- `POST /api/teams/create` - Create team (protected)
- `POST /api/teams/join-by-code` - Join team by invite code (protected)

**Games:**
- `GET /api/games` - List games (protected)
- `POST /api/games` - Create game (protected)
- `GET /api/games/:id` - Get game (protected)

## 🔧 Tech Stack

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- React Leaflet (for interactive map)

**Backend:**
- Express.js
- PostgreSQL
- JWT authentication
- bcrypt for password hashing

**Deployment:**
- Vercel (frontend + backend serverless functions)
- Vercel Postgres or external PostgreSQL

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d
PORT=3005
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3005
```

## 🎯 Next Steps

1. **Add hero video** - Place `/public/hero-video.mp4` in frontend
2. **Add logo** - Update logo in header
3. **Build dashboard** - Create `/dashboard` page after login
4. **Add video upload** - Implement S3 presigned URLs
5. **Add game analysis** - Integrate AI processing

## 🗺️ PitchFinder Feature

The landing page includes an interactive map of Ireland showing all GAA clubs:
- **Search** by club name, pitch name, or county
- **Filter** by province, county, or club
- **Visual map** with markers for each club location
- **Club list** with clickable items to filter
- **Data** includes 2,800+ GAA clubs across Ireland

The map uses React Leaflet and displays clubs from the `gaapitchfinder_data.json` file.

## 📚 Reference

Based on:
- **1-Clann-Webapp** (Football) - Landing page design
- **Jujitsu-Clann** - Backend structure and Vercel deployment

## 🐛 Troubleshooting

**Backend won't start:**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check JWT_SECRET is set

**Frontend can't connect to backend:**
- Verify NEXT_PUBLIC_API_URL matches backend URL
- Check CORS settings in backend
- Ensure backend is running

**Auth not working:**
- Check token is stored in localStorage
- Verify JWT_SECRET matches between environments
- Check token expiry settings

