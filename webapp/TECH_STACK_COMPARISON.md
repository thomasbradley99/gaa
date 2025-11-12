# Tech Stack Comparison: GAA Webapp vs Jujitsu-Clann

Comparison of the two ClannAI projects to inform GAA app architecture decisions.

---

## 🏗️ Architecture Overview

### **GAA Webapp** (Current)
- **Architecture**: Frontend-only, backend hosted separately on AWS
- **Backend Location**: External AWS API Gateway + Lambda (not in repo)
- **Deployment**: Frontend deployed separately, backend managed independently

### **Jujitsu-Clann** (Reference)
- **Architecture**: Full-stack monorepo (frontend + backend together)
- **Backend Location**: Express.js server in `/backend` directory
- **Deployment**: Both frontend and backend deployed together (Devopness/Vercel)

---

## 📦 Frontend Stack Comparison

| Component | GAA Webapp | Jujitsu-Clann | Recommendation |
|-----------|------------|---------------|----------------|
| **Framework** | Next.js 15 | Next.js 15 | ✅ Same - Keep |
| **React** | React 19 | React 19 | ✅ Same - Keep |
| **TypeScript** | ✅ Yes | ✅ Yes | ✅ Same - Keep |
| **Styling** | Tailwind CSS v4 | Tailwind CSS v4 | ✅ Same - Keep |
| **UI Components** | shadcn/ui (Radix UI) | Minimal (custom) | ⚠️ GAA has richer component library |
| **State Management** | React Query (TanStack) | React Query (implied) | ✅ Same - Keep |
| **Forms** | React Hook Form + Zod | React Hook Form (implied) | ✅ GAA has better validation |
| **Video Player** | HLS.js | Custom (implied) | ✅ GAA has HLS support |
| **Icons** | Lucide React + Tabler | Lucide React | ✅ GAA has more options |
| **Mobile** | Web-only | Capacitor (iOS/Android) | ⚠️ Jujitsu has native mobile support |

### Frontend Key Differences

**GAA Webapp Advantages:**
- ✅ Richer UI component library (shadcn/ui with Radix UI)
- ✅ Better form validation (Zod schemas)
- ✅ More sophisticated video player (HLS.js for streaming)
- ✅ More UI utilities (dnd-kit, recharts, framer-motion)
- ✅ OpenAPI-generated SDK (type-safe API calls)

**Jujitsu-Clann Advantages:**
- ✅ Native mobile app support (Capacitor)
- ✅ PWA support (next-pwa)
- ✅ Simpler, lighter weight
- ✅ PostHog analytics integration

---

## 🔧 Backend Stack Comparison

| Component | GAA Webapp | Jujitsu-Clann | Recommendation |
|-----------|------------|---------------|----------------|
| **Backend Type** | AWS API Gateway + Lambda | Express.js (Node.js) | ⚠️ Different approaches |
| **Language** | Unknown (likely Python/Node) | Node.js (ES Modules) | ⚠️ Jujitsu is more transparent |
| **Database** | Unknown (likely RDS) | PostgreSQL (AWS RDS) | ✅ Jujitsu approach is clear |
| **Authentication** | AWS Cognito (JWT) | Custom JWT (jsonwebtoken) | ⚠️ Different auth strategies |
| **API Style** | REST (OpenAPI spec) | REST (Express routes) | ✅ Both REST, GAA has OpenAPI |
| **File Storage** | AWS S3 (implied) | AWS S3 | ✅ Same - Keep |
| **Video Processing** | Lambda (implied) | AWS Lambda (Python) | ✅ Same - Keep |
| **Rate Limiting** | Unknown | express-rate-limit | ⚠️ Jujitsu has explicit rate limiting |

### Backend Key Differences

**GAA Webapp Approach:**
- ✅ Serverless (API Gateway + Lambda) - scales automatically
- ✅ AWS Cognito - managed auth service
- ✅ OpenAPI spec - auto-generated SDK, better documentation
- ❌ Backend code not in repo - harder to modify/debug
- ❌ Less transparent - harder to understand full stack

**Jujitsu-Clann Approach:**
- ✅ Backend code in repo - full visibility and control
- ✅ Express.js - familiar, easy to debug locally
- ✅ Custom JWT - simpler, more flexible
- ✅ Rate limiting built-in - better abuse prevention
- ✅ Cron jobs for retries - better reliability
- ⚠️ Server-based - need to manage scaling

---

## 🔐 Authentication Comparison

### **GAA Webapp**
- **Method**: AWS Cognito User Pools
- **Flow**: Amplify SDK handles signup/login/verification
- **Tokens**: Cognito ID tokens (JWT) auto-injected by API client
- **Pros**: Managed service, handles email verification, password reset
- **Cons**: AWS-specific, less flexible, requires AWS setup

### **Jujitsu-Clann**
- **Method**: Custom JWT with bcrypt password hashing
- **Flow**: Express routes handle signup/login
- **Tokens**: Custom JWT stored in localStorage
- **Pros**: Full control, simple, works anywhere
- **Cons**: Need to implement email verification, password reset yourself

---

## 📡 API Client Comparison

### **GAA Webapp**
```typescript
// Auto-generated from OpenAPI spec
import { listTeams, createGame } from '@/lib/api/generated/sdk.gen';

// Uses interceptors to auto-add Cognito tokens
const result = await listTeams({ client });
```

