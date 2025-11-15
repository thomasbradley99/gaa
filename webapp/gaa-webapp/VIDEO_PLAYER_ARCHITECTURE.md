# GAA Video Player - Complete Architecture Plan

## 📊 Analysis Summary

### Reference Implementations:

1. **jujitsu-clann** (Simple)
   - Single file: `VideoPlayer.tsx` (~320 lines)
   - Custom controls, auto-hide, basic video element
   - No HLS.js, no event timeline
   - ✅ Clean and simple
   - ❌ No streaming support, no events

2. **1-clann-webapp** (Complex)
   - Single massive file: `VideoPlayer.tsx` (~996 lines)
   - HLS.js integration, event timeline, autoplay segments
   - Voronoi tap regions, zoom, complex state
   - ✅ Feature-rich
   - ❌ Too complex, hard to maintain

3. **map-frontend** (Modular - BEST)
   - **VideoPlayerContainer.tsx** - Orchestrator (183 lines)
   - **AdaptiveVideoPlayer.tsx** - HLS + MP4 (440 lines)
   - **VideoPlaybackControls.tsx** - Controls (213 lines)
   - **VideoOverlayTimeline.tsx** - Timeline (210 lines)
   - **GameScoreBanner.tsx** - Banner overlay
   - ✅ Modular, maintainable, reusable
   - ✅ Clear separation of concerns
   - ✅ Easy to test and extend

---

## 🎯 GAA Video Player Architecture

**Based on map-frontend modular approach, simplified for GAA needs.**

---

## 📁 Component Structure

```
frontend/src/components/games/video-player/
├── VideoPlayerContainer.tsx      # Main orchestrator (composes all components)
├── AdaptiveVideoPlayer.tsx        # HLS.js + MP4 fallback player
├── VideoPlaybackControls.tsx     # Play/pause/seek/mute controls
├── VideoOverlayTimeline.tsx      # Event timeline overlay
├── GameHeader.tsx                 # Game title, team, date (optional overlay)
└── types.ts                       # TypeScript interfaces
```

---

## 🔧 Component Breakdown

### 1. **AdaptiveVideoPlayer.tsx** (~300 lines)
**Purpose:** Core video element with HLS.js support

**Responsibilities:**
- Initialize HLS.js if URL available
- Fallback to MP4 if HLS fails
- Handle video element events
- Expose video ref to parent
- Basic error handling

**Props:**
```typescript
interface AdaptiveVideoPlayerProps {
  hlsUrl?: string
  mp4Url: string              // Required fallback
  onTimeUpdate: (time: number, duration: number, isPlaying: boolean) => void
  onDurationChange?: (duration: number) => void
  className?: string
  autoPlay?: boolean
  muted?: boolean
}
```

**Key Features:**
- HLS.js initialization with error handling
- Native HLS support detection (Safari)
- MP4 fallback
- Video element ref exposure
- Time update callbacks

**Dependencies:**
- `hls.js`

---

### 2. **VideoPlaybackControls.tsx** (~200 lines)
**Purpose:** Custom playback controls overlay

**Responsibilities:**
- Play/pause button
- Seek bar with click-to-seek
- Skip backward/forward (±5s)
- Mute/unmute toggle
- Time display (current / total)
- Auto-hide on mouse leave (when playing)
- Show on hover/interaction

**Props:**
```typescript
interface VideoPlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSkipBackward: () => void
  onSkipForward: () => void
  onMuteToggle: () => void
  isMuted: boolean
  showControls: boolean        // Control visibility
}
```

**Key Features:**
- Auto-hiding controls
- Click-to-seek on progress bar
- Keyboard shortcuts (space, arrows)
- Smooth transitions

**Design:**
- Bottom overlay with gradient
- White controls on dark background
- Large play/pause button (center)
- Time display (monospace font)

---

### 3. **VideoOverlayTimeline.tsx** (~250 lines)
**Purpose:** Event timeline overlay above controls

