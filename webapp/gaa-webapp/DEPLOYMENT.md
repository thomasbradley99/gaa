# GAA Webapp - Deployment Guide

Complete guide for deploying frontend, backend, and Lambda functions.

---

## 🎯 Quick Deploy Overview

**Frontend:** Next.js app → Vercel  
**Backend:** Express API → Vercel (serverless)  
**Lambda Functions:** AWS Lambda (Docker images)  
**Database:** AWS RDS PostgreSQL  
**Storage:** AWS S3

---

## 📖 Understanding Vercel Deployments

### What is Vercel?

Vercel is a deployment platform optimized for Next.js and serverless functions. It automatically:
- Builds your code
- Deploys to a global CDN
- Provides automatic HTTPS
- Creates preview URLs for each branch
- Handles CI/CD

### How Vercel Works

1. **You push code to GitHub**
2. **Vercel detects the push** via webhook
3. **Vercel builds your project:**
   - Frontend: `npm run build` (Next.js)
   - Backend: Converts Express routes to serverless functions
4. **Vercel deploys to edge network:**
   - Static files → CDN edge (worldwide)
   - API routes → Serverless functions (run on-demand)
5. **You get a URL:** `https://your-project-abc123.vercel.app`

### Serverless Functions

Your Express backend becomes serverless functions:

**Before (Traditional Server):**
```
[Server Running 24/7] → Express Router → Your Code
```

**After (Vercel Serverless):**
```
Request → Vercel Edge → Serverless Function (cold/warm) → Your Code → Response
```

**Benefits:**
- Only pay for execution time (not idle time)
- Auto-scales to handle traffic spikes
- Zero server management

**Trade-offs:**
- Cold starts: ~500ms first request after idle
- 10-second execution limit (Hobby), 60s (Pro)
- Stateless (no in-memory sessions)

### vercel.json Configuration

This file tells Vercel how to build and route your app:

**Frontend (`frontend/vercel.json`):**
```json
{
  "version": 2,
  "cleanUrls": true,        // /about instead of /about.html
  "trailingSlash": false    // /about not /about/
}
```

**Backend (`backend/vercel.json`):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"   // Tell Vercel: this is Node.js
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",  // Any /api/* request
      "destination": "server.js"  // → route to Express
    }
  ]
}
```

### Environment Variables

**Local (.env):**
```bash
DATABASE_URL=postgresql://localhost/gaa_app
```

**Vercel (Dashboard):**
- Go to: Project → Settings → Environment Variables
- Add same variables
- Choose scope: Production, Preview, Development

**Why 3 scopes?**
- **Production:** `your-app.vercel.app` (main branch)
- **Preview:** `your-app-git-feature.vercel.app` (feature branches)
- **Development:** `vercel dev` (local development)

### Git Integration

**Automatic Deployments:**
- Push to `main` → Production deployment (if enabled)
- Push to `feature-branch` → Preview deployment
- Pull request → Preview URL in PR comments

**Disable Auto-Deploy:**
1. Go to Vercel Dashboard → Project → Settings → Git
2. Scroll to "Ignored Build Step"
3. Change "Behavior" from "Automatic" to "Custom"
4. Enter: `echo "Skipping automatic build - manual deployment only" && exit 0`
5. This prevents deployments on git push

**Manual Deployments:**
```bash
# From repository root (required due to rootDirectory setting)
cd /Users/thomasbradley/clann-repos/gaa
vercel --prod --yes  # Deploy frontend to production

# Or from frontend directory (if rootDirectory is cleared)
cd webapp/gaa-webapp/frontend
vercel --prod --yes
```

**Note:** The frontend project has `rootDirectory: webapp/gaa-webapp/frontend` set in Vercel, so you must deploy from the repository root (`/Users/thomasbradley/clann-repos/gaa`).

---

## 1️⃣ Frontend Deployment (Vercel)

### Project Structure

The frontend is located at `webapp/gaa-webapp/frontend` from the repository root:
```
gaa/                          # Repository root
└── webapp/
    └── gaa-webapp/
        └── frontend/          # Next.js app
            ├── src/
            ├── package.json
            └── vercel.json
