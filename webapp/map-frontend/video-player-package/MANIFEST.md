# Video Player Package Manifest

## Core Components (src/components/video-player/)
- `VideoPlayerWithEvents.tsx` - Main video player with event management
- `VideoPlayerContainer.tsx` - Video container with overlays and controls
- `EventsManager.tsx` - Events sidebar manager
- `sidebar-events-list.tsx` - Events list and filtering
- `adaptive-video-player.tsx` - Adaptive video player with HLS support
- `video-playback-controls.tsx` - Video playback controls
- `video-overlay-timeline.tsx` - Interactive timeline overlay
- `game-score-banner.tsx` - Game score display banner
- `types.ts` - TypeScript types for video player components

## UI Components (src/components/ui/)
- `button.tsx` - Button component
- `card.tsx` - Card component
- `badge.tsx` - Badge component
- `input.tsx` - Input component
- `sidebar.tsx` - Sidebar component
- `dropdown-menu.tsx` - Dropdown menu component
- `dialog.tsx` - Dialog component
- `loading-spinner.tsx` - Loading spinner component
- `tooltip.tsx` - Tooltip component
- `select.tsx` - Select component
- `separator.tsx` - Separator component
- `sheet.tsx` - Sheet component
- `skeleton.tsx` - Skeleton component
- `sonner.tsx` - Toast notifications
- `table.tsx` - Table component
- `tabs.tsx` - Tabs component
- `textarea.tsx` - Textarea component
- `toggle.tsx` - Toggle component
- `toggle-group.tsx` - Toggle group component

## Hooks (src/hooks/)
- `use-match-tagging.ts` - Hook for match tagging functionality
- `use-videos.ts` - Hook for video management
- `use-mobile.ts` - Hook for mobile detection
- `use-polling.ts` - Hook for polling functionality

## Types (src/types/)
- `api.ts` - API type definitions
- `tagging.ts` - Tagging type definitions
- `basketball.ts` - Basketball-specific types (if using basketball)

## Contexts (src/contexts/)
- `auth-context.tsx` - Authentication context
- `query-provider.tsx` - React Query provider
- `team-context.tsx` - Team context
- `team-tab-context.tsx` - Team tab context

## Library Files (src/lib/)
- `amplify.ts` - AWS Amplify configuration
- `api-client.ts` - API client configuration
- `jwt-utils.ts` - JWT utilities
- `utils.ts` - General utilities
- `api/generated/` - Generated API client files
  - `client.ts` - Generated client
  - `index.ts` - Generated index
  - `types.ts` - Generated types
  - `utils.ts` - Generated utilities
- `api/index.ts` - API exports

## Event Schemas (events/)
- `gaa_events_web_schema.json` - GAA events schema
- `basketball_events_web_schema.json` - Basketball events schema

## Configuration Files (config/)
- `package.json` - Package dependencies
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `components.json` - shadcn/ui configuration
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint configuration

## Total Files: ~40+ files
## Package Size: ~2-3 MB (estimated)

## Dependencies Required:
- @tanstack/react-query
- hls.js
- lucide-react
- sonner
- @radix-ui/react-* (multiple packages)
- class-variance-authority
- clsx
- tailwind-merge
- next
- react
- react-dom
- tailwindcss
- typescript 