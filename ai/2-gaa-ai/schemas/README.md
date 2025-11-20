# GAA Event Schemas

## Schema Files

### `schema_gaa_all_events.json`
**Complete GAA event schema** with all possible event types including:
- Period markers (Half Start/End)
- Game flow (Ball in Play, Stoppage, Possession)
- Scoring events (Shot Own/Opp)
- Restarts (Kickout Own/Opp)
- Possession changes (Turnover Won/lost)
- Fouls (Foul Awarded/Conceded, Scoreable variants)
- Special events (Throw Up, Hot Ball, Highlight)

**Use for:** Full game analysis, understanding all possible events

### `schema_gaa_detectable_first_10min.json` ⭐
**Focused schema for AI detection** - First 10 minutes only:
- Shot Own/Opp (with Point/Goal/Wide outcomes)
- Kickout Own/Opp (with Won/Lost outcomes)
- Turnover Won/lost
- Foul Awarded/Conceded
- Scoreable Foul Awarded/Conceded

**Use for:** AI training and evaluation (first 10 mins = 20 events)

---

## Event Structure

### Team Encoding
Team is **in the event code** (not a separate attribute):
- `Own` suffix = home team (e.g., `Shot Own`, `Kickout Own`)
- `Opp` suffix = away team (e.g., `Shot Opp`, `Kickout Opp`)

### Outcome Storage
Outcomes are stored as XML `<label>` tags:

```xml
<instance>
  <code>Shot Own</code>
  <label><text>From Play</text></label>
  <label><text>Point</text></label>
</instance>
```

### Common Outcomes by Event Type

| Event | Outcomes | Metadata |
|-------|----------|----------|
| Shot Own/Opp | Point, Goal, Wide, Saved, Short Keeper | From Play, From Free |
| Kickout Own/Opp | Won, Lost | Long, Mid, Short, Left, Centre, Right |
| Turnover Won/lost | Forced, Unforced | A1-A3, M1-M3, D1-D3, zone names |
| Foul Awarded/Conceded | - | - |

---

## Detectable Events (First 10 Minutes)

**Target for AI:** 20 events (0-600s video time)

| Event Type | Count | Priority |
|-----------|-------|----------|
| Shot Own | 4 | HIGH |
| Shot Opp | 4 | HIGH |
| Kickout Own | 2 | HIGH |
| Kickout Opp | 3 | HIGH |
| Turnover Won | 1 | MEDIUM |
| Turnover lost | 1 | MEDIUM |
| Foul Awarded | 1 | MEDIUM |
| Foul Conceded | 3 | MEDIUM |
| Scoreable Foul Awarded | 1 | MEDIUM |

**Ground Truth:** `../games/kilmeena-vs-cill-chomain/inputs/ground_truth_detectable_first_10min.xml`

---

## Timing System

**All timestamps = absolute video time**
- 0s = start of video file
- 600s = 10 minutes into video
- No game start adjustments

See: `../games/kilmeena-vs-cill-chomain/inputs/TIMING_SYSTEM.md`

---

## XML Format

See: `ANADI_XML_FORMAT_SPEC.md` for full XML structure specification.

**Example detectable event:**
```xml
<instance>
  <ID>1</ID>
  <start>26.77</start>
  <end>44.77</end>
  <code>Shot Own</code>
  <label>
    <group>None</group>
    <text>From Play</text>
  </label>
  <label>
    <group>None</group>
    <text>Point</text>
  </label>
</instance>
```

---

## Key Differences from Soccer Schemas

❌ **NOT using:** `Home Shot at Goal`, `Opp Corner`, `Home Foul`  
✅ **Using:** `Shot Own`, `Kickout Opp`, `Foul Conceded`

GAA uses **Own/Opp suffix**, Soccer uses **Home/Opp prefix**.

---

**Updated:** November 19, 2025  
**For:** 2-gaa-ai project (first 10 minutes focus)
