# DATA DISCONNECT FIX PLAN

## ROOT CAUSE IDENTIFIED ✅

### The Problem:
**Database stores events as a NESTED object:**
```javascript
game.events = {
  events: [        // ← Array is HERE
    {id: "event_001", team: "home", time: 11, action: "Shot", ...},
    {id: "event_002", team: "away", time: 40, action: "Kickout", ...}
  ],
  match_info: {...},
  team_mapping: {red: "home", blue: "away"},
  updated_at: "..."
}
```

**Frontend expects a DIRECT array:**
```javascript
game.events = [   // ← Expects THIS
  {id: "event_001", ...},
  {id: "event_002", ...}
]
```

**Result**: Frontend reads `game.events` as an object, tries to iterate over it as an array, and fails silently, showing "No events available".

---

## WHY THIS HAPPENED

1. **Lambda posts nested structure** (`POST /api/games/:id/events`):
   ```javascript
   {
     events: [...],           // Events array
     team_mapping: {...},     // Mapping info
     match_info: {...},       // Match metadata
     metadata: {...}          // Additional metadata
   }
   ```

2. **Backend stores it as-is**:
   ```javascript
   UPDATE games SET events = $1::jsonb WHERE id = $2
   // Stores the ENTIRE nested object
   ```

3. **Frontend expects flat array**:
   ```javascript
   const events = game.events  // Gets object, not array
   events.map(...)             // FAILS - can't map over object
   ```

---

## SOLUTION OPTIONS

### Option A: Fix Backend Storage (RECOMMENDED)
**Store events array directly, keep metadata separate**

**Pros**:
- Clean data structure
- Frontend works as expected
- Metadata properly separated
- Future-proof

**Cons**:
- Need to migrate existing data
- Need to update Lambda posting logic

### Option B: Fix Frontend Reading
**Make frontend unwrap the nested structure**

**Pros**:
- Quick fix
- No backend changes needed

**Cons**:
- Messy workaround
- Still have disconnect between storage and usage
- Will confuse future developers

---

## RECOMMENDED FIX (Option A)

### 1. Update Backend: Store events array directly

**File**: `backend/routes/games.js` - `POST /:id/events`

**Current**:
```javascript
await query(
  `UPDATE games 
   SET events = $1::jsonb,
       metadata = $2::jsonb,
       status = 'analyzed'
   WHERE id = $3`,
  [JSON.stringify(eventsData), JSON.stringify(metadata || {}), id]
);
```

**Fix to**:
```javascript
await query(
  `UPDATE games 
   SET events = $1::jsonb,
       metadata = $2::jsonb,
       status = 'analyzed'
   WHERE id = $3`,
  [
    JSON.stringify(eventsData.events || eventsData),  // ← Extract array
    JSON.stringify({
      ...metadata,
      team_mapping: eventsData.team_mapping,          // ← Store mapping in metadata
      match_info: eventsData.match_info               // ← Store match info in metadata
    }),
    id
  ]
);
```

### 2. Migrate Existing Data

**Create migration script**: `backend/migrate-events-structure.js`

```javascript
// For each game with events:
// 1. If events is object with 'events' key: extract array
// 2. Move team_mapping and match_info to metadata
// 3. Update database
```

### 3. Update Frontend (if needed)

**Check**: Does frontend already handle this correctly?

If not, ensure it reads:
```javascript
const eventsArray = Array.isArray(game.events) ? game.events : []
const teamMapping = game.metadata?.team_mapping
```

---

## ADDITIONAL FIXES NEEDED

### Fix #2: Store Opposition Info
**Currently lost**: Opposition club name and county

**Add to database schema**:
```sql
ALTER TABLE games
ADD COLUMN opposition_name VARCHAR(255),
ADD COLUMN opposition_county VARCHAR(100);
```

**Update frontend**:
```javascript
await games.create({
  title,
  teamId,
  videoUrl,
  oppositionName: oppositionClub,      // ← Add this
  oppositionCounty: oppositionCounty   // ← Add this
})
```

### Fix #3: Pass Team Colors Through Lambda Chain
**Currently**: Lambda 1 doesn't pass team colors to Lambda 2

**Fix**: Update Lambda 1 to call Lambda 2 with team colors

### Fix #4: Consistent Data Contract
**Document**: Exactly what format events should be in at each stage

---

## EXECUTION PLAN

1. ✅ **Analyze** - Map full data flow (DONE)
2. ✅ **Identify** - Find root cause (DONE)
3. ⏭️ **Fix Backend** - Update event storage logic
4. ⏭️ **Migrate Data** - Fix existing games
5. ⏭️ **Test** - Verify Events tab works
6. ⏭️ **Add Opposition** - Store opposition info
7. ⏭️ **Fix Lambda Chain** - Pass team colors
8. ⏭️ **Document** - Write data contract

---

## PRIORITY

**HIGH**: Fix #1 (Events structure) - This is blocking Events tab
**MEDIUM**: Fix #2 (Opposition info) - Nice to have
**MEDIUM**: Fix #3 (Lambda chain) - Improves home/away detection
**LOW**: Fix #4 (Documentation) - For future reference


