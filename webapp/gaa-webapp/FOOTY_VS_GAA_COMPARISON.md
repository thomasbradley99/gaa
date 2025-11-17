# 🏈 GAA App vs ⚽ Footy App - Feature Comparison

## Executive Summary

The **Footy app** has significantly more advanced event management and clip download features than the GAA app. This document outlines what we should port over.

---

## ✅ Features GAA Already Has (From Recent Work)

1. **Autoplay Event Mode** - Automatically plays through events with padding
2. **Smart Team-Colored Timeline** - Event dots on timeline with team colors
3. **Keyboard Shortcuts** - Arrow keys for event navigation
4. **Flash Feedback** - Visual feedback on tap regions
5. **Team Color Intelligence** - Uses team metadata for colors
6. **User Seeking Protection** - Prevents autoplay interference
7. **Basic Event List** - Shows events in sidebar
8. **XML Upload** - Temporary event loading (frontend only)

---

## 🚀 Major Features Missing from GAA (That Footy Has)

### 1. **Apple-Style Event Trimmer** ⭐⭐⭐
**Component:** `AppleStyleTrimmer.tsx`

- Individual padding control for each event (0-15s before/after)
- Visual timeline with draggable handles
- Shows playhead position (current time marker)
- Tick marks at 5-second intervals
- Event marker at center

**Why it's cool:**
- Users can fine-tune exactly when each event clip starts/ends
- Visual feedback makes it intuitive
- Perfect for creating highlight reels

**Status:** ❌ Not in GAA

---

### 2. **Edit Mode** ⭐⭐⭐
**Location:** `UnifiedSidebar.tsx` (lines 1080-1330)

Features:
- Toggle "Edit" button to enter edit mode
- Add new events at current video time
- Edit event details (type, team, player, description, timestamp)
- Delete events (soft delete to "bin")
- Bulk edit mode for multiple events
- Save changes to database

**Status:** ❌ Not in GAA

---

### 3. **Download Mode with Async Processing** ⭐⭐⭐
**Components:** 
- `UnifiedSidebar.tsx` (download mode section)
- `useClipProcessing.ts` hook
- Backend: async clip processing API

Features:
- Select multiple events to download
- Individual padding control per event
- Async job processing (no timeouts)
- Job status polling every 2 seconds
- Progress messages ("Processing...", "Ready!", etc.)
- Download ready clips as MP4

**Backend Architecture:**
```
1. Frontend creates clip job → Backend returns jobId
2. Backend processes in background using Lambda/FFmpeg
3. Frontend polls job status every 2s
4. When complete, user downloads MP4
```

**Status:** ❌ Not in GAA (XML upload is frontend-only)

---

### 4. **Binned Events (Soft Delete)** ⭐⭐
**Location:** `UnifiedSidebar.tsx` (lines 1734-1793)

Features:
- Deleted events go to "bin" section at bottom
- Shows count: "🗑️ Deleted Events (5)"
- Can restore binned events
- Preserves all event data

**Status:** ❌ Not in GAA

---

### 5. **Event Persistence** ⭐⭐⭐
**Backend:** Events API with PUT/POST endpoints

Features:
- Save event edits to database
- Persist padding data per event
- Track deleted events (isDeleted flag)
- Restore event history
- Auto-save on changes

**GAA Status:** 
- ✅ Backend can store events (upload-demo-events.js)
- ❌ No edit/update functionality
- ❌ No padding persistence

---

### 6. **Better Event Type Filters** ⭐
**Location:** `UnifiedSidebar.tsx` (lines 980-1074)

Features:
- Smart toggle behavior:
  - All selected → Click one → Show only that one
  - One selected → Click it → Show all
  - Otherwise → Normal toggle
- Color-coded filter buttons
- Reset all filters button
- Event type specific emojis

**GAA Status:** 
- ✅ Has team filter (home/away/all)
- ❌ No event type filters (shots, goals, etc.)

---

### 7. **Player Name Field** ⭐
Events have `player` field for tracking who did what.

**Example:**
```typescript
{
  type: 'goal',
  timestamp: 145,
  team: 'home',
  player: '#10 - Messi',  // ← This!
  description: 'Top corner strike'
}
```

**GAA Status:** ❌ No player field

---

### 8. **Sidebar Resize** ⭐
Draggable resize handle to adjust sidebar width (400px default).

**GAA Status:** ✅ Fixed width (looks fine)

---

### 9. **Event Creation at Current Time** ⭐⭐
"Add Event" button creates new event at current video timestamp.

**GAA Status:** ❌ Not available

---

## 📊 Feature Priority Matrix

