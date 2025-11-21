# Add PostHog to Vercel Production

## Quick Steps

1. **Get your PostHog API key** (if you haven't already):
   - Go to your GAA PostHog project
   - Settings → Project API Key
   - Copy the key (starts with `phc_`)

2. **Add to Vercel:**
   - Go to: https://vercel.com/dashboard
   - Find your GAA project (gaa.clannai.com)
   - Click on it → **Settings** tab
   - Click **Environment Variables** in the left sidebar
   - Click **Add New**
   
3. **Add these two variables:**

   **Variable 1:**
   - Key: `NEXT_PUBLIC_POSTHOG_KEY`
   - Value: `phc_your_gaa_key_here` (paste your actual key)
   - Environments: ✅ Production ✅ Preview ✅ Development
   - Click **Save**

   **Variable 2:**
   - Key: `NEXT_PUBLIC_POSTHOG_HOST`
   - Value: `https://us.i.posthog.com`
   - Environments: ✅ Production ✅ Preview ✅ Development
   - Click **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click the "..." menu on the latest deployment
   - Click **Redeploy**
   - OR just push a new commit (auto-deploys)

## Verify It's Working

After redeploy:
1. Visit https://gaa.clannai.com
2. Open browser console (F12)
3. Look for: `✅ PostHog initialized successfully`
4. Navigate to a few pages
5. Check PostHog dashboard - you should see events coming in

## That's It!

PostHog will now track:
- Pageviews on gaa.clannai.com
- User sessions
- Clicks and interactions
- All in your separate GAA PostHog project

