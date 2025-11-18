# Complete Lambda + Frontend Fix Plan

**Date:** November 18, 2025  
**Goal:** Fix Lambda event format + team colors in ONE complete solution

---

## 🎯 THE PROBLEM

### Issue 1: Lambda Posts Wrong Event Format
**Current (broken):**
```json
{
  "type": "shot",           // ❌ Should be action
  "timestamp": 13,          // ❌ Should be time  
  "description": "..."      // ❌ Missing outcome
}
```

**Expected:**
```json
{
  "action": "Shot",         // ✅
  "time": 13,               // ✅
  "outcome": "Wide",        // ✅
  "metadata": {...}
}
```

### Issue 2: No Team Colors
Lambda detects colors but doesn't send them to backend.

### Issue 3: Existing Games Have Bad Data
- Game `8e32d1fd` (34 events) - wrong format
- Game `849cbb45` (45 events) - wrong format

---

## ✅ THE SOLUTION (Single Comprehensive Fix)

### **STEP 1: Fix Lambda Stage 4 (JSON Output)** ✅ DONE
Already fixed in `stage_4_json_extraction.py` - prompt now generates correct format.

### **STEP 2: Add Team Colors to Lambda POST**
Modify `lambda_handler_s3.py` to include team metadata.

### **STEP 3: Update Backend to Store Metadata**
Modify `backend/routes/games.js` to handle metadata field.

### **STEP 4: Fix Frontend Transformer (Backward Compatible)**
Handle BOTH old format (timestamp/type) AND new format (time/action).

### **STEP 5: Clean Up Bad Data (Optional)**
Delete the 2 broken games so users can re-upload.

---

## 📝 IMPLEMENTATION DETAILS

### **FILE 1: `lambda/gaa-ai-analyzer/lambda_handler_s3.py`**

**Changes needed:**
1. Parse team names from game title
2. Include detected team colors in POST payload
3. Add metadata.teams to backend request

```python
# ADD THIS FUNCTION (after imports, before post_results_to_backend):
def parse_team_names_from_title(title):
    """Extract team names from title like 'Team A vs Team B'"""
    separators = [' vs ', ' v ', ' - ', ' VS ', ' V ']
    
    for sep in separators:
        if sep in title:
            parts = title.split(sep, 1)
            if len(parts) == 2:
                return {
                    'home_team': parts[0].strip(),
                    'away_team': parts[1].strip()
                }
    
    # Fallback
    return {
        'home_team': 'Home',
        'away_team': 'Away'
    }

# MODIFY post_results_to_backend function:
def post_results_to_backend(game_id, events_json, team_mapping, game_title, team_colors):
    """Post analysis results with complete metadata"""
    
    # Parse team names from title
    team_names = parse_team_names_from_title(game_title)
    
    payload = {
        'events': events_json.get('events', []),
        'match_info': {
            'title': events_json.get('title', 'GAA Match'),
            'total_events': len(events_json.get('events', [])),
            'analysis_method': 'Gemini AI - First 10 minutes',
            'created_at': events_json.get('timestamp')
        },
        'team_mapping': team_mapping,
        'metadata': {
            'teams': {
                'home_team': {
                    'name': team_names['home_team'],
                    'jersey_color': team_colors['home']
                },
                'away_team': {
                    'name': team_names['away_team'],
                    'jersey_color': team_colors['away']
                }
            }
        }
    }
    
    # ... rest of function unchanged

# MODIFY lambda_handler function (around line 280):
# After calibration stage, prepare team colors:
team_colors = {
    'home': team_a_color,
    'away': team_b_color
}

# When calling post_results_to_backend (around line 290):
post_results_to_backend(
    game_id, 
    events_json, 
    team_mapping,
    title,           # ADD THIS
    team_colors      # ADD THIS
)
```

---

### **FILE 2: `backend/routes/games.js`**

**Change: Store metadata field in database**

```javascript
// Line ~369 in POST /api/games/:id/events route:
router.post('/:id/events', authenticateLambda, async (req, res) => {
  try {
    const { id } = req.params;
    const { events, match_info, team_mapping, metadata } = req.body; // ADD metadata

    // ... validation ...

    // Build events JSONB object
    const eventsData = {
      match_info: match_info || {...},
      events: events,
      team_mapping: team_mapping || null,
      updated_at: new Date().toISOString()
    };

    // Update database: store events AND metadata
    const updateResult = await query(
      `UPDATE games 
       SET events = $1::jsonb,
           metadata = $2::jsonb,    -- ADD THIS LINE
           status = 'analyzed',
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, status`,
      [
        JSON.stringify(eventsData), 
        JSON.stringify(metadata || {}),  // ADD THIS
        id
      ]
    );

    // ... rest unchanged
```

---

### **FILE 3: `frontend/src/lib/event-transformer.ts`**

**Change: Handle both old AND new format (backward compatible)**