**Responsibilities:**
- Display event markers on timeline
- Color-code by team (green/white for GAA)
- Click event to seek
- Hover tooltip with event details
- Current time indicator
- Previous/next event navigation

**Props:**
```typescript
interface VideoOverlayTimelineProps {
  events: GameEvent[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  teamFilter?: 'all' | 'home' | 'away'
  selectedEventTypes?: string[]  // Filter by event type
}

interface GameEvent {
  id: string
  type: 'score' | 'point' | 'foul' | 'card' | 'substitution'
  timestamp: number
  team: 'home' | 'away'
  player?: string
  description?: string
  metadata?: {
    cardType?: 'yellow' | 'black' | 'red'
    scoreType?: 'goal' | 'point'
  }
}
```

**Key Features:**
- Event markers positioned by timestamp
- Team color coding (green for home, white/yellow for away)
- Click marker to seek
- Hover tooltip
- Current event highlight
- Prev/next event buttons

**GAA Event Types:**
- **Score (Goal)** - Green circle, larger marker
- **Point** - Green circle, smaller marker
- **Foul** - Yellow circle
- **Card (Yellow/Black/Red)** - Red circle
- **Substitution** - Blue circle

**Design:**
- Timeline bar above controls
- Event markers as colored circles
- Current time indicator (white line)
- Hover tooltip above marker

---

### 4. **VideoPlayerContainer.tsx** (~150 lines)
**Purpose:** Main orchestrator that composes all components

**Responsibilities:**
- Manage video state (playing, currentTime, duration)
- Coordinate between components
- Handle video element reference
- Expose unified API to parent

**Props:**
```typescript
interface VideoPlayerContainerProps {
  videoUrl: string              // Primary MP4 URL
  hlsUrl?: string               // Optional HLS manifest
  events?: GameEvent[]          // Optional events for timeline
  onTimeUpdate?: (time: number, duration: number, isPlaying: boolean) => void
  onSeek?: (time: number) => void
  className?: string
  showTimeline?: boolean        // Show/hide event timeline
  showControls?: boolean        // Show/hide controls
  teamFilter?: 'all' | 'home' | 'away'
}
```

**State Management:**
```typescript
const [isPlaying, setIsPlaying] = useState(false)
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)
const [isMuted, setIsMuted] = useState(false)
const [showControls, setShowControls] = useState(false)
```

**Key Features:**
- Composes AdaptiveVideoPlayer + Controls + Timeline
- Manages video element reference
- Coordinates state between components
- Handles seek operations
- Auto-hide controls logic

---

### 5. **GameHeader.tsx** (~100 lines) - Optional
**Purpose:** Game metadata overlay (title, team, date)

**Props:**
```typescript
interface GameHeaderProps {
  title: string
  teamName?: string
  date?: string
  status?: 'pending' | 'processing' | 'analyzed' | 'failed'
  className?: string
}
```

**Design:**
- Top-left overlay
- Semi-transparent background
- Auto-hide when playing (optional)

---

## 🎨 Design Specifications

### Colors (GAA Theme)
- **Home Team**: Green (`bg-green-600`, `#16a34a`)
- **Away Team**: White/Yellow (`bg-yellow-400`, `#facc15`)
- **Timeline Background**: Dark gray (`bg-gray-800/40`)
- **Progress Bar**: Green (`bg-green-500`)
- **Controls**: White on dark overlay
- **Event Markers**: Team colors

### Layout
- **Video**: Full width, aspect-video (16:9)
- **Controls**: Bottom overlay, gradient background
- **Timeline**: Above controls, full width
- **Header**: Top-left overlay (optional)

### Responsive Behavior
- **Desktop**: Full controls, timeline visible
- **Tablet**: Same as desktop
- **Mobile**: Simplified controls, timeline visible

---

## 🔄 Data Flow