```

**Vercel Configuration:**
- **Root Directory:** `webapp/gaa-webapp/frontend` (set in Vercel dashboard)
- **Project Name:** `frontend`
- **Team:** `clannai`

### First Time Setup

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Link Project** (from repository root)
   ```bash
   cd /Users/thomasbradley/clann-repos/gaa
   vercel link --project frontend --yes
   ```

3. **Set Root Directory** (in Vercel dashboard)
   - Go to: Project Settings → General → Root Directory
   - Set to: `webapp/gaa-webapp/frontend`
   - Or leave empty if deploying from frontend directory

4. **Set Environment Variables** (in Vercel dashboard)
   - Go to: Project Settings → Environment Variables
   - Add:
     ```
     NEXT_PUBLIC_API_URL=https://api-gaa.clannai.com
     NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
     NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
     ```
   - Apply to: Production, Preview, Development

5. **Deploy to Production**
   ```bash
   cd /Users/thomasbradley/clann-repos/gaa
   vercel --prod --yes
   ```

### Subsequent Deployments

**Option 1: Manual Deploy (Recommended)**
```bash
# From repository root (required if rootDirectory is set)
cd /Users/thomasbradley/clann-repos/gaa
vercel --prod --yes
```

**Option 2: Auto-Deploy (if enabled)**
- Push to GitHub → Vercel auto-deploys
- Main branch → Production
- Other branches → Preview deployments

**To disable auto-deploy:**
- See "Disable Auto-Deploy" section above

### Vercel Configuration

The `frontend/vercel.json` configures:
- Clean URLs (no .html extensions)
- No trailing slashes
- Caching for favicons and images

---

## 2️⃣ Backend Deployment (Vercel)

### First Time Setup

1. **Deploy Backend**
   ```bash
   cd backend
   vercel
   ```

2. **Set Environment Variables** (in Vercel dashboard)
   - Go to: Project Settings → Environment Variables
   - Add:
     ```
     DATABASE_URL=postgresql://user:pass@host:5432/gaa_app
     JWT_SECRET=your-secure-jwt-secret
     JWT_EXPIRY=7d
     AWS_REGION=eu-west-1
     AWS_ACCESS_KEY_ID=your-aws-key
     AWS_SECRET_ACCESS_KEY=your-aws-secret
     AWS_BUCKET_NAME=clann-gaa-videos-nov25
     LAMBDA_API_KEY=your-lambda-api-key
     GEMINI_API_KEY=your-gemini-key
     ```

3. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Subsequent Deployments

**Option 1: Manual Deploy**
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/backend
vercel --prod --yes
```

**Option 2: Auto-Deploy (if enabled)**
- Push to GitHub → Vercel auto-deploys

### Vercel Configuration

The `backend/vercel.json` configures:
- Express server as serverless function
- API routes: `/api/*` and `/health`
- CORS headers for cross-origin requests

---

## 3️⃣ Lambda Deployment (AWS)

### Lambda 1: VEO Downloader

```bash
cd lambda/veo-downloader

# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/gaa_app"

# Deploy
./deploy.sh
```

**Verify Deployment:**
```bash
aws lambda get-function --function-name gaa-veo-downloader-nov25 --region eu-west-1
```

### Lambda 2: AI Analyzer (Docker)

```bash
cd lambda/gaa-ai-analyzer

# Build and deploy Docker image
./docker-deploy.sh
```

**Set Environment Variables** (via AWS Console or CLI):
```bash
aws lambda update-function-configuration \
  --function-name gaa-ai-analyzer-nov25 \
  --environment Variables="{
    GEMINI_API_KEY=your-key,
    BACKEND_API_URL=https://your-backend.vercel.app,
    LAMBDA_API_KEY=your-lambda-key,
    AWS_BUCKET_NAME=clann-gaa-videos-nov25,
    AWS_REGION=eu-west-1
  }" \
  --region eu-west-1
```

**Verify Deployment:**
```bash
# Check function exists
aws lambda get-function --function-name gaa-ai-analyzer-nov25 --region eu-west-1

# Test invocation
aws lambda invoke \
  --function-name gaa-ai-analyzer-nov25 \
  --payload '{"game_id":"test","s3_key":"videos/test/video.mp4","title":"Test"}' \
  --region eu-west-1 \
  response.json
```

---

## 4️⃣ Environment Variables Reference

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api-gaa.clannai.com
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/gaa_app

# Auth
JWT_SECRET=your-secure-secret-min-32-chars
JWT_EXPIRY=7d

# AWS
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=clann-gaa-videos-nov25

# Lambda
LAMBDA_API_KEY=secure-key-for-lambda-to-backend-auth

# AI
GEMINI_API_KEY=AIzaSy...
```

### Lambda 1: VEO Downloader
```bash
BUCKET_NAME=clann-gaa-videos-nov25
DATABASE_URL=postgresql://user:pass@host:5432/gaa_app
AWS_REGION=eu-west-1
AI_ANALYZER_FUNCTION_NAME=gaa-ai-analyzer-nov25
```

### Lambda 2: AI Analyzer
```bash
GEMINI_API_KEY=AIzaSy...
BACKEND_API_URL=https://api-gaa.clannai.com
LAMBDA_API_KEY=secure-key-for-lambda-to-backend-auth
AWS_BUCKET_NAME=clann-gaa-videos-nov25
AWS_REGION=eu-west-1
```

---

## 5️⃣ Post-Deployment Verification

### Frontend
1. Visit: `https://your-frontend.vercel.app`
2. Check: Landing page loads
3. Test: Sign up / Login works
4. Verify: Dashboard displays

