# Interactive Video Player Package

This package contains all the essential components to recreate the ClannAI interactive video player system on a new virtual machine.

## 📁 Package Contents

```
video-player-package/
├── components/
│   ├── video-player/           # Core video player components
│   │   ├── VideoPlayerWithEvents.tsx
│   │   ├── VideoPlayerContainer.tsx
│   │   ├── EventsManager.tsx
│   │   ├── sidebar-events-list.tsx
│   │   ├── adaptive-video-player.tsx
│   │   ├── video-playback-controls.tsx
│   │   ├── video-overlay-timeline.tsx
│   │   ├── game-score-banner.tsx
│   │   └── types.ts
│   └── ui/                     # UI components (shadcn/ui)
├── hooks/                      # React hooks for state management
│   ├── use-match-tagging.ts
│   ├── use-videos.ts
│   ├── use-mobile.ts
│   └── use-polling.ts
├── types/                      # TypeScript type definitions
├── contexts/                   # React context providers
├── lib/                        # Utilities and API client
├── events/                     # Event schemas
├── config/                     # Configuration files
└── README.md                   # This file
```

## 🚀 Quick Setup

### 1. Prerequisites
- Node.js 18+ 
- npm or yarn
- Next.js project (or create new one)

### 2. Create New Next.js Project (if needed)
```bash
npx create-next-app@latest my-video-player --typescript --tailwind --eslint --app
cd my-video-player
```

### 3. Install Dependencies
```bash
npm install @tanstack/react-query hls.js lucide-react sonner @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-separator class-variance-authority clsx tailwind-merge
```

### 4. Copy Files to Your Project
```bash
# Copy components
cp -r components/* src/components/

# Copy hooks
cp -r hooks/* src/hooks/

# Copy types
cp -r types/* src/types/

# Copy contexts
cp -r contexts/* src/contexts/

# Copy lib
cp -r lib/* src/lib/

# Copy events (to project root)
cp -r events ./

# Copy config files to project root
cp config/components.json ./
```

### 5. Update Configuration Files

#### Update `package.json` dependencies:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "hls.js": "^1.4.0",
    "lucide-react": "^0.400.0",
    "sonner": "^1.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-separator": "^1.0.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "next": "15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

#### Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 6. Add CSS Variables
Add to your `globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 94.1%;
    --sidebar-primary-foreground: 240 5.9% 10%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}
```

### 7. Setup React Query Provider
Wrap your app with the QueryProvider from `src/contexts/query-provider.tsx`.

## 🎮 Usage

### Basic Video Player
```tsx
import { VideoPlayerWithEvents } from '@/components/video-player/VideoPlayerWithEvents'

function VideoPage() {
  return (
    <VideoPlayerWithEvents
      gameId="your-game-id"
      videoId="your-video-id"
      teamId="your-team-id"
      showGameScoreBanner={true}
      showVideoTimeline={true}
      showVideoControls={true}
      showEventsManager={true}
      className="min-h-screen bg-gray-50"
    />
  )
}
```

### With Custom Event Handling
```tsx
import { VideoPlayerWithEvents } from '@/components/video-player/VideoPlayerWithEvents'

function VideoPage() {
  const handleVideoChange = (video) => {
    console.log('Video changed:', video)
  }

  const handleEventsChange = (events) => {
    console.log('Events updated:', events)
  }

  return (
    <VideoPlayerWithEvents
      gameId="your-game-id"
      videoId="your-video-id"
      onVideoChange={handleVideoChange}
      onEventsChange={handleEventsChange}
    />
  )
}
```

## 🔧 API Configuration

Update the API client configuration in `src/lib/api-client.ts` to point to your backend:

```typescript
export const client = createClient({
  baseUrl: 'https://your-api-endpoint.com',
  // Add your authentication headers
})
```

## ✨ Features

- **Adaptive Video Streaming**: Supports HLS and MP4 formats
- **Interactive Timeline**: Click to seek, visual event markers
- **Event Management**: Tag, edit, delete events in real-time
- **Team Management**: Track scores, possession, player counts
- **Fullscreen Support**: Full video player experience
- **Keyboard Shortcuts**: F for fullscreen, Esc to exit
- **Event Filtering**: Filter by team, action type, outcomes
- **Export Functionality**: Export events to CSV/JSON
- **Sample Data**: Generate realistic sample events for testing
- **Match Time Markers**: Track halftime, full-time markers
- **Mobile Responsive**: Works on desktop and mobile devices

## 🎯 Event Types Supported

### GAA Events
- Throw-up, Turnover, Kickout, Kick-in
- Shot (1Point, 2Point, Goal, Wide, Saved)
- Foul, Yellow Card, Black Card, Red Card
- Half Time Whistle, Full Time Whistle

### Basketball Events (if using basketball schema)
- Shot (2Point, 3Point, FreeThrow, Miss)
- Foul, Rebound, Turnover, Assist, Steal, Block
- Timeout, Substitution, Technical, Fast Break

## 🐛 Troubleshooting

### Common Issues

1. **Video not loading**: Check video URL and format support
2. **Events not saving**: Verify API client configuration
3. **Styling issues**: Ensure Tailwind CSS is properly configured
4. **TypeScript errors**: Check import paths and type definitions

### Dependencies Issues
If you encounter dependency conflicts, try:
```bash
npm install --legacy-peer-deps
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

## 🤝 Support

For issues or questions about the video player implementation, refer to the original ClannAI project or create a new issue in your project repository.

---

**Happy coding! 🚀** 