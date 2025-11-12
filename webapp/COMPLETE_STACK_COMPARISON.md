# Complete Stack Comparison: All Three ClannAI Apps

Comprehensive mapping of GAA Webapp, Jujitsu-Clann, and 1-Clann-Webapp (Football) to inform GAA app design.

---

## 📊 Quick Comparison Table

| Feature | GAA Webapp | Jujitsu-Clann | 1-Clann-Webapp (Football) |
|---------|------------|---------------|---------------------------|
| **Frontend Framework** | Next.js 15 | Next.js 15 | Next.js 15 |
| **React Version** | React 19 | React 19 | React 19 |
| **Backend** | AWS API Gateway + Lambda (external) | Express.js (in repo) | Express.js (in repo) |
| **Auth** | AWS Cognito (Amplify) | Custom JWT | Custom JWT |
| **UI Library** | shadcn/ui (Radix) | Minimal custom | Minimal custom |
| **API Client** | OpenAPI-generated SDK | Manual fetch | Manual fetch (class-based) |
| **Landing Page** | Video bg + components | Redirect to login | Full landing with modal auth |
| **Video Player** | HLS.js | Custom | HLS.js + react-player |
| **Database** | Unknown (external) | PostgreSQL (RDS) | PostgreSQL (RDS) |
| **Mobile** | Web only | Capacitor (iOS/Android) | Web only |

---

## 🎨 Landing Page Comparison

### **1-Clann-Webapp (Football)** - ⭐ Reference Design
**Location:** `/frontend/src/app/page.tsx`

**Features:**
- ✅ Full-screen video background (`/hero-video.mp4`)
- ✅ Fixed header with logo and auth buttons
- ✅ Three-step cards with typing animation
- ✅ Embedded demo game player (fullscreen on scroll)
- ✅ Modal-based auth (sign in/sign up in same modal)
- ✅ Join team flow via URL params (`?join=CODE`)
- ✅ Calendly integration for booking calls
- ✅ "Join the Clann" modal (cofounder/investor)
- ✅ Footer with links

**Auth Flow:**
- Modal opens on "Sign in" or "Get started"
- Toggle between login/signup in same modal
- Auto-join team if `?join=CODE` in URL
- Store token in localStorage
- Redirect to `/dashboard` on success

**Key Components:**
- `SearchParamsHandler` - Handles URL join codes
- Typing animation for step 2 features
- Fullscreen demo player with scroll detection
- Auth modal with form validation

### **GAA Webapp** - Current State
**Location:** `/map-frontend/src/app/page.tsx`

**Features:**
- ✅ Video background
- ✅ Uses shadcn/ui Dialog component
- ✅ Separate AuthComponent
- ✅ Navigation component
- ✅ Hero section component
- ✅ Video player hero section
- ✅ Pitch finder section
- ❌ No embedded demo player
- ❌ No typing animation
- ❌ Less interactive

**Auth Flow:**
- Uses AWS Amplify/Cognito
- Auth context provider
- More complex (Cognito integration)

### **Jujitsu-Clann** - Minimal
**Location:** `/frontend/src/app/page.tsx`

**Features:**
- ❌ No landing page - redirects to `/auth/login`
- ✅ VCR aesthetic (black/yellow theme)
- ✅ Simple hero text
- ✅ Feature cards
- ✅ Pricing teaser

**Auth Flow:**
- Separate login page (`/auth/login`)
- Simple redirect logic

---

## 🔐 Authentication Comparison

### **1-Clann-Webapp (Football)** - Custom JWT
```javascript
// Backend: /backend/routes/auth.js
- POST /api/auth/register (email, password, phone)
- POST /api/auth/login (email, password)
- GET /api/auth/me (protected)
- Uses bcrypt for password hashing
- JWT tokens with 7-day expiry
- Auto-joins user to public teams on registration
```

```typescript
// Frontend: /frontend/src/lib/api-client.ts
- Class-based API client
- localStorage for token storage
- Auto-injects Bearer token in headers
- Simple fetch-based requests
```

**Pros:**
- ✅ Simple, transparent
- ✅ Full control
- ✅ Easy to debug
- ✅ No AWS dependency

**Cons:**
- ⚠️ Need to implement password reset yourself
- ⚠️ Need to handle email verification manually

### **GAA Webapp** - AWS Cognito
```typescript
// Frontend: /map-frontend/src/lib/amplify.ts
- AWS Amplify configuration
- Cognito User Pool integration
- Auto-handles email verification
- Password reset built-in
```

```typescript
// Frontend: /map-frontend/src/lib/api-client.ts
- Auto-injects Cognito ID token
- Request interceptor adds Bearer token
- Uses generated SDK from OpenAPI
```

**Pros:**
- ✅ Managed auth service
- ✅ Email verification built-in
- ✅ Password reset built-in
- ✅ More secure (AWS managed)

**Cons:**
- ❌ AWS vendor lock-in
- ❌ More complex setup
- ❌ Harder to customize
- ❌ Requires AWS account

### **Jujitsu-Clann** - Custom JWT (Similar to Football)
```javascript
// Backend: /backend/routes/auth.js
- Same pattern as Football app
- Custom JWT with bcrypt
```

**Pros:**
- ✅ Simple like Football app
- ✅ Full control

