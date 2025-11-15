# CLANN Video Player Reference Architecture

> **Source:** `/Users/thomasbradley/clann-repos/CLANNAI/web-apps/1-clann-webapp/frontend/src`
> 
> This document explains how the clann-webapp video player works so we can replicate it in the GAA app.

---

## 1. FULL-SCREEN LAYOUT ARCHITECTURE

### Clann-Webapp Layout (Fullscreen)

```
┌─────────────────────────────────────────────────────────────────┐
│ GameHeader (fixed top)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│              VIDEO PLAYER (h-screen, fills viewport)            │
│              No padding, no scroll                              │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                                 UnifiedSidebar →
                                                 (slides in from right)
```

**Key CSS:**
```jsx
<div className="h-screen bg-black relative overflow-hidden">
  <GameHeader />
  
  <div 
    className="relative h-full flex items-center justify-center"
    style={{
      marginRight: showSidebar ? `${sidebarWidth}px` : '0'
    }}
  >
    <VideoPlayer />
  </div>
  
  <UnifiedSidebar isOpen={showSidebar} />
</div>
```

---

### GAA Webapp Layout (Current - SCROLLABLE)

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar (permanent left)                                         │
├─────────────────────────────────────────────────────────────────┤
│  [max-w-7xl mx-auto px-6 py-8]    ← PADDING + MAX WIDTH         │
│  ┌────────────────────────────────────────────────────┐         │
│  │ Header/Back Button                                 │         │
│  │ Video (2/3 grid)              Events (1/3 grid)   │         │
│  │                                                     │         │
│  └────────────────────────────────────────────────────┘         │
│  Stats Section (below fold)                                     │
│  [padding]                                                       │
└─────────────────────────────────────────────────────────────────┘
     ↑ Scrollable page, not fullscreen
```

---

## 2. COMPONENT STRUCTURE

### File Organization

```
CLANN-WEBAPP:
├── app/games/[id]/page.tsx          // Layout wrapper
├── components/games/
│   ├── VideoPlayer.tsx              // Video + controls only
│   ├── UnifiedSidebar.tsx           // Events/AI/Insights tabs
│   └── GameHeader.tsx               // Top bar with scores

GAA-WEBAPP (Current):
├── app/games/[id]/page.tsx          // Page with grid layout
├── components/games/
│   ├── video-player/
│   │   ├── VideoPlayerContainer.tsx // Video wrapper
│   │   ├── AdaptiveVideoPlayer.tsx  // HLS player
│   │   └── VideoPlaybackControls.tsx
│   ├── EventList.tsx                // Events sidebar
│   └── GameStats.tsx                // Stats section
```

---

## 3. VIDEO PLAYER COMPONENT (VideoPlayer.tsx)

### Layer Stack (Z-Index Order)

```
┌─────────────────────────────────────────────────────────────────┐
│                      VIDEO CONTAINER (relative)                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    <video> (z-0)                           │  │
│  │                    - HLS.js or MP4                         │  │
│  │                    - transform: scale(zoomLevel)           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │     VORONOI TAP REGIONS (z-20) - 5 invisible zones       │  │
│  │  ┌─────┬─────┬─────┬─────┬─────┐                        │  │
│  │  │Prev │ -5s │Play │ +5s │Next │                        │  │
│  │  │Event│     │Pause│     │Event│  <- Flash on tap       │  │
│  │  │ 20% │ 20% │ 20% │ 20% │ 20% │                        │  │
│  │  └─────┴─────┴─────┴─────┴─────┘                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   FLOATING CONTROLS (z-30, bottom-16)                     │  │
│  │   ◀   -5s   ▶  PLAY/PAUSE ◀   +5s   ▶                   │  │
│  │   (auto-hide with overlayVisible prop)                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   TIMELINE BAR (z-40, bottom-0)                           │  │
│  │   0:00 [████████░░░░] 82:38  🔊 1x 🔍                   │  │
│  │        ↑ Event markers        ↑  ↑  ↑                    │  │
│  │                            Mute Speed Zoom                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Voronoi Tap Regions Explained

**What it is:** 5 invisible `<div>` elements that divide the video into tap zones

