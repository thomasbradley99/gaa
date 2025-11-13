# GAA AI Analysis System - Context Summary

## 🎯 Goal
AI system that analyzes GAA match videos and extracts structured event data (possession, shots, kickouts, turnovers, etc.)

## 📍 Current Game
**cmull-vs-castleconnor** - Location: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/`

## 🔄 Pipeline Flow

```
Video → Calibration → Clips → Descriptions → Narrative → Events → JSON → XML/Web
```

### Stages:
1. **0.1 Download Videos** - Downloads raw video from URLs
2. **0.2 Generate Clips & Frames** - Splits video into 60s clips, extracts calibration frames
3. **0.3 Calibration** - One-time per game: learns team colors, keeper colors, attack directions, match timing
4. **0.4 Filter Ground Truth** - Filters ground truth XML to detectable events only (optional)
5. **1 Clips to Descriptions** - AI describes 60s video clips (focus: possession, shots, kickouts)
6. **2 Coherent Narrative** - Validates hallucinations, infers possession start/end times
7. **3 Event Classification** - Converts narrative to GAA event types (Own/Opp labels)
8. **4 JSON Extraction** - Parses structured events from classified text
9. **5 Export to Anadi XML** - Converts to XML format
10. **6 Export for Web** - Creates web viewer files
11. **7 Evaluate** - Compares AI events vs ground truth

## 🔧 Recent Improvements (This Session)

### Calibration System (`0.3_calibrate_game.py`)
- **Stage 1**: Extracts simple facts (team colors, keeper colors, attack directions, ACTIVE vs WARMUP)
- **Stage 2**: Uses statistical analysis of ALL frame descriptions to infer attack directions for each half separately
- **No longer assumes** teams switch ends - detects it from data
- **Generalizes** to any GAA game

### Current Calibration Results:
- **Team A**: Red/White jerseys, Black keeper
  - Attacks left-to-right (1st half) → right-to-left (2nd half)
- **Team B**: White/Blue jerseys, Dark keeper
  - Attacks right-to-left (1st half) → left-to-right (2nd half)
- **Match**: Start 7:30, Halftime 40:00, 2nd half 44:00, End 86:00

## 📊 What System Detects

### Core Events (from `schema_gaa_evaluation.json`):
- ✅ Possession (Own/Opp)
- ✅ Shots (Points/Goals/Wides)
- ✅ Kickouts (who takes, who wins)
- ✅ Turnovers
- ✅ Fouls
- ✅ Match structure (half starts/ends, throw-ups)

### Excluded (meta events):
- ❌ Highlights, Ball in Play, Stoppage, Referee, Hot Ball

## 📁 Key Files

### Pre-Processing:
- `pipelines/production1/0.1_download_videos.py` - Download raw videos
- `pipelines/production1/0.2_generate_clips_and_frames.py` - Generate clips & frames
- `pipelines/production1/0.3_calibrate_game.py` - Calibrate game (RECENTLY IMPROVED)
- `pipelines/production1/0.4_filter_to_detectable.py` - Filter ground truth XML
- `games/cmull-vs-castleconnor/inputs/game_profile.json` (calibration output)

### Pipeline:
- `pipelines/production1/1_clips_to_descriptions.py`
- `pipelines/production1/2_create_coherent_narrative.py`
- `pipelines/production1/3_event_classification.py`
- `pipelines/production1/4_json_extraction.py`

### Schema:
- `schemas/schema_gaa_evaluation.json` (defines core events)

### Web:
- `pipelines/production1/game_viewer.html`
- `games/cmull-vs-castleconnor/*.js` (3 data files ready to upload)

### Current Run:
- `games/cmull-vs-castleconnor/outputs/6-with-audio-20251111-1811/`

## 🌐 Webapp

**Local**: `http://localhost:8001/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio`

**S3**: `https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio`

**Upload Script**: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/upload_to_s3.sh`

## ⚠️ Known Issues / TODO

1. **Possession extraction**: Only ~40% coverage (needs improvement)
2. **Event durations**: `5_export_to_anadi_xml.py` uses football durations, needs GAA-specific
3. **home_team_assignment**: Still "EDIT_ME" in `game_profile.json` (check ground truth for kickout taker)

## 🔑 Key Concepts

- **Possession is CONTINUOUS** (not discrete) - system infers start/end from other events
- **Calibration is ONE-TIME** per game (creates `game_profile.json`)
- **Pipeline processes**: clips → descriptions → narrative → events → JSON
- **Evaluation**: Compares AI events vs ground truth (core events only)
- **Web viewer**: Shows AI events, professional events, and descriptions side-by-side

## 🚀 Quick Commands

```bash
# Run calibration
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production1
python3 0.5_calibrate_game.py --game cmull-vs-castleconnor

# Upload to S3
/home/ubuntu/clann/gaa/ai/1-gaa-ai/upload_to_s3.sh
```

