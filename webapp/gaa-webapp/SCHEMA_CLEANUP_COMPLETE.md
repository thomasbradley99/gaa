# Schema Cleanup - Complete ✅

**Date:** 2025-11-20  
**Status:** 🟢 Master schema created, ready to implement

---

## What Changed

### 1. Created Master Schema (NEW)

**File:** `shared/EVENT_SCHEMA.ts`

**The ONE source of truth for all event data.**

```typescript
interface GameEvent {
  id: string
  time: number        // ✅ Absolute video time (from 0:00)
  team: "home" | "away"
  action: EventAction // ✅ "Shot" | "Kickout" | "Turnover" etc
  outcome: EventOutcome // ✅ "Point" | "Wide" | "Won" etc
  metadata?: EventMetadata
}
```

**Used by:**
- Lambda (outputs this format)
- Database (stores this format)
- Frontend (displays this format)
- XML converter (converts from this format)

---

### 2. Fixed Time Field

**Before:**
```typescript
time: 11  // Seconds from MATCH START 😵‍💫
// Video shows 5:11, but event says time=11
```

**After:**
```typescript
time: 311  // Seconds from VIDEO START ✅
// Video shows 5:11 (311s), event says time=311
```

**Why:** Matches what user sees in video player timeline.

---

### 3. Lambda Updated

**File:** `lambda/gaa-ai-analyzer/stages/stage_4_json_extraction.py`

**Change:**
```python
# Now tells Gemini to output ABSOLUTE video time
# Adds match_start offset to convert match time → video time
prompt = f"""
Match starts at {match_start} seconds in video.
Event at "1:05" in match → time = {match_start + 65} in video
"""
```

---

### 4. Frontend Types Updated

**File:** `frontend/src/components/games/video-player/types.ts`

**Before:** Defined its own `GameEvent` with wrong fields (`timestamp`, `type`)

**After:** Re-exports from master schema
```typescript
export type { GameEvent } from '@/shared/EVENT_SCHEMA'
```

---

### 5. Data Contract Updated

**File:** `docs/architecture/DATA_CONTRACT.md`

**Change:**
```typescript
time: 311  // NOW: Seconds from VIDEO START (0:00)
          // BEFORE: Seconds from match start
```

---

## What Still Needs Doing

### Critical (Must Do)

1. **Remove Transformation Layer**
   - File: `frontend/src/app/games/[id]/page.tsx`
   - Delete lines ~140-200 (event mapping logic)
   - Use events directly from DB

2. **Update Components** (~5 files)
   - Change `e.timestamp` → `e.time`
   - Change `e.type` → `e.action` + `e.outcome`
   - Files:
     - `GameStats.tsx`
     - `EventList.tsx`
     - `UnifiedSidebar.tsx`
     - `VideoOverlayTimeline.tsx`

3. **Delete Old Transformer**
   - File: `frontend/src/lib/event-transformer.ts`
   - No longer needed

---

## Testing Checklist

After implementing:

- [ ] Deploy updated Lambda Stage 4
- [ ] Submit test VEO URL
- [ ] Check CloudWatch logs: events have `time` as absolute video time
- [ ] Check database: `games.events` has absolute video time
- [ ] Check frontend: events display at correct video timeline position
- [ ] Verify: Video player at 5:11 shows event with `time: 311`

---

## Benefits

✅ **ONE schema** used everywhere  
✅ **No transformation** between Lambda → DB → Frontend  
✅ **Time matches video player** (no confusion)  
✅ **Easy to extend** (just update EVENT_SCHEMA.ts)  
✅ **Type-safe** (TypeScript validates all usages)

---

## Migration Notes

**Breaking Changes:**
- `timestamp` → `time`
- `type` → `action` + `outcome`
- Time is now absolute video time (not match-relative)

**Backward Compatibility:**
- Old events in DB might have match-relative time
- Consider migration script if needed
- Or just accept new events use new format

---

**Next Step:** Implement frontend changes (remove transformation, update components)

**Status:** 🟡 Schema ready, frontend implementation pending