**Advantages:**
- ✅ Type-safe (generated from OpenAPI)
- ✅ Auto-completion in IDE
- ✅ Always in sync with backend API
- ✅ Automatic token injection

### **Jujitsu-Clann**
```typescript
// Manual API client
import { videos, auth } from '@/lib/api-client';

// Manual token management
const result = await videos.list();
```

**Advantages:**
- ✅ Simple, explicit
- ✅ Easy to customize
- ✅ No generation step needed

---

## 🎥 Video Processing Comparison

| Aspect | GAA Webapp | Jujitsu-Clann |
|--------|------------|---------------|
| **Upload** | Presigned S3 URLs | Presigned S3 URLs |
| **Processing** | Lambda (implied) | Lambda (Python + Gemini AI) |
| **AI Model** | Unknown | Google Gemini 2.5 Pro |
| **Video Format** | HLS streaming | Direct MP4 |
| **Event Detection** | GAA-specific events | BJJ-specific events |
| **Timeline** | Interactive timeline | Interactive timeline |

Both use similar patterns:
1. Upload to S3 via presigned URL
2. Trigger Lambda for processing
3. Store results in database
4. Display with interactive timeline

---

## 📊 Database Comparison

### **GAA Webapp**
- **Type**: Unknown (likely PostgreSQL on RDS)
- **Schema**: Not visible in repo
- **Access**: Via API Gateway only

### **Jujitsu-Clann**
- **Type**: PostgreSQL (AWS RDS)
- **Schema**: Visible in `/db/schema.sql`
- **Access**: Direct connection from Express backend
- **Migrations**: Scripts in `/backend/scripts/`

---

## 🚀 Deployment Comparison

### **GAA Webapp**
- **Frontend**: Next.js (likely Vercel/Netlify)
- **Backend**: AWS API Gateway + Lambda
- **Database**: AWS RDS (implied)
- **Storage**: AWS S3
- **Auth**: AWS Cognito

**Pros:**
- ✅ Serverless - no server management
- ✅ Auto-scaling
- ✅ AWS ecosystem integration

**Cons:**
- ❌ Vendor lock-in to AWS
- ❌ Harder to debug (distributed)
- ❌ More complex setup

### **Jujitsu-Clann**
- **Frontend**: Next.js (Devopness/Vercel)
- **Backend**: Express.js (Devopness/Vercel)
- **Database**: AWS RDS PostgreSQL
- **Storage**: AWS S3
- **Auth**: Custom JWT

**Pros:**
- ✅ Simple, familiar stack
- ✅ Easy to debug locally
- ✅ Full control over backend
- ✅ Can deploy anywhere

**Cons:**
- ⚠️ Need to manage server scaling
- ⚠️ More operational overhead

---

## 💡 Recommendations for GAA App

### **Keep from GAA Webapp:**
1. ✅ **Next.js 15 + React 19** - Modern, performant
2. ✅ **shadcn/ui components** - Rich, accessible UI library
3. ✅ **OpenAPI-generated SDK** - Type safety and auto-completion
4. ✅ **React Query** - Great for server state
5. ✅ **Zod validation** - Type-safe form validation
6. ✅ **HLS.js** - Better video streaming support

### **Adopt from Jujitsu-Clann:**
1. ✅ **Express.js backend in repo** - Full visibility and control
2. ✅ **Custom JWT auth** - Simpler than Cognito, more flexible
3. ✅ **PostgreSQL schema in repo** - Version-controlled database
4. ✅ **Rate limiting** - Prevent abuse
5. ✅ **Cron jobs for retries** - Better reliability
6. ✅ **Mobile support (Capacitor)** - If you want native apps later

### **Hybrid Approach (Recommended):**
```
Frontend: Next.js 15 + React 19 + shadcn/ui + React Query
Backend: Express.js (in repo) + PostgreSQL + AWS S3 + Lambda
Auth: Custom JWT (simpler than Cognito)
API: OpenAPI spec → auto-generated SDK
Mobile: Add Capacitor later if needed
```

---

## 🎯 Key Takeaways

1. **GAA webapp is more polished** - Better UI components, type safety, video streaming
2. **Jujitsu-clann is more transparent** - Backend code visible, easier to understand
3. **Hybrid approach is best** - Take GAA's frontend stack + Jujitsu's backend approach
4. **OpenAPI is valuable** - Auto-generated SDK saves time and prevents bugs
5. **Custom auth is simpler** - Unless you need Cognito's managed features

---

## 📝 Suggested GAA App Structure

```
gaa-app/
├── frontend/              # Next.js 15 (like GAA webapp)
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── api/generated/  # OpenAPI-generated SDK
│   │   └── contexts/
│   └── package.json
│
├── backend/               # Express.js (like Jujitsu)
│   ├── routes/           # API routes
│   ├── middleware/       # Auth, rate limiting
│   ├── utils/            # Database, JWT helpers
│   └── server.js
│
├── lambda/                # Video processing (like Jujitsu)
│   └── video-processor/
│
└── db/                    # Database schema (like Jujitsu)
    └── schema.sql
```

This gives you:
- ✅ Full-stack visibility (like Jujitsu)
- ✅ Rich UI components (like GAA)
- ✅ Type-safe API calls (like GAA)
- ✅ Simple, flexible auth (like Jujitsu)
- ✅ Easy local development (like Jujitsu)

