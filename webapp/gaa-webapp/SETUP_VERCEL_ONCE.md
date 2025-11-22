# Vercel Root Directory Setup (One-Time)

## The Problem
Auto-deploys from Git fail because Vercel doesn't know where to find the Next.js app in the monorepo.

## The Solution (Set Once, Works Forever)

**This only needs to be done ONCE.** After this, all Git pushes will auto-deploy correctly.

### Step 1: Set Frontend Root Directory

1. Go to: https://vercel.com/clannai/frontend/settings
2. Scroll to **"Root Directory"**
3. Set to: `webapp/gaa-webapp/frontend`
4. Click **"Save"**

### Step 2: Set Backend Root Directory

1. Go to: https://vercel.com/clannai/backend/settings
2. Scroll to **"Root Directory"**
3. Set to: `webapp/gaa-webapp/backend`
4. Click **"Save"**

## That's It!

After setting these ONCE:
- ✅ All future Git pushes to `main` will auto-deploy
- ✅ No more manual deployments needed
- ✅ No more build errors from wrong directory

## Verify It Works

After setting, push a test commit:
```bash
git commit --allow-empty -m "Test auto-deploy"
git push origin main
```

Check Vercel dashboard - you should see a new deployment automatically start.