```jsx
<div className="absolute inset-0 z-20 pointer-events-auto">
  {/* Previous Event - Left 20% */}
  <div 
    className="absolute top-0 left-0 w-1/5 h-full cursor-pointer"
    onClick={() => triggerFlash('prev', handlePreviousEvent)}
  >
    <div className={`absolute inset-0 bg-blue-500 pointer-events-none 
                     transition-opacity duration-150 
                     ${flashRegion === 'prev' ? 'opacity-20' : 'opacity-0'}`} 
    />
  </div>
  
  {/* -5s Region - Left-Center 20% */}
  <div className="absolute top-0 left-1/5 w-1/5 h-full cursor-pointer"
       onClick={() => triggerFlash('back', handleJumpBackward)}>
    <div className="bg-yellow-500 opacity-0" />
  </div>
  
  {/* Play/Pause - Center 20% */}
  <div className="absolute top-0 left-2/5 w-1/5 h-full cursor-pointer"
       onClick={() => triggerFlash('play', handlePlayPause)}>
    <div className="bg-green-500 opacity-0" />
  </div>
  
  {/* +5s Region - Right-Center 20% */}
  <div className="absolute top-0 left-3/5 w-1/5 h-full cursor-pointer"
       onClick={() => triggerFlash('forward', handleJumpForward)}>
    <div className="bg-orange-500 opacity-0" />
  </div>
  
  {/* Next Event - Right 20% */}
  <div className="absolute top-0 left-4/5 w-1/5 h-full cursor-pointer"
       onClick={() => triggerFlash('next', handleNextEvent)}>
    <div className="bg-purple-500 opacity-0" />
  </div>
</div>
```

**Flash Feedback:**
```jsx
const triggerFlash = (region: string, action: () => void) => {
  setFlashRegion(region)
  setTimeout(() => setFlashRegion(null), 150)
  action()
}
```

When you tap a region, the colored overlay flashes for 150ms to give visual feedback.

---

## 4. HOVER DROPDOWN MENUS (Speed & Zoom)

### Pattern: Tailwind `group` + Hover

```jsx
{/* Speed Control */}
<div className="relative group">
  {/* Button - always visible */}
  <button className="text-white text-xs">1x</button>
  
  {/* Invisible bridge - prevents menu from closing when moving mouse */}
  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 
                  w-8 h-2 opacity-0 
                  group-hover:opacity-100 
                  pointer-events-none 
                  group-hover:pointer-events-auto" />
  
  {/* Popup menu - appears on hover */}
  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 
                  bg-black/90 rounded-lg p-3 
                  opacity-0 
                  group-hover:opacity-100 
                  transition-all duration-200 
                  pointer-events-none 
                  group-hover:pointer-events-auto 
                  shadow-lg">
    <div className="flex flex-col gap-1">
      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5].map((speed) => (
        <button
          key={speed}
          onClick={() => handleSpeedChange(speed)}
          className={`px-3 py-2 text-xs rounded ${
            playbackSpeed === speed 
              ? 'bg-blue-600 text-white' 
              : 'text-white hover:bg-white/20'
          }`}
        >
          {speed}x
        </button>
      ))}
    </div>
  </div>
</div>
```

**Key Points:**
- `group` on parent div
- `group-hover:opacity-100` on popup
- `pointer-events-none` until hover (prevents accidental clicks)
- Invisible bridge div prevents menu from disappearing when moving mouse

---

## 5. SMART TIMELINE WITH EVENT MARKERS

### Function: `generateSmartTimelineBackground()`

```jsx
const generateSmartTimelineBackground = () => {
  if (!duration) return 'rgba(255,255,255,0.3)'
  
  // If no events, show simple progress
  if (!allEvents.length) {
    const progressPercent = (currentTime / duration) * 100
    return `linear-gradient(to right, 
      #016F32 0%, 
      #016F32 ${progressPercent}%, 
      rgba(255,255,255,0.3) ${progressPercent}%, 
      rgba(255,255,255,0.3) 100%)`
  }
  
  // Create timeline segments with team colors
  let gradientStops = []
  const sortedEvents = [...allEvents].sort((a, b) => a.timestamp - b.timestamp)
  
  sortedEvents.forEach((event) => {
    const eventPercent = (event.timestamp / duration) * 100
    const eventColor = getTimelineEventColor(event) // Red/Blue based on team
    
    // Add grey background before event
    // Add colored segment (1% wide) for event
    // Continue...
  })
  
  return `linear-gradient(to right, ${gradientStops.join(', ')})`
}
```

