# 🚀 GAA App - Deployment Overview

**Last Updated:** November 17, 2025  
**Status:** ✅ Live in Production

---

## 📍 Live URLs

- **Frontend:** https://gaa.clannai.com
- **Backend API:** https://api-gaa.clannai.com

---

## 🏗️ Architecture

### **Monorepo Structure:**
```
gaa/webapp/gaa-webapp/
├── frontend/          # Next.js 15 app
├── backend/           # Node.js Express API
├── lambda/            
│   ├── gaa-ai-analyzer/      # AI video analysis (Docker)
│   └── gaa-veo-downloader-nov25/  # VEO video download + thumbnails
└── db/                # PostgreSQL migrations
```

---

## ☁️ Vercel Deployment

### **Projects:**

| Project Name | Type | Domain | GitHub Repo | Root Directory |
|-------------|------|--------|-------------|----------------|
| `frontend` | Next.js | gaa.clannai.com | thomasbradley99/gaa | `null` (deploys from /frontend) |
| `backend` | Node.js | api-gaa.clannai.com | thomasbradley99/gaa | `null` (deploys from /backend) |

### **How to Deploy:**

```bash
# Backend
cd ~/clann/gaa/webapp/gaa-webapp/backend
vercel --prod --yes

# Frontend
cd ~/clann/gaa/webapp/gaa-webapp/frontend
vercel --prod --yes
```

### **Vercel Environment Variables:**

**Backend Production Variables:**
- `DATABASE_URL` - PostgreSQL connection string (stored in `backend/.env` locally)
- `JWT_SECRET` - Authentication secret
- `AWS_ACCESS_KEY_ID` - AWS credentials for S3
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_BUCKET_NAME` - `clann-gaa-videos-nov25`
- `AWS_REGION` - `eu-west-1`
- `LAMBDA_API_KEY` - `gaa-lambda-secret-key-change-in-production`
- `AWS_LAMBDA_FUNCTION_NAME` - `gaa-veo-downloader-nov25`

**Frontend Production Variables:**
- `NEXT_PUBLIC_API_URL` - Points to `https://api-gaa.clannai.com`

**🔐 To view/update env vars:**
```bash
cd backend
vercel env ls production
vercel env pull .env.prod  # Download to local file (gitignored)
```

---

## 🗄️ Database

**Type:** PostgreSQL (AWS RDS)  
**Instance:** `clann-gaa-db-nov25.cfcgo2cma4or.eu-west-1.rds.amazonaws.com`  
**Database Name:** `gaa_app`  
**Username:** `gaaadmin`  
**Password:** Stored in `backend/.env` as `DATABASE_URL`

