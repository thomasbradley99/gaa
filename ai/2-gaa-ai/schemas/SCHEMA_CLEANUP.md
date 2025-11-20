# Schema Cleanup - November 19, 2025

## What Was Removed ❌

Deleted **soccer/football schemas** (not relevant for GAA):
- `schema_41_detectable_events.json` - Soccer events (Home Goal, Opp Corner, etc.)
- `schema_24_basic_events.json` - Basic soccer events
- `schema_45_all_events.json` - All soccer events
- `WEBSITE_REQUIREMENTS.md` - Requirements for soccer website (Anadi)

## What Was Kept ✅

### `schema_gaa_all_events.json`
Complete GAA event schema with all possible events:
- 20+ event types
- Includes: Possession, Stoppage, Ball in Play, etc.
- Use for: Understanding full GAA event taxonomy

### `schema_gaa_detectable_first_10min.json` ⭐
**Focused schema for AI detection** (first 10 minutes):
- 10 detectable event types
- Prioritized: HIGH (Shots, Kickouts), MEDIUM (Turnovers, Fouls)
- Includes: outcomes and metadata for each event type
- Use for: AI training, evaluation, prompt engineering

### `ANADI_XML_FORMAT_SPEC.md`
Technical specification for XML structure:
- How to format instances
- Label structure
- ID numbering
- Timestamp format

---

## Key Concepts (GAA vs Soccer)

### Team Encoding

**GAA (what we use):**
```xml
<code>Shot Own</code>      <!-- Home team -->
<code>Shot Opp</code>      <!-- Away team -->
<code>Kickout Own</code>   <!-- Home team -->
```

**Soccer (NOT using):**
```xml
<code>Home Shot at Goal</code>  ❌
<code>Opp Corner</code>          ❌
<code>Home Foul</code>           ❌
```

### Outcome Storage

Outcomes stored as XML `<label>` tags:

```xml
<instance>
  <code>Shot Own</code>
  <label><text>From Play</text></label>  <!-- metadata -->
  <label><text>Point</text></label>       <!-- outcome -->
</instance>
```

---

## Target Events (First 10 Minutes)

**Ground Truth:** 20 events (0-600s)

| Priority | Event Types | Count |
|----------|------------|-------|
| HIGH | Shot Own/Opp | 8 |
| HIGH | Kickout Own/Opp | 5 |
| MEDIUM | Turnover Won/lost | 2 |
| MEDIUM | Foul Awarded/Conceded | 5 |

**File:** `../games/kilmeena-vs-cill-chomain/inputs/ground_truth_detectable_first_10min.xml`

---

## Why This Matters

1. **AI must output GAA event codes** (`Shot Own`, not `Home Shot at Goal`)
2. **Evaluation matches by event code** - wrong format = 0% match
3. **Team is in the code** (`Own`/`Opp` suffix), not a separate attribute
4. **Outcomes are labels** (XML `<label>` tags), not in the event code

---

**Result:** Clean, focused schemas that match our GAA ground truth format.
