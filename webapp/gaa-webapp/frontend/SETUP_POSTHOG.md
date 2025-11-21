# PostHog Setup for GAA Webapp

## End Goal
Track analytics for gaa.clannai.com in a separate PostHog project from jj.clannai.com.

## Minimal Steps (You Only Need to Do 2 Things)

### Step 1: Create PostHog Project (2 minutes, minimal UI)

1. Go to: https://us.i.posthog.com/project/settings
2. Click **"+ New Project"** button (top right or in sidebar)
3. Name it: `GAA Webapp` or `gaa.clannai.com`
4. Click **"Create Project"**
5. On the project settings page, find **"Project API Key"**
6. Copy the key (starts with `phc_`)

**That's it for PostHog UI!** ✅

### Step 2: Add Key to Environment

**Local Development:**
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/frontend
cp .env.local.example .env.local
# Then edit .env.local and paste your key where it says "phc_your_gaa_project_key_here"
```

Or just create `.env.local` with:
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_paste_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_API_URL=http://localhost:5011
```

**Production (Vercel):**
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add these two variables:
   - `NEXT_PUBLIC_POSTHOG_KEY` = `phc_your_key_here`
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com`
3. Apply to: Production, Preview, Development
4. Redeploy (or it auto-deploys on next push)

## What I've Already Done For You

✅ Installed `posthog-js` package  
✅ Created PostHog provider component  
✅ Added PostHog to app layout  
✅ Set up environment variable configuration  
✅ Created `.env.local.example` template  
✅ Code will gracefully handle missing key (shows warning, doesn't break)

## Testing

After adding the key:
1. Restart dev server: `npm run dev`
2. Open browser console
3. You should see: `✅ PostHog initialized successfully`
4. Visit a few pages - you should see: `📊 PostHog pageview: http://...`

## That's It!

Once you paste the key, PostHog will automatically:
- Track pageviews
- Track page leaves
- Autocapture clicks and form submissions
- All data goes to your new GAA project (separate from BJJ)