### Team Color Extraction

```jsx
const redTeam = game.metadata?.teams?.red_team || { name: 'Red Team', jersey_color: '#DC2626' }
const blueTeam = game.metadata?.teams?.blue_team || { name: 'Blue Team', jersey_color: '#2563EB' }

const getTeamCSSColor = (jerseyColor: string) => {
  const color = jerseyColor.toLowerCase().trim()
  
  // Handle descriptive names
  if (color.includes('orange bibs')) return '#F97316'
  if (color.includes('non bibs')) return '#FFFFFF'
  if (color.includes('blue bibs')) return '#3B82F6'
  
  // Handle basic colors
  switch (color.split(' ')[0]) {
    case 'blue': return '#3B82F6'
    case 'red': return '#DC2626'
    case 'green': return '#22C55E'
    default: return '#6B7280'
  }
}
```

**Timeline Result:**
```
[████ Red Team Goal ░░░ Grey Gap ████ Blue Team Shot ░░░░]
 ↑ Team color         ↑ Neutral    ↑ Team color
```

---

## 6. HLS + MP4 FALLBACK

### Priority Chain

```jsx
useEffect(() => {
  const video = videoRef.current
  if (!video) return

  // 1. Try HLS.js (Chrome, Firefox, Edge)
  if (game.hlsUrl && Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
    })
    hls.loadSource(game.hlsUrl)
    hls.attachMedia(video)
    
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        // Fallback to MP4
        video.src = game.s3Url
      }
    })
  } 
  // 2. Native HLS (Safari)
  else if (game.hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = game.hlsUrl
  } 
  // 3. MP4 Fallback
  else {
    video.src = game.s3Url
  }
}, [game.hlsUrl, game.s3Url])
```

---

## 7. UNIFIED SIDEBAR TABS

### Structure

```jsx
<UnifiedSidebar 
  isOpen={showSidebar}
  activeTab={sidebarTab}  // 'events' | 'ai' | 'insights' | 'players'
  onTabChange={setSidebarTab}
  
  // Events tab props
  events={filteredEvents}
  onEventClick={handleEventClick}
  eventTypeFilters={eventTypeFilters}
  teamFilter={teamFilter}
  
  // AI tab props
  // ...
  
  // Insights tab props
  tacticalData={tacticalData}
  tacticalLoading={tacticalLoading}
/>
```

### Tabs

1. **Events** - Filtered list of game events, click to seek
2. **AI** - AI coach chat interface
3. **Insights** - Tactical analysis, heat maps
4. **Players** - Player stats and performance

---

## 8. MOBILE RESPONSIVE LAYOUT

### Desktop (Landscape)

```
┌─────────────────────────────────────────────────────┐
│ GameHeader                                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│           VIDEO PLAYER (centered)                   │
│           marginRight: {sidebarWidth}px              │
│                                                      │
└─────────────────────────────────────────────────────┘
                                        UnifiedSidebar →
                                        (fixed right, 400px)
```

### Mobile (Portrait)

```
┌─────────────────────────────┐
│                              │
│      VIDEO PLAYER            │
│      (aspect-video)          │
│                              │
├─────────────────────────────┤
│                              │
│   UNIFIED SIDEBAR            │
│   (scrollable below video)   │
│   - Tabs                     │
│   - Events                   │
│   - AI                       │
│   - Insights                 │
│                              │
└─────────────────────────────┘
```

