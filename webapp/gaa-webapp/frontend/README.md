# GAA Webapp - Frontend

Next.js 15 frontend deployed to Vercel.

---

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with backend URL

# Run development server
npm run dev
```

Frontend runs on: **http://localhost:5012**

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Games dashboard
│   │   ├── games/[id]/        # Game detail page
│   │   ├── team/              # Team management
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── games/
│   │   │   ├── VideoPlayer.tsx        # Main video player
│   │   │   ├── UnifiedSidebar.tsx     # Events/stats sidebar
│   │   │   ├── GameHeader.tsx         # Game info header
│   │   │   └── TeamColorPicker.tsx    # Color selector
│   │   ├── ui/                # Reusable UI components
│   │   └── Sidebar.tsx        # Main navigation
│   ├── lib/
│   │   ├── api-client.ts      # Backend API calls
│   │   ├── event-transformer.ts   # Event data transformation
│   │   ├── score-calculator.ts    # Score tracking
│   │   └── auth.ts            # JWT authentication
│   └── hooks/
│       ├── useAuth.ts         # Authentication hook
│       └── useOrientation.ts  # Mobile orientation
├── public/
│   ├── hero-video.mp4         # Landing page video
│   └── favicon.ico
├── next.config.ts             # Next.js configuration
└── vercel.json                # Vercel deployment config
```

---

## 🎨 Key Features

### Video Player
- HLS & MP4 support
- Event timeline with markers
- Autoplay mode (clip events automatically)
- Keyboard shortcuts (space, arrows)
- Mobile responsive

### Event System
- AI-generated events from Lambda
- Manual event editing
- Team color mapping
- Score calculation
- Event filtering by type

### Authentication
- JWT-based auth
- Protected routes
- Automatic token refresh
- Logout everywhere

---

## 🌐 Environment Variables

Create `.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5011

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_gaa_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Optional: Analytics, monitoring, etc.
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Production:**
```bash
NEXT_PUBLIC_API_URL=https://api-gaa.clannai.com
NEXT_PUBLIC_POSTHOG_KEY=phc_your_gaa_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## 📦 Vercel Deployment

### How Next.js on Vercel Works

1. **Static Generation (SSG):** Pages built at deploy time
   - Landing page, static pages
   - Fast, cached at CDN edge

2. **Server-Side Rendering (SSR):** Pages built on request
   - Game detail pages (dynamic data)
   - Dashboard (user-specific)

3. **Edge Functions:** Run at CDN edge for low latency
   - API routes (if any)
   - Middleware (auth checks)

