# AI Development Guide - Key Files

## 📋 Data Contract (What the AI Must Output)

```
docs/architecture/DATA_CONTRACT.md
```
**This defines the exact format the AI must produce for events.**

---

## 🤖 Lambda AI Analyzer Files

### Main Handler
```
lambda/gaa-ai-analyzer/lambda_handler_s3.py
```
- Orchestrates the entire AI analysis pipeline
- Handles team color detection & home/away mapping
- Posts results to backend

### AI Prompt Stages (WHERE TO TUNE THE AI)

**Stage 0.5: Game Calibration**
```
lambda/gaa-ai-analyzer/stages/stage_0_5_calibrate_game.py
```
- Detects team jersey colors
- Identifies goalkeepers
- Determines match start time

**Stage 1: Clip Description**
```
lambda/gaa-ai-analyzer/stages/stage_1_clip_description.py
```
- Analyzes 10-second video clips
- Describes what's happening in each clip

**Stage 2: Narrative Creation**
```
lambda/gaa-ai-analyzer/stages/stage_2_narrative_creation.py
```
- Combines clip descriptions into a coherent narrative

**Stage 3: Event Classification**
```
lambda/gaa-ai-analyzer/stages/stage_3_event_classification.py
```
- Classifies events (Shot, Kickout, Turnover, Foul, etc.)
- Determines outcomes (Point, Wide, Goal, Won, Lost)

**Stage 4: JSON Extraction** ⚠️ **MOST IMPORTANT FOR ACCURACY**
```
lambda/gaa-ai-analyzer/stages/stage_4_json_extraction.py
```
- Converts narrative → structured JSON events
- **THIS IS WHERE MISSING EVENTS/SCORES HAPPEN**
- Gemini prompt defines what gets extracted

---

## 🎯 Current AI Quality Issues (from TODO)

1. **Event detection accuracy** - Stage 4 misses some events
2. **Generic descriptions** - Stage 1/2 too vague
3. **Score accuracy** - Stage 4 misses points/goals
4. **Only 10 mins analyzed** - Lambda timeout limit

---

## 🔧 Quick Command to Show All Files

Run this on your VM:

```bash
cd ~/path/to/gaa-webapp

echo "=== DATA CONTRACT ==="
cat docs/architecture/DATA_CONTRACT.md

echo -e "\n=== LAMBDA HANDLER ==="
head -100 lambda/gaa-ai-analyzer/lambda_handler_s3.py

echo -e "\n=== STAGE 4 (JSON EXTRACTION - KEY FOR ACCURACY) ==="
cat lambda/gaa-ai-analyzer/stages/stage_4_json_extraction.py

echo -e "\n=== ALL STAGE FILES ==="
ls -la lambda/gaa-ai-analyzer/stages/
```

---

## 📊 What Gets Stored in Database

**Events Array (JSONB):**
```json
[
  {
    "id": "event_001",
    "time": 11,
    "team": "home",
    "action": "Shot",
    "outcome": "Point",
    "metadata": {
      "from": "play",
      "scoreType": "point"
    }
  }
]
```

**Metadata (JSONB):**
```json
{
  "teams": {
    "home_team": {"name": "Home", "jersey_color": "Black"},
    "away_team": {"name": "Away", "jersey_color": "White"}
  },
  "team_mapping": {"red": "home", "blue": "away"},
  "match_info": {
    "title": "GAA Match",
    "total_events": 42
  }
}
```

---

## 🎯 Focus Areas for AI Improvement

1. **Stage 4 Gemini prompt** - Add examples of missed events
2. **Stage 3 classification** - Better shot/point detection
3. **Stage 1 descriptions** - More detailed play analysis
4. **Timeout handling** - Analyze more than 10 minutes

---

**Last Updated:** Nov 19, 2025
**Status:** ✅ Pipeline working, ⚠️ AI accuracy needs improvement