### Backend
1. Test health endpoint:
   ```bash
   curl https://your-backend.vercel.app/health
   ```
2. Test API:
   ```bash
   curl https://your-backend.vercel.app/api/games \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Lambda Functions
1. Check CloudWatch Logs:
   ```bash
   # Lambda 1
   aws logs tail /aws/lambda/gaa-veo-downloader-nov25 --follow --region eu-west-1
   
   # Lambda 2
   aws logs tail /aws/lambda/gaa-ai-analyzer-nov25 --follow --region eu-west-1
   ```

2. Test with real VEO URL via webapp:
   - Submit VEO URL
   - Check status changes: pending → downloaded → processing → analyzed
   - Verify events appear in frontend

---

## 6️⃣ Common Issues

### Frontend Build Fails
```bash
# Check Next.js version compatibility
cd frontend
npm install
npm run build
```

### Backend 500 Errors
- Check environment variables in Vercel dashboard
- Check database connection (DATABASE_URL)
- Check CloudWatch logs in Vercel

### Lambda Timeout
- Increase timeout to 900s (15 min) for AI analyzer
- Check memory allocation (10GB for AI analyzer)

### CORS Issues
- Ensure `NEXT_PUBLIC_API_URL` matches backend URL
- Check backend `vercel.json` CORS headers

---

## 7️⃣ Rollback

### Vercel (Frontend/Backend)
1. Go to Vercel dashboard
2. Select project → Deployments
3. Find previous working deployment
4. Click "..." → Promote to Production

### Lambda
```bash
# List versions
aws lambda list-versions-by-function \
  --function-name gaa-ai-analyzer-nov25 \
  --region eu-west-1

# Rollback to previous version
aws lambda update-alias \
  --function-name gaa-ai-analyzer-nov25 \
  --name production \
  --function-version [PREVIOUS_VERSION] \
  --region eu-west-1
```

---

## 8️⃣ CI/CD (Recommended)

### Current Setup (Manual)
- Frontend: Git push → Vercel auto-deploys
- Backend: Git push → Vercel auto-deploys
- Lambda: Manual `./deploy.sh` or `./docker-deploy.sh`

### Ideal Setup
Add GitHub Actions for Lambda deployment:

```yaml
# .github/workflows/deploy-lambda.yml
name: Deploy Lambda Functions
on:
  push:
    branches: [main]
    paths:
      - 'lambda/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Lambda 1
        run: cd lambda/veo-downloader && ./deploy.sh
      - name: Deploy Lambda 2
        run: cd lambda/gaa-ai-analyzer && ./docker-deploy.sh
```

---

## 📋 Deployment Checklist

Before going live:

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Vercel
- [ ] All environment variables set in Vercel
- [ ] Lambda 1 (VEO Downloader) deployed
- [ ] Lambda 2 (AI Analyzer) deployed
- [ ] Database schema up to date
- [ ] S3 bucket created and accessible
- [ ] IAM roles and permissions configured
- [ ] Test end-to-end: Upload VEO URL → Events appear
- [ ] Monitor CloudWatch logs for errors
- [ ] Test on mobile devices
- [ ] Check browser console for errors

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **AWS Console:** https://console.aws.amazon.com/lambda
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups

---

---

## 9️⃣ Manual Deployment Workflow

### Current Setup (Manual Deployments)

**Frontend:**
```bash
# 1. Make changes and commit
cd /Users/thomasbradley/clann-repos/gaa
git add .
git commit -m "Your changes"
git push

# 2. Deploy manually (from repo root)
vercel --prod --yes
```

**Why deploy from repo root?**
- Vercel project has `rootDirectory: webapp/gaa-webapp/frontend` configured
- This tells Vercel where to find the code relative to repo root
- Deploying from repo root ensures correct path resolution

**Backend:**
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/backend
vercel --prod --yes
```

### Troubleshooting Deployment Issues

**"Path does not exist" error:**
- Make sure you're deploying from the correct directory
- Check Vercel dashboard → Settings → Root Directory matches your structure
- Try: `vercel link --project frontend --yes` to relink

**Build fails:**
- Check build logs in Vercel dashboard
- Test locally: `cd webapp/gaa-webapp/frontend && npm run build`
- Verify all environment variables are set in Vercel

**Wrong project deployed:**
- Check `.vercel/project.json` in repo root
- Should have: `"projectName": "frontend"`
- Relink if needed: `rm -rf .vercel && vercel link --project frontend --yes`

---

**Last Updated:** November 21, 2025  
**Status:** Production Ready  
**Deployment Method:** Manual (auto-deploy disabled)