```typescript
export interface GAASchemaEvent {
  id: string
  
  // NEW FORMAT (correct):
  time?: number
  action?: string
  outcome?: string
  
  // OLD FORMAT (backward compatibility):
  timestamp?: number
  type?: string
  
  team: 'red' | 'blue' | 'home' | 'away' | 'neutral' | string
  autoGenerated?: boolean
  validated?: boolean
  metadata?: any
}

// MODIFY transformGAEEventToGameEvent function (line ~164):
export function transformGAEEventToGameEvent(
  gaaEvent: GAASchemaEvent,
  teamMapping?: { red: 'home' | 'away', blue: 'home' | 'away' }
): GameEvent {
  // Handle both old and new formats
  const time = gaaEvent.time ?? gaaEvent.timestamp ?? 0;
  const action = gaaEvent.action || gaaEvent.type || 'Unknown';
  const outcome = gaaEvent.outcome || 'N/A';
  
  const team = mapTeamColor(gaaEvent.team, teamMapping)
  const type = mapActionToType(action)
  
  return {
    id: gaaEvent.id,
    type,
    timestamp: time,  // Use normalized time value
    team,
    description: generateDescription(action, outcome, team),
    metadata: {
      action: action,
      outcome: outcome,
      scoreType: getScoreType(outcome),
      cardType: getCardType(action),
      possessionOutcome: getPossessionOutcome(outcome),
      autoGenerated: gaaEvent.autoGenerated,
      validated: gaaEvent.validated,
      ...(gaaEvent.metadata || {}),
    },
  }
}
```

---

## 🚀 DEPLOYMENT ORDER

### **Phase 1: Backend (5 minutes)**
1. Update `backend/routes/games.js` to store metadata
2. Restart backend
3. Test with curl: `POST /api/games/test-id/events` with metadata field

### **Phase 2: Frontend (5 minutes)**
1. Update `event-transformer.ts` with backward compatibility
2. Test locally with existing games (should not crash)

### **Phase 3: Lambda (15 minutes)**
1. Update `lambda_handler_s3.py` with team parsing and colors
2. Update `stage_4_json_extraction.py` (already done)
3. Deploy Lambda 2:
   ```bash
   cd lambda/gaa-ai-analyzer
   ./deploy-s3.sh
   ```
4. Test with new VEO URL

### **Phase 4: Cleanup (Optional)**
Delete broken games:
```sql
DELETE FROM games WHERE id IN (
  '8e32d1fd-bf1e-4f75-96bd-158daba3154f',
  '849cbb45-9b48-4ab3-8f2e-f676268c2623'
);
```

---

## ✅ SUCCESS CRITERIA

After deployment, new Lambda runs should:
1. ✅ Post events with `action`, `time`, `outcome` fields
2. ✅ Include `metadata.teams` with jersey colors
3. ✅ Frontend displays events without crashing
4. ✅ Timeline shows correct team colors (not black/white)
5. ✅ Old games with bad format still work (backward compatibility)

---

## 📊 TESTING CHECKLIST

1. **Backend Test:**
   ```bash
   curl -X POST http://localhost:5011/api/games/test-id/events \
     -H "X-API-Key: $LAMBDA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "events": [...],
       "team_mapping": {...},
       "metadata": {
         "teams": {
           "home_team": {"name": "Test Home", "jersey_color": "green"},
           "away_team": {"name": "Test Away", "jersey_color": "white"}
         }
       }
     }'
   ```

2. **Frontend Test:**
   - Open game `8e32d1fd` (old format) - should not crash
   - Open game `849cbb45` (old format) - should not crash

3. **Lambda Test:**
   - Submit new VEO URL
   - Check CloudWatch logs for team colors
   - Check database for metadata.teams
   - Check frontend for colored timeline

---

## 🎯 SINGLE COMMAND TO EXECUTE

```bash
# 1. Commit current fixes
cd ~/clann-repos/gaa/webapp/gaa-webapp
git add -A
git commit -m "Complete Lambda + Frontend fix - single solution"

# 2. Apply Lambda changes (you'll do this manually)
# 3. Deploy Lambda
cd lambda/gaa-ai-analyzer
./deploy-s3.sh

# 4. Restart backend
cd ~/clann-repos/gaa/webapp/gaa-webapp/backend
lsof -ti:5011 | xargs kill -9 2>/dev/null
npm run dev &

# 5. Test
# Open http://localhost:5012 and check games
```

---

## 📝 SUMMARY

**3 Files to Change:**
1. `lambda_handler_s3.py` - add team parsing + metadata
2. `backend/routes/games.js` - store metadata field  
3. `event-transformer.ts` - handle both formats

**Result:**
- ✅ New videos will have correct format + colors
- ✅ Old videos won't crash (backward compatible)
- ✅ Complete solution, no more piecemeal fixes

---

**Ready to implement? This is the complete plan.** 🚀

