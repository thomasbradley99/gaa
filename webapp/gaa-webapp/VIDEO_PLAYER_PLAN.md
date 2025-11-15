# GAA Video Player System Plan

Based on analysis of existing video players:
- **jujitsu-clann**: Simple, clean custom controls
- **1-clann-webapp**: Complex with HLS.js, event timeline, autoplay
- **map-frontend**: Adaptive player (HLS + MP4 fallback), overlay timeline

---

## 🎯 Recommended Approach for GAA

**Start with jujitsu-clann simplicity, add HLS.js support, and event timeline overlay.**

---

## 📦 Components Needed

### 1. **VideoPlayer.tsx** (Core Player)
**Based on:** `jujitsu-clann/frontend/src/app/videos/components/VideoPlayer.tsx`

**Features:**
- Custom video controls (play/pause, seek, mute, skip ±5s)
- Auto-hiding controls on hover/interaction
- Buffering indicator
- Progress bar with click-to-seek
- Time display (current / total)
- Quality selector (auto/high/medium/low) - optional
- Support for:
  - Direct MP4 URLs (S3, VEO)
  - HLS streams (via HLS.js)
  - Fallback to MP4 if HLS fails

**Props:**
```typescript
interface VideoPlayerProps {
  videoUrl: string        // Primary video URL (MP4 or HLS)
  hlsUrl?: string         // Optional HLS manifest URL
  currentTime: number     // External time control
  onTimeUpdate: (time: number) => void
  onSeek: (time: number) => void
  events?: GameEvent[]    // Optional events for timeline
}
```

---

### 2. **VideoOverlayTimeline.tsx** (Event Timeline)
**Based on:** `map-frontend/src/components/video-player/video-overlay-timeline.tsx`

**Features:**
- Overlay timeline at bottom of video
- Event markers (scores, points, fouls, etc.)
- Color-coded by team (green/white for GAA)
- Click event to seek to timestamp
- Current time indicator
- Hover to show event details

**GAA Event Types:**
- Score (Goal) - Green marker
- Point - White marker  
- Foul - Yellow marker
- Card (Yellow/Black/Red) - Red marker
- Substitution - Blue marker

**Props:**
```typescript
interface VideoOverlayTimelineProps {
  events: GameEvent[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  teamFilter?: 'all' | 'home' | 'away'
}
```

---

### 3. **GameDetailPage.tsx** (`/games/[id]`)
**Layout:**
- Sidebar (left) - Game info, events list, filters
- Video player (center) - Full width, responsive
- Optional: Analysis sidebar (right) - if analysis exists

**Features:**
- Fetch game data with presigned URLs
- Display game metadata (title, team, date, status)
- Event list sidebar (click to seek)
- Video player with overlay timeline
- Mobile: Stack layout (video on top, sidebar below)

---

## 🔧 Technical Implementation

### HLS.js Integration
```typescript
import Hls from 'hls.js'

// Check if HLS is supported
if (Hls.isSupported() && hlsUrl) {
  const hls = new Hls()
  hls.loadSource(hlsUrl)
  hls.attachMedia(videoRef.current)
} else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
  // Native HLS support (Safari)
  videoRef.current.src = hlsUrl
} else {
  // Fallback to MP4
  videoRef.current.src = videoUrl
}
```

### Event Timeline Data Structure
```typescript
interface GameEvent {
  id: string
  type: 'score' | 'point' | 'foul' | 'card' | 'substitution'
  timestamp: number  // seconds
  team: 'home' | 'away'
  player?: string
  description?: string
  metadata?: {
    cardType?: 'yellow' | 'black' | 'red'
    scoreType?: 'goal' | 'point'
  }
}
```

### Video URL Priority
1. **HLS URL** (`hls_url` from DB) - Best for streaming
2. **S3 URL** (`video_url` if S3) - Direct MP4
3. **VEO URL** (`video_url` if VEO) - External embed/iframe?

---

## 📁 File Structure

```
frontend/src/
├── components/
│   └── games/
│       ├── VideoPlayer.tsx           # Core player component
│       ├── VideoOverlayTimeline.tsx  # Event timeline overlay
│       ├── GameHeader.tsx            # Game title, team, date
│       ├── EventList.tsx             # Sidebar event list
│       └── GameCard.tsx               # Already exists
├── app/
│   └── games/
│       └── [id]/
│           └── page.tsx              # Game detail page
└── lib/
    └── hls-utils.ts                  # HLS.js helper functions
```

---

## 🎨 Design Notes

### Colors (GAA Theme)
- **Home Team**: Green (`bg-green-600`)
- **Away Team**: White/Yellow (`bg-yellow-400`)
- **Timeline**: Dark gray with green accent
- **Controls**: White on dark overlay

### Responsive Behavior
- **Desktop**: Sidebar + video side-by-side
- **Tablet**: Video full width, sidebar below
- **Mobile**: Video full width, collapsible sidebar

---

## 🚀 Implementation Steps

1. **Install dependencies**
   ```bash
   cd frontend
   npm install hls.js
   ```

2. **Create VideoPlayer.tsx**
   - Copy from jujitsu-clann
   - Add HLS.js support
   - Add event timeline prop

3. **Create VideoOverlayTimeline.tsx**
   - Copy from map-frontend
   - Adapt for GAA event types
   - Use green/white team colors

4. **Create GameDetailPage**
   - Fetch game data
   - Layout with sidebar
   - Integrate VideoPlayer + Timeline

5. **Update backend** (if needed)
   - Ensure `hls_url` is returned in game data
   - Generate presigned URLs for S3 videos

---

## 📝 Key Differences from Reference Apps

### vs jujitsu-clann:
- ✅ Add HLS.js support
- ✅ Add event timeline overlay
- ✅ Support multiple video sources

### vs 1-clann-webapp:
- ❌ Remove complex autoplay segments
- ❌ Remove zoom functionality (for now)
- ✅ Keep simple event timeline

### vs map-frontend:
- ✅ Simpler - no adaptive player wrapper
- ✅ Direct HLS.js integration
- ✅ GAA-specific event types

---

## ✅ Success Criteria

- [ ] Video plays from S3 URLs
- [ ] Video plays from VEO URLs (if embeddable)
- [ ] HLS streaming works (if available)
- [ ] Event timeline shows markers
- [ ] Click event seeks to timestamp
- [ ] Mobile responsive
- [ ] Controls auto-hide/show
- [ ] Buffering indicator works

---

## 🔄 Future Enhancements (Post-MVP)

- [ ] Picture-in-picture mode
- [ ] Playback speed control
- [ ] Keyboard shortcuts (space, arrows)
- [ ] Fullscreen support
- [ ] Event filtering (by type, team)
- [ ] Event search
- [ ] Clip generation (select segment)
- [ ] Share specific timestamp