---

## 🎥 Video Player Comparison

### **1-Clann-Webapp**
- **Library:** HLS.js + react-player
- **Features:** Embedded iframe for demo, fullscreen on scroll
- **Location:** `/frontend/src/components/games/VideoPlayer.tsx`

### **GAA Webapp**
- **Library:** HLS.js
- **Features:** More sophisticated player with events timeline
- **Location:** `/map-frontend/src/components/video-player/`

### **Jujitsu-Clann**
- **Library:** Custom (implied)
- **Features:** Basic playback

---

## 📡 API Client Comparison

### **1-Clann-Webapp** - Class-Based Manual Client
```typescript
class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }
  
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }
}
```

**Pros:**
- ✅ Simple, explicit
- ✅ Easy to customize
- ✅ No generation step

**Cons:**
- ⚠️ Manual type definitions
- ⚠️ Can get out of sync with backend

### **GAA Webapp** - OpenAPI-Generated SDK
```typescript
// Generated from OpenAPI spec
import { listTeams, createGame } from '@/lib/api/generated/sdk.gen'

const result = await listTeams({ client })
```

**Pros:**
- ✅ Type-safe (auto-generated)
- ✅ Always in sync with backend
- ✅ Auto-completion in IDE

**Cons:**
- ⚠️ Requires OpenAPI spec maintenance
- ⚠️ Generation step needed

### **Jujitsu-Clann** - Simple Manual Client
```typescript
// Similar to Football app
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken()
  // ... fetch logic
}
```

---

## 🗄️ Database Comparison

### **1-Clann-Webapp** & **Jujitsu-Clann**
- **Type:** PostgreSQL (AWS RDS)
- **Schema:** Visible in `/db/schema.sql`
- **Connection:** Direct from Express backend
- **Migrations:** Scripts in `/backend/scripts/`

### **GAA Webapp**
- **Type:** Unknown (likely PostgreSQL on RDS)
- **Schema:** Not visible (external backend)
- **Connection:** Via API Gateway only

---

## 🎯 Recommended Approach for GAA App

Based on the comparison, here's what to use:

### **Frontend Stack (Best of All)**
- ✅ **Next.js 15** + React 19 (all use this)
- ✅ **shadcn/ui** components (from GAA webapp - best UI library)
- ✅ **Custom JWT auth** (from Football/Jujitsu - simpler than Cognito)
- ✅ **Manual API client** (from Football - simpler than OpenAPI for MVP)
- ✅ **HLS.js** for video (from GAA/Football)

### **Backend Stack**
- ✅ **Express.js in repo** (from Football/Jujitsu - full visibility)
- ✅ **PostgreSQL** (from Football/Jujitsu - proven)
- ✅ **Custom JWT** (from Football/Jujitsu - simpler)

### **Landing Page Design**
- ✅ **Football app style** (best landing page)
  - Video background
  - Modal auth
  - Typing animation
  - Embedded demo player
  - Three-step cards

---

## 📋 Landing Page Feature Checklist

From 1-Clann-Webapp (Football):

**Must Have:**
- [x] Full-screen video background
- [x] Fixed header with logo + auth buttons
- [x] Three-step feature cards
- [x] Modal-based auth (sign in/sign up toggle)
- [x] Typing animation for features
- [x] Embedded demo player
- [x] Footer with links

**Nice to Have:**
- [ ] Join team via URL params
- [ ] Calendly integration
- [ ] "Join the Clann" modal
- [ ] Fullscreen demo on scroll

---

## 🎨 Design Elements from Football App

### **Color Scheme**
```css
--clann-green: #016F32
--clann-blue: #4EC2CA
--clann-bright-green: #D1FB7A
--clann-light-blue: #B9E8EB
```

### **Typography**
- Geist Sans (from layout.tsx)
- Clean, modern fonts

### **Layout**
- Dark background (gray-900)
- Video overlay with gradient
- Glassmorphism effects (backdrop-blur)
- Rounded corners (rounded-2xl, rounded-3xl)

---

## 🔧 Implementation Notes

### **Auth Modal Pattern (Football App)**
```typescript
// Single modal, toggle between login/signup
const [isLogin, setIsLogin] = useState(true)
const [showAuthModal, setShowAuthModal] = useState(false)

// Form submission handles both
const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
```

### **Typing Animation (Football App)**
```typescript
// Cycles through feature list with typing effect
const lines = [
  'Best clips & highlights',
  'Complete match analysis',
  'AI coaching insights',
  'Training recommendations'
]
// Uses setTimeout for character-by-character typing
```

### **Demo Player (Football App)**
```typescript
// Embedded iframe that goes fullscreen on scroll
<iframe
  src="/games/{id}?embed=true"
  className="w-full h-full border-0"
/>
// Scroll detection triggers fullscreen
```

---

## 🚀 Next Steps for GAA App

1. **Set up Express backend** (like Football/Jujitsu)
2. **Create auth routes** (custom JWT like Football)
3. **Build landing page** (Football-style with video bg)
4. **Add auth modal** (Football-style toggle)
5. **Add typing animation** (Football-style)
6. **Add demo player** (optional, like Football)

This gives you the best landing page (Football) with simpler auth (Football/Jujitsu) and better UI components (GAA webapp).