4. **Automatic Optimization:**
   - Image optimization (Next.js Image component)
   - Code splitting (only load what's needed)
   - Font optimization

### Deploy to Vercel

**First Time:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel
```

**Set Environment Variables:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL=https://your-backend.vercel.app`
3. Apply to: Production, Preview, Development

**Deploy to Production:**
```bash
vercel --prod
```

### Auto-Deploy from Git

1. Connect GitHub repo to Vercel
2. Vercel watches for changes:
   - Push to `main` → Production deployment
   - Push to other branches → Preview deployments
3. Each commit gets unique preview URL

### Build Process

When you deploy, Vercel:
1. Installs dependencies (`npm install`)
2. Runs build (`npm run build`)
3. Optimizes output
4. Deploys to global CDN

**Build Output:**
```bash
.next/
├── static/          # Static assets (CSS, JS)
├── server/          # Server-side code
└── cache/           # Build cache
```

### Configuration (`vercel.json`)

```json
{
  "version": 2,
  "public": true,
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

**What this does:**
- Clean URLs (no .html extension)
- No trailing slashes
- Security headers
- Caching for static assets

---

## 🎬 Video Player

### Supported Formats
- **MP4:** Direct playback
- **HLS (.m3u8):** Adaptive streaming (preferred)
- **VEO URLs:** Proxied through backend

### How It Works

```typescript
// 1. Fetch game data (includes presigned video URL)
const game = await apiClient.games.get(gameId)

// 2. VideoPlayer component handles playback
<VideoPlayer
  videoUrl={game.video_url}
  events={transformedEvents}
  onEventClick={(event) => seekToTime(event.timestamp)}
/>

// 3. Event timeline syncs with video time
useEffect(() => {
  const interval = setInterval(() => {
    const currentTime = videoRef.current.currentTime
    highlightEventsAtTime(currentTime)
  }, 100)
}, [])
```

### Mobile Optimization
- Orientation detection
- Touch-friendly controls
- Full-screen mode
- Reduced motion for performance

---

## 🔐 Authentication Flow

```typescript
// 1. User logs in
const { token } = await apiClient.auth.login(email, password)

// 2. Store JWT in localStorage
localStorage.setItem('token', token)

// 3. Include in API requests
fetch('/api/games', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// 4. Protected routes check for token
useEffect(() => {
  if (!token) {
    router.push('/login')
  }
}, [token])
```

---

## 🧪 Local Development

### Run with Backend

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Visit: http://localhost:5012

### Mock Data (Optional)

For frontend-only development:

```typescript
// lib/api-client.ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

if (USE_MOCK) {
  return MOCK_GAME_DATA
}
```

---

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework:

```tsx
<div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
  <Button className="px-4 py-2 bg-green-600 hover:bg-green-700">
    Play
  </Button>
</div>
```

### Theme Colors

```javascript
// tailwind.config.js
colors: {
  'gaa-green': '#016F32',  // Primary brand color
  'gaa-orange': '#FF7900', // Secondary
}
```

### Dark Mode

App uses dark mode by default:
```typescript
// app/layout.tsx
<body className="dark bg-gray-950 text-white">
```

---

## 🐛 Common Issues

### API Connection Fails
- Check `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running
- Check browser console for CORS errors

### Video Won't Play
- Check presigned URL hasn't expired (1 hour default)
- Verify video file exists in S3
- Check browser console for errors

### Build Fails on Vercel
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Check for ESLint errors
npm run lint
```

### Environment Variables Not Working
- Must start with `NEXT_PUBLIC_` to be exposed to browser
- Restart dev server after changing `.env.local`
- On Vercel: Redeploy after adding env vars

---

## 📊 Performance

### Lighthouse Scores (Target)
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >95

### Optimization Tips
- Use Next.js `<Image>` component (automatic optimization)
- Lazy load components below the fold
- Minimize client-side JavaScript
- Use SSR for dynamic content
- Enable caching headers

### Bundle Size
```bash
# Analyze bundle
npm run build
```

Current bundles:
- Main: ~200KB
- Video Player: ~150KB
- Chart libraries: ~100KB

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Landing page loads
- [ ] Sign up / Login works
- [ ] Dashboard displays games
- [ ] Upload VEO URL
- [ ] Video player plays
- [ ] Events appear on timeline
- [ ] Autoplay mode works
- [ ] Mobile responsive
- [ ] Team colors display correctly

### Browser Testing
- Chrome (primary)
- Safari (iOS)
- Firefox
- Edge

---

## 📱 Mobile Considerations

### Responsive Breakpoints
```css
sm:  640px  /* Mobile landscape */
md:  768px  /* Tablet */
lg:  1024px /* Desktop */
xl:  1280px /* Large desktop */
```

### Mobile Features
- Touch-friendly buttons (min 44px)
- Orientation detection (force landscape for video)
- Simplified navigation
- Reduced animations

---

## 🔗 Related Docs

- [Main README](../README.md) - Project overview
- [Deployment Guide](../DEPLOYMENT.md) - Full deployment instructions
- [Video Player Reference](CLANN_VIDEO_PLAYER_REFERENCE.md) - Detailed player docs
- [Data Contract](../docs/architecture/DATA_CONTRACT.md) - API data structures

---

## 📝 Key Components

### VideoPlayer
```tsx
<VideoPlayer
  videoUrl={game.video_url}
  events={events}
  onEventClick={(event) => seekTo(event.timestamp)}
  autoplay={false}
/>
```

### UnifiedSidebar
```tsx
<UnifiedSidebar
  game={game}
  events={events}
  onEventSelect={(event) => highlightEvent(event)}
/>
```

### GameHeader
```tsx
<GameHeader
  game={game}
  score={calculatedScore}
  teamColors={teamColors}
/>
```

---

## 🚀 Scripts

```bash
# Development
npm run dev          # Start dev server (port 5012)

# Build
npm run build        # Production build
npm run start        # Start production server

# Code Quality
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

---

**Last Updated:** November 19, 2025  
**Status:** Production Ready
