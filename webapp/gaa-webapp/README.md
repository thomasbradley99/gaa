# GAA Webapp

GAA video analysis platform with AI-powered event detection.

---

## 🚀 Quick Start

```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

**URLs:**
- Frontend: http://localhost:5012
- Backend: http://localhost:5011

---

## 📂 Project Structure

```
gaa-webapp/
├── frontend/          # Next.js frontend
├── backend/           # Express backend (Vercel serverless)
├── lambda/            # AWS Lambda functions
│   ├── veo-downloader/      # Lambda 1: Download videos from VEO
│   └── gaa-ai-analyzer/     # Lambda 2: AI analysis + event detection
├── db/                # Database schema and migrations
├── scripts/           # Utility scripts
└── docs/              # 📚 Documentation
    ├── architecture/  # System architecture & data contracts
    ├── lambda/        # Lambda system documentation
    └── archive/       # Completed implementation docs
```

---

## 📚 Documentation

**Quick Links:**
- [TODO.md](TODO.md) - What needs to be done
- [DEPLOYMENT.md](DEPLOYMENT.md) - How to deploy everything
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Detailed improvements list

**Key Docs:**
- [Data Contract](docs/architecture/DATA_CONTRACT.md) ⭐ **Important** - How data flows
- [Frontend README](frontend/README.md) - Frontend setup & deployment
- [Backend README](backend/README.md) - Backend API & deployment
- [System Architecture](docs/architecture/GAA_WEBAPP_ARCHITECTURE.md) - Complete overview

---

## 🎯 Current Status (Nov 2025)

✅ **Website functionally complete**

**Working:**
- Video upload (VEO URLs + direct upload)
- AI video analysis (first 10 minutes)
- Event detection and timeline
- Team management and auth
- Video player with autoplay mode

**Needs Improvement:**
- AI event quality (accuracy, descriptions)
- Team colors metadata (Lambda fix)
- Event timestamp verification

---

## 🏗️ Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS  
**Backend:** Node.js, Express, PostgreSQL  
**Infrastructure:** AWS (Lambda, S3, RDS), Vercel  
**AI:** Google Gemini 2.0 Flash  
**Video:** FFmpeg, HLS.js

---

## 🔧 Environment Variables

See `.env.example` files in `backend/` and `frontend/` directories.

---

## 📝 License

MIT

