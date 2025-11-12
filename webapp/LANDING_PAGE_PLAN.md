# GAA App Landing/Login Page Plan

Building a landing page similar to 1-Clann-Webapp (Football) with integrated login/signup functionality.

---

## 🎯 Goal

Create a beautiful landing page with:
- Full-screen video background
- Modal-based authentication (sign in/sign up in same modal)
- Three-step feature cards with typing animation
- Embedded demo player (optional)
- Clean, modern design

---

## 📐 Design Reference

**Based on:** `/home/ubuntu/clann/CLANNAI/web-apps/1-clann-webapp/frontend/src/app/page.tsx`

**Key Elements:**
1. Video background (`/hero-video.mp4`)
2. Fixed header with logo + auth buttons
3. Three-step cards (Upload → AI Creates → Sign Up)
4. Typing animation cycling through features
5. Modal auth (toggle between login/signup)
6. Footer with links

---

## 🏗️ Architecture Decision

### **Backend Approach**
Use **Express.js in repo** (like Football/Jujitsu) instead of external AWS API Gateway:
- ✅ Full visibility and control
- ✅ Easier to debug locally
- ✅ Simpler auth (custom JWT vs Cognito)

### **Auth Approach**
Use **Custom JWT** (like Football/Jujitsu) instead of AWS Cognito:
- ✅ Simpler setup
- ✅ No AWS dependency
- ✅ Full control over auth flow