**Schema:**
- `users` - User accounts and authentication
- `teams` - GAA teams (Allen Gaels, Annaduff, St. Mary's)
- `games` - Uploaded game videos with analysis
- `events` - AI-generated game events (shots, passes, kickouts, etc.)

**Migrations:**
```bash
cd db
# Migrations are in db/migrations/
# Apply manually using psql with DATABASE_URL from backend/.env
```

---

## ☁️ AWS Resources

### **S3 Bucket:**
- **Name:** `clann-gaa-videos-nov25`
- **Region:** `eu-west-1`
- **Purpose:** Store uploaded videos and thumbnails
- **Structure:** `videos/{game_id}/video.mp4` and `videos/{game_id}/thumbnail.jpg`

### **Lambda Functions:**

**1. gaa-veo-downloader-nov25 (Active ✅)**
- **Purpose:** Download VEO videos, generate thumbnails, upload to S3
- **Deployment:** Docker container
- **Memory:** 3GB RAM + 10GB disk (/tmp)
- **Environment Variables:**
  - `DATABASE_URL` - Same as backend
  - `AWS_BUCKET_NAME` - `clann-gaa-videos-nov25`
  - `AWS_REGION` - `eu-west-1`

**2. gaa-ai-analyzer (Placeholder ❌)**
- **Status:** Not yet deployed (Docker compatibility issues)
- **Purpose:** AI video analysis using Gemini
- **Next Steps:** Fix Docker deployment

---

## 📁 Environment Files (Local Development)

### **Backend `.env` file:**
Located at: `backend/.env` (gitignored ✅)

Contains:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Auth secret
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_BUCKET_NAME` - S3 bucket name
- `AWS_REGION` - AWS region
- `LAMBDA_API_KEY` - Lambda authentication
- `AWS_LAMBDA_FUNCTION_NAME` - Lambda name
- `VERCEL_TOKEN` - Vercel API token (for CLI deployments)
- `PORT` - Local dev port (4011)

### **Frontend `.env.local` file:**
Located at: `frontend/.env.local` (gitignored ✅)

Contains:
- `NEXT_PUBLIC_API_URL` - Points to backend (localhost:4011 for dev)

---

## 🔒 Security & Secrets

**Gitignored files:**
- `backend/.env`
- `backend/.env.local`
- `backend/.env.prod`
- `backend/.env.production`
- `frontend/.env`
- `frontend/.env.local`
- `backend/.vercel/`
- `frontend/.vercel/`

**Vercel Token:**
- Stored in `backend/.env` as `VERCEL_TOKEN`
- Used for automated deployments via CLI
- Value: Check `backend/.env` file on server

**How AI Assistants Should Access Secrets:**
1. Read from `backend/.env` file (never commit to git)
2. Use `vercel env pull` to download from Vercel
3. Ask user if credentials are missing

---

## 🚀 Quick Deployment Checklist

**Deploy Backend:**
```bash
cd ~/clann/gaa/webapp/gaa-webapp/backend
git pull
vercel --prod --yes
```

**Deploy Frontend:**
```bash
cd ~/clann/gaa/webapp/gaa-webapp/frontend
git pull
vercel --prod --yes
```

**Verify Deployment:**
```bash
curl https://api-gaa.clannai.com/health
# Should return: {"status":"healthy",...}

curl -I https://gaa.clannai.com
# Should return: HTTP/2 200
```

---

## 🐛 Common Issues

**1. Thumbnails not displaying:**
- Check S3 bucket name in Vercel env vars (`AWS_BUCKET_NAME`)
- Ensure no trailing newlines in env vars
- Backend generates presigned URLs (expires in 1 hour)

**2. Database connection errors:**
- Verify `DATABASE_URL` in Vercel matches RDS instance
- Check RDS security group allows connections

**3. Lambda timeout:**
- VEO videos are 2.7GB, take ~5 mins to download
- Lambda has 15 min timeout

**4. Vercel CLI not authenticated:**
- Run `vercel whoami` to check
- Token stored in `backend/.env` as `VERCEL_TOKEN`

---

## 📊 Monitoring

**CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/gaa-veo-downloader-nov25 --region eu-west-1 --since 1h --follow
```

**Database Status:**
```bash
cd ~/clann/gaa/webapp/gaa-webapp
PGPASSWORD='[from .env]' psql -h clann-gaa-db-nov25.cfcgo2cma4or.eu-west-1.rds.amazonaws.com -U gaaadmin -d gaa_app -c "SELECT COUNT(*) FROM games;"
```

---

## 🔄 Related Apps

**Jiu Jitsu App:**
- **Repo:** `thomasbradley99/clann-jujisu`
- **Domains:** `jj.clannai.com`, `api-jj.clannai.com`
- **Separate infrastructure:** Different database, S3 bucket, Lambda functions
- **NOT connected to GAA app** - completely independent

---

## 📝 Notes for AI Assistants

When helping with this project:

1. **Check current directory:** Always `cd` to the correct path
2. **Secrets location:** Read from `backend/.env` (never show full values in logs)
3. **Database credentials:** In `backend/.env` as `DATABASE_URL`
4. **Vercel token:** In `backend/.env` as `VERCEL_TOKEN`
5. **Test before deploying:** Run locally first
6. **Separate apps:** GAA and JJ are completely separate - don't mix them!

**Current Database Summary:**
- 3 users (all test accounts)
- 3 teams (Allen Gaels, Annaduff, St. Mary's)
- 4 games with videos and thumbnails
- All games in "analyzed" status

**Next Steps (if user asks):**
- Test video upload flow
- Test mobile responsiveness
- Consider AI analyzer Lambda deployment
- Set up monitoring/alerts

