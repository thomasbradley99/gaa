# GAA Webapp - Frontend

A Next.js frontend application for the GAA (Gaelic Athletic Association) video analysis platform. This is a client-side application that connects to AWS-hosted backend services.

## Architecture Overview

This is a **frontend-only** application. The backend services are hosted on AWS and accessed via API Gateway endpoints. The app uses:

- **Next.js 15** with React 19 for the UI
- **AWS Amplify** for authentication (Cognito User Pools)
- **OpenAPI-generated SDK** for API communication
- **TypeScript** for type safety

## Project Structure

```
map-frontend/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── dashboard/          # Protected dashboard routes
│   │   ├── join/               # Team invitation flow
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── auth/               # Authentication UI
│   │   ├── dashboard/          # Dashboard components
│   │   ├── landing-page/       # Landing page sections
│   │   ├── video-player/       # Video playback components
│   │   └── ui/                 # Reusable UI components (shadcn/ui)
│   ├── contexts/               # React context providers
│   │   ├── auth-context.tsx    # Authentication state
│   │   ├── team-context.tsx     # Team data
│   │   └── query-provider.tsx   # React Query setup
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core libraries
│   │   ├── api-client.ts        # Authenticated API client
│   │   ├── public-api-client.ts # Public API client (no auth)
│   │   ├── amplify.ts          # AWS Amplify configuration
│   │   └── api/generated/       # Auto-generated API SDK
│   └── types/                  # TypeScript type definitions
└── public/                     # Static assets
```

## Environment Variables

The app **requires** the following environment variables to run. Create a `.env.local` file in the root directory:

### Required Variables

```bash
# Public API endpoint (for unauthenticated routes like public game listings)
NEXT_PUBLIC_NO_AUTH_API_BASE_URL=https://your-public-api-url.com/

# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=your-client-id
NEXT_PUBLIC_AWS_REGION=eu-west-1
```

### Optional Variables

```bash
# Authenticated API endpoint (defaults to AWS API Gateway URL)
NEXT_PUBLIC_API_BASE_URL=https://ix2bldcnt9.execute-api.eu-west-1.amazonaws.com/prod/
```

**Note:** Without these variables, the app will crash on startup. The `public-api-client.ts` module throws an error if `NEXT_PUBLIC_NO_AUTH_API_BASE_URL` is missing.

## Authentication Flow

1. **User signs up/signs in** via AWS Cognito (configured in `src/lib/amplify.ts`)
2. **Cognito returns JWT tokens** (ID token and access token)
3. **API client intercepts requests** (`src/lib/api-client.ts`) and adds the ID token as a Bearer token in the Authorization header
4. **Backend validates** the JWT token and processes the request

The authentication state is managed by `src/contexts/auth-context.tsx` which wraps the app and provides auth state to all components.

## API Clients

### Authenticated Client (`api-client.ts`)

- Used for all protected routes (teams, games, videos, analyses, etc.)
- Automatically injects Cognito ID token in Authorization header
- Base URL: `NEXT_PUBLIC_API_BASE_URL` or defaults to AWS API Gateway

### Public Client (`public-api-client.ts`)

- Used for public routes (public game listings, public videos)
- No authentication required
- Base URL: `NEXT_PUBLIC_NO_AUTH_API_BASE_URL` (required)

## API SDK Generation

The API client SDK is auto-generated from an OpenAPI specification. The generation scripts in `package.json` expect the OpenAPI spec at:

```
../clannai-backend/docs/openapi/openapi.yaml
```

To regenerate the SDK:

```bash
npm run generate:all
```

This generates:
- TypeScript types in `src/types/api.ts`
- SDK functions in `src/lib/api/generated/`

## Available API Endpoints

The generated SDK includes endpoints for:

- **Users**: `/users`, `/users/me`, `/users/signup-with-invite`, `/users/join-team`
- **Teams**: `/teams`, `/teams/by-invite-code/{code}`
- **Members**: `/members`
- **Games**: `/games`
- **Videos**: `/videos`, `/videos/{id}/signed-url`, `/videos/{id}/process`
- **Analyses**: `/analyses`, `/videos/{id}/analyses`
- **Public**: `/public/games`, `/public/games/{id}`, `/public/videos/{id}`

See `src/lib/api/generated/sdk.gen.ts` for the complete list.

## Running the Application

### Development

```bash
npm install
npm run dev
```

The app will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Key Features

- **Landing Page**: Public-facing homepage with video background
- **Authentication**: Sign up, sign in, email verification via Cognito
- **Dashboard**: Protected area for managing teams, games, and videos
- **Video Player**: HLS video playback with event tagging and timeline
- **Team Management**: Create teams, invite members via invite codes
- **Game Management**: Upload and manage game videos
- **Video Analysis**: Process videos and view analyses

## Dependencies

- **Next.js 15**: React framework with App Router
- **AWS Amplify**: Authentication and AWS service integration
- **React Query**: Server state management and caching
- **shadcn/ui**: Component library (Radix UI + Tailwind)
- **HLS.js**: Video streaming for HLS format
- **Leaflet**: Map components for pitch finder

## Backend Connection

The backend is **not included** in this repository. It's hosted on AWS and consists of:

- **API Gateway**: REST API endpoints
- **AWS Cognito**: User authentication and authorization
- **Lambda Functions**: Backend logic (likely)
- **S3**: Video storage
- **Database**: User, team, game, and video data storage

The frontend connects to these services via the configured API endpoints and Cognito user pool.

## Troubleshooting

### App crashes on startup

- Check that all required environment variables are set in `.env.local`
- Verify `NEXT_PUBLIC_NO_AUTH_API_BASE_URL` is present (this is checked immediately)

### Authentication not working

- Verify Cognito credentials are correct
- Check browser console for Amplify configuration errors
- Ensure the Cognito user pool is in the correct AWS region

### API calls failing

- Check network tab for API request/response details
- Verify the API Gateway endpoints are accessible
- Check that JWT tokens are being included in Authorization headers (see console logs)