### **Frontend Stack**
- Next.js 15 + React 19
- Tailwind CSS v4
- shadcn/ui components (from GAA webapp - better than Football's minimal UI)
- Manual API client (like Football - simpler than OpenAPI for MVP)

---

## 📁 File Structure

```
gaa-app/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page (main)
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── globals.css           # Global styles
│   │   ├── components/
│   │   │   └── auth/
│   │   │       └── AuthModal.tsx     # Auth modal component
│   │   └── lib/
│   │       └── api-client.ts         # API client (like Football)
│   └── package.json
│
├── backend/
│   ├── routes/
│   │   └── auth.js                   # Auth routes (like Football)
│   ├── middleware/
│   │   └── auth.js                   # JWT middleware
│   ├── utils/
│   │   ├── database.js               # DB connection
│   │   └── jwt.js                    # JWT helpers
│   └── server.js                     # Express server
│
└── db/
    └── schema.sql                    # Database schema
```

---

## 🎨 Landing Page Components

### **1. Main Landing Page (`page.tsx`)**

**Structure:**
```typescript
- Fixed header (logo + Sign in / Get started buttons)
- Video background (full-screen, loop, muted)
- Hero section with three-step cards
- Typing animation for step 2 features
- Action buttons (Book call, Join team)
- Embedded demo player (optional)
- Footer
- Auth modal (conditionally rendered)
```

**State Management:**
```typescript
const [showAuthModal, setShowAuthModal] = useState(false)
const [isLogin, setIsLogin] = useState(true)  // Toggle login/signup
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState<string | null>(null)
const [isSubmitting, setIsSubmitting] = useState(false)
```

### **2. Auth Modal Component**

**Features:**
- Toggle between "Sign In" and "Create Account"
- Email + password inputs
- Password visibility toggle
- Terms & Conditions checkbox (signup only)
- Error display
- Loading state during submission
- Auto-close on success

**API Calls:**
```typescript
// Login
POST /api/auth/login
Body: { email, password }
Response: { token, user }

// Signup
POST /api/auth/register
Body: { email, password, phone? }
Response: { token, user }
```

### **3. Typing Animation**

**From Football App:**
```typescript
const lines = [
  'Best clips & highlights',
  'Complete match analysis',
  'AI coaching insights',
  'Training recommendations'
]

// Cycles through with typing/deleting effect
// Highlights active line with green color
```

**Adapt for GAA:**
```typescript
const lines = [
  'Match highlights & key moments',
  'Complete game analysis',
  'AI tactical insights',
  'Player performance stats'
]
```

### **4. Three-Step Cards**

**Step 1: Upload**
- Icon: 📹
- Title: "Upload footage"
- Description: "VEO, Trace, Spiideo or any MP4"
- Image: Platform logos

**Step 2: AI Creates**
- Icon: 🤖
- Title: "ClannAI creates"
- Features: Typing animation cycling through benefits
- Color: Blue accent

**Step 3: Sign Up**
- Icon: 🔒
- Title: "Sign up now"
- Description: Pricing info
- CTA Button: "Join Pilot"

---

## 🔐 Authentication Flow

### **Backend Routes (`backend/routes/auth.js`)**

```javascript
// Register
POST /api/auth/register
- Validate email/password
- Check if user exists
- Hash password (bcrypt)
- Create user in database
- Generate JWT token
- Return { token, user }

// Login
POST /api/auth/login
- Validate email/password
- Find user by email
- Compare password hash
- Generate JWT token
- Return { token, user }

// Get Current User
GET /api/auth/me
- Verify JWT token (middleware)
- Return user data
```

### **Frontend Flow**

```typescript
// 1. User clicks "Sign in" or "Get started"
setShowAuthModal(true)
setIsLogin(true/false)

// 2. User submits form
const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
const response = await fetch(`${API_URL}${endpoint}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

// 3. Store token and redirect
localStorage.setItem('token', data.token)
localStorage.setItem('user', JSON.stringify(data.user))
window.location.href = '/dashboard'
```

---

## 🎬 Video Background

**Requirements:**
- Full-screen background video
- Auto-play, loop, muted
- Gradient overlay (dark at bottom)
- Located at `/public/hero-video.mp4`

**CSS:**
```css
.video-background {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  z-index: -10;
}

.gradient-overlay {
  background: linear-gradient(
    to bottom,
    rgba(17,24,39,0.3) 0%,
    rgba(17,24,39,0.2) 50%,
    rgba(17,24,39,0.8) 100%
  );
}
```

---

## 🎨 Styling

### **Color Scheme (GAA Theme)**
```css
--gaa-green: #016F32        /* Primary green */
--gaa-blue: #4EC2CA        /* Accent blue */
--gaa-bright-green: #D1FB7A /* Highlight green */
--gaa-light-blue: #B9E8EB   /* Light accent */
```

### **Typography**
- Use Geist Sans (from Football app)
- Clean, modern fonts
- Bold headings, readable body text

### **Components**
- Use shadcn/ui components where possible:
  - Dialog (for auth modal)
  - Button
  - Input
  - Card (for step cards)

---

## 📝 Implementation Steps

### **Phase 1: Backend Setup**
1. ✅ Create Express server (`backend/server.js`)
2. ✅ Set up database connection (`backend/utils/database.js`)
3. ✅ Create auth routes (`backend/routes/auth.js`)
4. ✅ Add JWT middleware (`backend/middleware/auth.js`)
5. ✅ Create database schema (`db/schema.sql`)

### **Phase 2: Frontend Setup**
1. ✅ Initialize Next.js 15 project
2. ✅ Install dependencies (Tailwind, shadcn/ui)
3. ✅ Set up API client (`src/lib/api-client.ts`)
4. ✅ Create auth context/provider (optional)

### **Phase 3: Landing Page**
1. ✅ Create main page (`src/app/page.tsx`)
2. ✅ Add video background
3. ✅ Create header component
4. ✅ Build three-step cards
5. ✅ Add typing animation
6. ✅ Create auth modal component
7. ✅ Add footer

### **Phase 4: Polish**
1. ✅ Add error handling
2. ✅ Add loading states
3. ✅ Add animations/transitions
4. ✅ Mobile responsiveness
5. ✅ Test auth flow end-to-end

---

## 🔧 Environment Variables

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3005
```

**Backend (`.env`):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/gaa_app
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=3005
NODE_ENV=development
```

---

## ✅ Acceptance Criteria

**Landing Page:**
- [ ] Video background plays automatically
- [ ] Header is fixed and visible
- [ ] Three-step cards display correctly
- [ ] Typing animation cycles through features
- [ ] "Sign in" and "Get started" buttons work
- [ ] Auth modal opens/closes properly
- [ ] Footer displays correctly

**Authentication:**
- [ ] Can toggle between login/signup in modal
- [ ] Form validation works
- [ ] Error messages display correctly
- [ ] Success redirects to dashboard
- [ ] Token stored in localStorage
- [ ] Protected routes check token

**Mobile:**
- [ ] Responsive layout
- [ ] Touch-friendly buttons
- [ ] Modal works on mobile
- [ ] Video background scales correctly

---

## 🚀 Quick Start Commands

```bash
# Backend
cd backend
npm install
npm run dev  # Starts on port 3005

# Frontend
cd frontend
npm install
npm run dev  # Starts on port 3000

# Database
createdb gaa_app
psql -d gaa_app -f db/schema.sql
```

---

## 📚 Reference Files

**Football App (Reference):**
- Landing: `/home/ubuntu/clann/CLANNAI/web-apps/1-clann-webapp/frontend/src/app/page.tsx`
- Auth Routes: `/home/ubuntu/clann/CLANNAI/web-apps/1-clann-webapp/backend/routes/auth.js`
- API Client: `/home/ubuntu/clann/CLANNAI/web-apps/1-clann-webapp/frontend/src/lib/api-client.ts`

**GAA Webapp (UI Components):**
- Components: `/home/ubuntu/clann/gaa/webapp/map-frontend/src/components/`
- Auth Component: `/home/ubuntu/clann/gaa/webapp/map-frontend/src/components/auth/auth-component.tsx`

---

## 🎯 Next Steps

1. **Set up project structure** (create directories)
2. **Initialize backend** (Express + database)
3. **Initialize frontend** (Next.js + dependencies)
4. **Build landing page** (copy Football app structure)
5. **Add auth functionality** (backend routes + frontend modal)
6. **Test end-to-end** (signup → login → dashboard)

This plan gives you a beautiful landing page with integrated auth, similar to the Football app but with GAA-specific content and better UI components from the GAA webapp.

