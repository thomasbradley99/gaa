# AI Pipeline Changes Needed - To Detect Detectable Events

## 🎯 Goal

Change AI from detecting:
- ❌ **Possession Own/Opp** (too vague)
- ❌ **Generic descriptions**

To detecting:
- ✅ **Shot Own/Opp** (with Point/Goal/Wide outcomes)
- ✅ **Kickout Own/Opp** (with Won/Lost outcomes)
- ✅ **Turnover Won/lost**
- ✅ **Foul Awarded/Conceded**

---

## 📋 Pipeline Overview

```
Video → 0. Calibration → 1. Descriptions → 2. Narrative → 3. Classification → 4. JSON → 5. XML → 7. Evaluate
         ✅ FINE          ⚠️  CHANGE        ⚠️  MAYBE     🔴 CHANGE        🔴 CHANGE   ⚠️  CHECK   ✅ FINE
```

---

## 🔧 What Each Stage Does

### 0.5 Calibration ✅ NO CHANGES NEEDED

**What it does:**
- Identifies team colors (Blue vs White)
- Identifies keeper colors
- Finds match start/end times
- Determines attack directions (left-to-right vs right-to-left)

**Output:** `game_profile.json`

```json
{
  "team_a": {
    "jersey_color": "Blue",
    "keeper_color": "Green",
    "attack_direction_1st_half": "left-to-right"
  },
  "team_b": {
    "jersey_color": "White",
    "keeper_color": "Yellow",
    "attack_direction_1st_half": "right-to-left"
  }
}
```

**Why it's fine:** Just identifies teams, doesn't detect events.

---

### 1. Clip Descriptions ⚠️ NEEDS CHANGES

**What it does:** AI watches each 60s clip and describes what happens

**Current prompt:**
> "Describe what happens in this GAA match clip"

**Current output:**
> "Blue team gains possession in midfield, passes forward, attacks towards left goal"

**Problem:** Too vague, doesn't identify specific events

**NEEDED prompt:**
> "Watch this GAA clip. For EACH distinct event, report:
> - **SHOTS**: Who shoots? From where? Outcome (Point/Goal/Wide/Saved)?
> - **KICKOUTS**: Who kicks out? Direction (Left/Centre/Right)? Distance (Long/Mid/Short)? Outcome (Won/Lost)?
> - **TURNOVERS**: Who wins/loses possession? How (Forced/Unforced)? Where (zone)?
> - **FOULS**: Who fouls? Type (regular/scoreable)?"

**NEEDED output:**
> "0:15 - Blue #7 shoots from 20m, ball goes over bar (POINT scored)
>  0:42 - White keeper kicks out long to centre, White wins possession
>  1:05 - Blue turns over ball (forced turnover in M3 zone)"

---

### 3. Event Classification 🔴 DEFINITELY NEEDS CHANGES

**What it does:** Converts narrative into structured event codes

**Current prompt:**
> "Classify events into: Possession Own, Possession Opp, Kickout Own, Kickout Opp"

**Current output:**
```
"Possession Own at 0:15"
"Kickout Opp at 0:42"
```

**Problem:** Wrong event types, no outcomes

**NEEDED prompt:**
> "Classify events using GAA event codes:
> - Shot Own / Shot Opp
> - Kickout Own / Kickout Opp
> - Turnover Won / Turnover lost
> - Foul Awarded / Foul Conceded / Scoreable Foul Awarded / Scoreable Foul Conceded
> 
> Use schema: schema_gaa_detectable_first_10min.json"

**NEEDED output:**
```
"Shot Own at 0:15"
"Kickout Opp at 0:42"
"Turnover Won at 1:05"
```

---

### 4. JSON Extraction 🔴 DEFINITELY NEEDS CHANGES

**What it does:** Extracts structured JSON with timestamps + outcomes

**Current output:**
```json
{
  "events": [
    {
      "event_code": "Possession Own",
      "start_time": 15,
      "end_time": 30
    }
  ]
}
```

**Problem:** No outcomes (Point/Wide/Won/Lost/etc.)

**NEEDED prompt:**
> "Extract events with:
> 1. Event code (e.g., 'Shot Own')
> 2. Start/end time
> 3. Outcomes (e.g., 'Point', 'From Play')
> 
> Outcomes must match schema:
> - Shots: Point, Goal, Wide (+ From Play / From Free)
> - Kickouts: Won, Lost (+ Long/Mid/Short, Left/Centre/Right)
> - Turnovers: Forced, Unforced (+ zone like M1, M3)
> - Fouls: (no outcomes)"

**NEEDED output:**
```json
{
  "events": [
    {
      "event_code": "Shot Own",
      "start_time": 15,
      "end_time": 30,
      "labels": ["From Play", "Point"]
    },
    {
      "event_code": "Kickout Opp",
      "start_time": 42,
      "end_time": 60,
      "labels": ["Long", "Centre", "Won"]
    }
  ]
}
```

---

### 5. Export to XML ⚠️ NEEDS VALIDATION

**What it does:** Converts JSON → XML with proper structure

**NEEDED:** Convert `labels` array → XML `<label>` tags

```xml
<instance>
  <ID>1</ID>
  <start>15</start>
  <end>30</end>
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

Must match ground truth XML structure exactly!

---

## 🎯 Action Plan

1. ✅ **Schemas are ready** (cleaned up, match ground truth)
2. ⏳ **Modify Stage 1** (1_clips_to_descriptions.py) - Focus on events
3. ⏳ **Modify Stage 3** (3_event_classification.py) - Use GAA event codes
4. ⏳ **Modify Stage 4** (4_json_extraction.py) - Extract outcomes
5. ⏳ **Validate Stage 5** (5_export_to_anadi_xml.py) - Check XML structure
6. ⏳ **Run pipeline** on first 10 mins (clips 0-10)
7. ⏳ **Evaluate** against ground truth (20 events target)
8. ⏳ **Iterate** on prompts based on results

---

## 📊 Success Criteria

**Target:** Detect 20 events in first 10 minutes

| Event Type | Target Count | Priority |
|-----------|--------------|----------|
| Shot Own | 4 | HIGH |
| Shot Opp | 4 | HIGH |
| Kickout Own | 2 | HIGH |
| Kickout Opp | 3 | HIGH |
| Turnover Won | 1 | MEDIUM |
| Turnover lost | 1 | MEDIUM |
| Foul Awarded | 1 | MEDIUM |
| Foul Conceded | 3 | MEDIUM |
| Scoreable Foul Awarded | 1 | MEDIUM |

**Good result:** Precision > 60%, Recall > 40%, F1 > 0.50
**Great result:** Precision > 80%, Recall > 60%, F1 > 0.70

---

## 🔑 Key Files to Modify

1. `pipelines/production1/1_clips_to_descriptions.py` - Add event-focused prompt
2. `pipelines/production1/3_event_classification.py` - Use GAA schema
3. `pipelines/production1/4_json_extraction.py` - Extract outcomes
4. `pipelines/production1/5_export_to_anadi_xml.py` - Validate XML structure

All prompts should reference: `schemas/schema_gaa_detectable_first_10min.json`

---

**Next Step:** Read and modify Stage 1 prompt (1_clips_to_descriptions.py)
