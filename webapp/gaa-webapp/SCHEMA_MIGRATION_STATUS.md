# Schema Migration Status

**Date:** 2025-11-20  
**Status:** 🟡 70% Complete

---

## ✅ Completed

### 1. Master Schema Created
- **File:** `shared/EVENT_SCHEMA.ts`
- Single source of truth for all events
- Defines: `GameEvent`, `EventAction`, `EventOutcome`, `EventMetadata`

### 2. Lambda Updated
- **File:** `lambda/gaa-ai-analyzer/stages/stage_4_json_extraction.py`
- Outputs absolute video time (not match-relative)
- Uses correct schema: `time`, `action`, `outcome`

### 3. Frontend Transformation Removed
- **File:** `frontend/src/app/games/[id]/page.tsx`
- ❌ Deleted 40+ lines of transformation logic
- ✅ Events now used directly from database

### 4. All Components Updated for `.time`
- ✅ `VideoPlayer.tsx` - `timestamp` → `time`
- ✅ `UnifiedSidebar.tsx` - `timestamp` → `time`
- ✅ `EventList.tsx` - `timestamp` → `time`
- ✅ `VideoOverlayTimeline.tsx` - `timestamp` → `time`
- ✅ `VideoPlayerContainer.tsx` - `timestamp` → `time`
- ✅ `XmlUpload.tsx` - `timestamp` → `time`

### 5. GameStats Updated for `.action/.outcome`
- ✅ Shots: `e.action === 'Shot'` (not `e.type === 'shot'`)
- ✅ Points: `e.outcome === 'Point'` (not `e.type === 'point'`)
- ✅ Kickouts: `e.action === 'Kickout'`
- ✅ Turnovers: `e.action === 'Turnover'`
- ✅ Fouls: `e.action === 'Foul'`

---

## ⚠️ Still TODO (30%)

### 6. EventList Display Logic
**File:** `frontend/src/components/games/EventList.tsx`

**Lines to fix:**
```typescript
// Line 34: Filter logic
const typeMatch = selectedEventType === 'all' || e.type === selectedEventType
// CHANGE TO: Check e.action or e.outcome

// Line 41-49: Icon selection
if (event.type === 'shot') { ... }
if (event.type === 'card') { ... }
// CHANGE TO: Use e.action

// Line 56: Display logic
event.type.charAt(0).toUpperCase() + event.type.slice(1)
// CHANGE TO: Display e.action or e.outcome
```

### 7. UnifiedSidebar Display Logic
**File:** `frontend/src/components/games/UnifiedSidebar.tsx`

**Lines to fix:**
```typescript
// Line 352: Type check
const type = event.type?.toLowerCase() || ''
// CHANGE TO: Use e.action.toLowerCase()

// Line 865-866, 946: Display
event.type.charAt(0).toUpperCase()
// CHANGE TO: event.action
```

### 8. VideoOverlayTimeline Display
**File:** `frontend/src/components/games/video-player/VideoOverlayTimeline.tsx`

**Lines to fix:**
```typescript
// Line 54: Filter
selectedEventTypes.includes(e.type)
// CHANGE TO: selectedEventTypes.includes(e.action.toLowerCase())

// Line 183: Title
title={`${event.type} - ${formatTime(event.time)}`}
// CHANGE TO: title={`${event.action} - ${event.outcome}`}

// Line 186: Icon
getEventIcon(event.type)
// CHANGE TO: getEventIcon(event.action.toLowerCase())
```

### 9. Delete Old Transformer
**File:** `frontend/src/lib/event-transformer.ts`

**Action:** Delete entire file (no longer used)

---

## 🧪 Testing Required

After completing remaining changes:

1. **Deploy Lambda** - Test absolute video time works
2. **Upload Test Game** - Verify events display correctly
3. **Check Timeline** - Events show at correct video position
4. **Test Filters** - Point/Wide/Goal filters work
5. **Verify Stats** - Score calculation correct

---

## 📊 Expected Behavior After Migration

**Before (old schema):**
```json
{
  "id": "evt_1",
  "timestamp": 11,
  "type": "point"
}
```

**After (new schema):**
```json
{
  "id": "evt_1", 
  "time": 311,
  "action": "Shot",
  "outcome": "Point"
}
```

**Frontend display:**
- Video player at 5:11 (311s) shows event
- Stats tab shows "HOME 0-04" (counts `outcome === 'Point'`)
- Events tab shows "Shot - Point" at 5:11

---

## 🔥 Breaking Changes

**Old events in DB might break if they have:**
- `timestamp` instead of `time`
- `type` instead of `action`
- Match-relative time instead of absolute

**Solution:** Re-analyze old games or accept they use old format.

---

**Commits:**
- `d0c206a` - Master schema created
- `6662988` - Frontend transformation removed, `.time` updated

**Next:** Complete remaining display logic changes (30% left)