```
GameDetailPage
  ↓
VideoPlayerContainer (state manager)
  ↓
  ├─→ AdaptiveVideoPlayer (video element)
  │     └─→ HLS.js or MP4 fallback
  │
  ├─→ VideoPlaybackControls (user controls)
  │     └─→ Play/pause/seek/mute
  │
  └─→ VideoOverlayTimeline (event markers)
        └─→ Click to seek, hover tooltips
```

**State Flow:**
1. User interacts with controls → Updates video element
2. Video element fires `timeupdate` → Updates state
3. State updates → Timeline and controls re-render
4. User clicks event marker → Seeks video → Updates state

---

## 📝 Implementation Order

### Phase 1: Core Video Player
1. ✅ Install `hls.js` dependency
2. ✅ Create `AdaptiveVideoPlayer.tsx`
   - HLS.js initialization
   - MP4 fallback
   - Video element with callbacks
3. ✅ Create `types.ts` with interfaces

### Phase 2: Controls
4. ✅ Create `VideoPlaybackControls.tsx`
   - Play/pause button
   - Progress bar with seek
   - Skip buttons
   - Mute toggle
   - Time display
   - Auto-hide logic

### Phase 3: Timeline
5. ✅ Create `VideoOverlayTimeline.tsx`
   - Event markers
   - Team color coding
   - Click to seek
   - Hover tooltips
   - Prev/next navigation

### Phase 4: Container
6. ✅ Create `VideoPlayerContainer.tsx`
   - Compose all components
   - State management
   - Video ref handling
   - Seek coordination

### Phase 5: Integration
7. ✅ Create `/games/[id]/page.tsx`
   - Fetch game data
   - Layout with sidebar
   - Integrate VideoPlayerContainer
   - Event list sidebar

---

## 🎯 Key Design Decisions

### 1. **Modular Architecture**
- ✅ Separate concerns (video, controls, timeline)
- ✅ Reusable components
- ✅ Easy to test
- ✅ Easy to extend

### 2. **HLS.js Support**
- ✅ Try HLS first (best streaming)
- ✅ Fallback to MP4 (universal support)
- ✅ Native HLS for Safari

### 3. **Event Timeline**
- ✅ Overlay above controls
- ✅ Click markers to seek
- ✅ Team color coding
- ✅ Filter by team/type

### 4. **Controls**
- ✅ Auto-hide when playing
- ✅ Show on hover/interaction
- ✅ Large, accessible buttons
- ✅ Keyboard shortcuts

### 5. **State Management**
- ✅ Container manages state
- ✅ Components receive props
- ✅ Callbacks for updates
- ✅ Single source of truth

---

## 🚀 Usage Example

```typescript
// In GameDetailPage
<VideoPlayerContainer
  videoUrl={game.video_url}
  hlsUrl={game.hls_url}
  events={game.events || []}
  onTimeUpdate={(time, duration, isPlaying) => {
    // Update state if needed
  }}
  onSeek={(time) => {
    // Handle seek
  }}
  showTimeline={true}
  showControls={true}
  teamFilter={selectedTeamFilter}
/>
```

---

## ✅ Success Criteria

- [ ] Video plays from S3 URLs
- [ ] Video plays from VEO URLs (if embeddable)
- [ ] HLS streaming works (if available)
- [ ] MP4 fallback works
- [ ] Event timeline shows markers
- [ ] Click event seeks to timestamp
- [ ] Controls auto-hide/show
- [ ] Mobile responsive
- [ ] Keyboard shortcuts work
- [ ] Buffering indicator works

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "hls.js": "^1.6.7",
    "lucide-react": "^0.532.0"
  }
}
```

---

## 🔄 Future Enhancements

- [ ] Playback speed control
- [ ] Fullscreen support
- [ ] Picture-in-picture
- [ ] Event filtering UI
- [ ] Event search
- [ ] Clip generation
- [ ] Share timestamp
- [ ] Keyboard shortcuts (space, arrows)

---

**This architecture provides a clean, maintainable, and extensible video player system for GAA games.**