| Feature | Impact | Effort | Priority | Notes |
|---------|--------|--------|----------|-------|
| **Edit Mode** | 🔥🔥🔥 | 🛠️🛠️🛠️ | **HIGH** | Critical for coaches to fix AI errors |
| **Apple Trimmer** | 🔥🔥🔥 | 🛠️🛠️ | **HIGH** | Makes highlight reels professional |
| **Download Mode** | 🔥🔥🔥 | 🛠️🛠️🛠️🛠️ | **HIGH** | Core value prop, needs backend |
| **Event Persistence** | 🔥🔥🔥 | 🛠️🛠️ | **HIGH** | Without this, edits are lost |
| **Binned Events** | 🔥🔥 | 🛠️ | **MEDIUM** | Nice UX improvement |
| **Event Type Filters** | 🔥🔥 | 🛠️ | **MEDIUM** | GAA has different event types |
| **Player Field** | 🔥 | 🛠️ | **LOW** | Nice to have |
| **Add Event Button** | 🔥🔥 | 🛠️ | **MEDIUM** | Useful for manual tagging |

---

## 🎯 Recommended Implementation Order

### Phase 1: Core Editing (1-2 days)
1. ✅ **Event Type Filters** - Add filters for GAA event types
2. ✅ **Edit Mode Toggle** - Add edit button to sidebar
3. ✅ **Edit Event Details** - Inline editing of events
4. ✅ **Delete to Bin** - Soft delete with restore
5. ✅ **Event Persistence API** - Backend endpoints to save changes

### Phase 2: Advanced Trimming (1 day)
6. ✅ **Apple-Style Trimmer** - Port component from footy app
7. ✅ **Individual Padding** - Per-event padding controls
8. ✅ **Persist Padding** - Save padding to database

### Phase 3: Clip Downloads (2-3 days)
9. ✅ **Download Mode UI** - Event selection interface
10. ✅ **Async Clip Processing** - Backend Lambda job system
11. ✅ **Job Status Polling** - Frontend hook for progress
12. ✅ **Download Ready Clips** - Final download flow

### Phase 4: Polish (0.5 day)
13. ✅ **Add Event Button** - Create events at current time
14. ✅ **Player Name Field** - Optional player tracking

---

## 🔍 Key Code References

### Footy App
- **VideoPlayer:** `/CLANNAI/web-apps/1-clann-webapp/frontend/src/components/games/VideoPlayer.tsx`
- **Sidebar:** `/CLANNAI/web-apps/1-clann-webapp/frontend/src/components/games/UnifiedSidebar.tsx`
- **Trimmer:** `/CLANNAI/web-apps/1-clann-webapp/frontend/src/components/games/AppleStyleTrimmer.tsx`
- **Clip Hook:** `/CLANNAI/web-apps/1-clann-webapp/frontend/src/hooks/useClipProcessing.ts`

### GAA App
- **VideoPlayer:** `/gaa/webapp/gaa-webapp/frontend/src/components/games/VideoPlayer.tsx`
- **Sidebar:** `/gaa/webapp/gaa-webapp/frontend/src/components/games/UnifiedSidebar.tsx`
- **Backend:** `/gaa/webapp/gaa-webapp/backend/routes/games.js`

---

## 💡 Architecture Notes

### Event Persistence Strategy
```typescript
// Event structure in database (JSONB column)
{
  match_info: { ... },
  events: [
    {
      id: 'event_1',
      type: 'shot',
      timestamp: 23,
      team: 'home',
      player: '#12',  // NEW
      description: 'Wide shot',
      beforePadding: 5,  // NEW - per-event padding
      afterPadding: 3,   // NEW
      isDeleted: false   // NEW - soft delete flag
    }
  ],
  updated_at: '2025-11-17T...'
}
```

### Download Flow
```
User → Selects events → Click "Download"
  ↓
Frontend → POST /api/games/:id/clips/create
  ↓
Backend → Creates job, stores in DB → Returns jobId
  ↓
Backend → Processes async (Lambda/FFmpeg)
  ↓
Frontend → Polls GET /api/clips/:jobId/status every 2s
  ↓
Backend → Returns { status: 'completed', downloadUrl: '...' }
  ↓
Frontend → Downloads MP4 from S3
```

---

## 🤔 Questions for User

1. **Do we want the full download system now?** (requires backend work)
2. **Should we start with just Edit Mode first?** (simpler, still very useful)
3. **How do GAA event types differ from footy?** (shots, points, frees, etc.)
4. **Do coaches care about player names?** (or just team-level analysis)

---

## Next Steps

Let me know which phase you want to start with, and I'll begin implementation!

**My Recommendation:** Start with **Phase 1 (Core Editing)** - it's the highest value with reasonable effort and doesn't require complex backend infrastructure.