**Code:**
```jsx
const { isLandscape, isPortrait } = useOrientation()

return (
  <div className="min-h-screen bg-black">
    {isLandscape ? (
      // Desktop: Video centered, sidebar on right
      <div className="h-screen">
        <VideoPlayer />
        <UnifiedSidebar isOpen={showSidebar} />
      </div>
    ) : (
      // Mobile: Video on top, sidebar below (YouTube style)
      <div>
        <UnifiedSidebar 
          isMobile={true}
          mobileVideoComponent={<MobileVideoPlayer />}
        />
      </div>
    )}
  </div>
)
```

---

## 9. AUTO-HIDE CONTROLS (Mobile)

### Pattern

```jsx
const [showOverlay, setShowOverlay] = useState(true)
const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

const resetHideTimer = useCallback(() => {
  if (hideTimeoutRef.current) {
    clearTimeout(hideTimeoutRef.current)
  }
  
  setShowOverlay(true)
  hideTimeoutRef.current = setTimeout(() => {
    setShowOverlay(false)
  }, 4000) // Hide after 4 seconds
}, [])

// Pass to VideoPlayer
<VideoPlayer
  overlayVisible={showOverlay}
  onUserInteract={resetHideTimer}
/>
```

**In VideoPlayer:**
```jsx
<div
  onMouseMove={onUserInteract}
  onClick={onUserInteract}
>
  {/* Floating controls */}
  <div className={`transition-opacity ${overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    {/* Controls */}
  </div>
</div>
```

---

## 10. KEY DIFFERENCES: CLANN vs GAA

| Feature | CLANN-Webapp | GAA-Webapp (Current) |
|---------|--------------|----------------------|
| **Layout** | `h-screen` fullscreen | `max-w-7xl` scrollable |
| **Video** | Fills viewport | 2/3 grid column |
| **Sidebar** | Slides over video | Permanent left nav |
| **Controls** | Floating + bottom bar | Embedded in video |
| **Speed/Zoom** | Hover dropdowns | Top-right panels |
| **Mobile** | Voronoi tap zones | Standard buttons |
| **Events** | Right sidebar tabs | Right grid column |
| **Stats** | In sidebar tabs | Below fold |
| **Scroll** | No scroll, fixed | Scrollable page |

---

## 11. IMPLEMENTATION PLAN FOR GAA

### Phase 1: Layout
- [ ] Change page to `h-screen` fullscreen
- [ ] Remove `max-w-7xl` container
- [ ] Make video player fill viewport
- [ ] Move sidebar to slide-over (not grid)

### Phase 2: Video Player
- [ ] Add Voronoi tap regions
- [ ] Add flash feedback
- [ ] Move speed/zoom to hover dropdowns in timeline
- [ ] Implement smart timeline with team colors

### Phase 3: Sidebar
- [ ] Create UnifiedSidebar component
- [ ] Add tabs: Events, Stats, AI (future)
- [ ] Slide-in animation from right
- [ ] Mobile: Below video (YouTube style)

### Phase 4: Mobile
- [ ] Auto-hide controls (4s timeout)
- [ ] Orientation detection
- [ ] Safe area insets
- [ ] Touch-optimized controls

---

## 12. FILE STRUCTURE TO CREATE

```
gaa-webapp/frontend/src/
├── app/games/[id]/
│   └── page.tsx              // NEW: Fullscreen layout
├── components/games/
│   ├── VideoPlayer.tsx       // NEW: Single file player (like clann)
│   ├── UnifiedSidebar.tsx    // NEW: Tabs sidebar
│   └── GameHeader.tsx        // NEW: Top bar
└── hooks/
    └── useOrientation.ts     // NEW: Detect landscape/portrait
```

---

## 13. REFERENCES

- **Clann VideoPlayer:** `/Users/thomasbradley/clann-repos/CLANNAI/web-apps/1-clann-webapp/frontend/src/components/games/VideoPlayer.tsx`
- **Clann Page Layout:** `/Users/thomasbradley/clann-repos/CLANNAI/web-apps/1-clann-webapp/frontend/src/app/games/[id]/page.tsx`
- **Clann UnifiedSidebar:** `/Users/thomasbradley/clann-repos/CLANNAI/web-apps/1-clann-webapp/frontend/src/components/games/UnifiedSidebar.tsx`

---

**Next Steps:** Review this document, then we'll rebuild the GAA video player to match this architecture.

