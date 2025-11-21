# Pipeline Plan - Simplified Possession Detection

## Overview
Simplified pipeline focused on accurately detecting **possession** first. Once we get possession right, we can add other events.

---

## 0_generate_clips_and_frames.py
**Purpose:** Split raw video into clips

**Input:**
- `games/{game}/inputs/video.mp4` (raw video)

**Process:**
1. Use ffmpeg to split video into **40-second clips**
2. Take clips **every 30 seconds** (5-second overlap)
3. Save to `games/{game}/inputs/clips/clip_000m00s.mp4`, `clip_030m00s.mp4`, `clip_100m00s.mp4`, etc.

**Output:**
- `games/{game}/inputs/clips/` (40-second MP4 clips with 5s overlap)

**Cost:** Free (ffmpeg)

---

## 0.5_calibrate_game.py
**Purpose:** Profile the game to identify teams and goal positions

**Input:**
- `games/{game}/inputs/calibration_frames/` (extracted frames)

**Process:**
1. Send frames to Gemini 2.5 Flash
2. AI identifies:
   - Team A colors (jersey + goalkeeper)
   - Team B colors (jersey + goalkeeper)
   - 1st half start/end times
   - 2nd half start/end times  
   - Attacking directions per half (which team attacks which way)

**Output:**
- `games/{game}/inputs/game_profile.json`

**Cost:** ~$0.05 (one Flash call, ~120 frames)

---

## 1_clips_to_descriptions.py
**Purpose:** Analyze clips and describe **WHO has possession** and **WHERE they are**

**Input:**
- `games/{game}/inputs/clips/` (40-second clips with audio)
- `games/{game}/inputs/game_profile.json` (team info)

**Process:**
1. Load game profile (team colors, attack directions)
2. For each clip:
   - Determine which team's goal is on LEFT vs RIGHT side
   - Simple logic: If goal is on RIGHT → That team's ATTACKING end, other team's DEFENSIVE end
   - If attacking team has possession → They are building an attack
   - If defending team has possession → They are defending/clearing
3. AI describes ONLY:
   - Which team has the ball (by jersey color)
   - Where they are on the pitch (LEFT/RIGHT, midfield, attacking third, defensive third)
   - When possession changes

**Output:**
- `games/{game}/outputs/{timestamp}/1_observations.txt` (possession descriptions)

**Cost:** ~$0.026 per clip (Gemini 2.5 Pro)

---

## 2_create_coherent_narrative.py
**Purpose:** Create coherent narrative from possession observations

**Input:**
- `games/{game}/outputs/{timestamp}/1_observations.txt`

**Process:**
1. Read possession observations from Stage 1
2. Infer possession periods (START and END points)
3. Mark possession periods explicitly with [START] and [END] markers
4. Identify which team has possession using jersey colors
5. Mark attacking possession when team has ball near their attacking goal

**Output:**
- `games/{game}/outputs/{timestamp}/2_narrative.txt` (coherent narrative with possession markers)

---

## 3_event_classification.py
**Purpose:** Extract possession events from narrative

**Input:**
- `games/{game}/outputs/{timestamp}/2_narrative.txt`

**Process:**
1. Extract EVERY possession period marked by Stage 2
2. Convert jersey colors to "Own" (Home) or "Opp" (Away)
3. Extract as time ranges (start to end)
4. Extract attacking possession when [ATTACKING] marker present

**Output:**
- `games/{game}/outputs/{timestamp}/3_events_classified.txt` (possession events)

---

## Workflow

```bash
# One-time setup per game:
python 0_generate_clips_and_frames.py --game cmull-vs-castleconnor
python 0.5_calibrate_game.py --game cmull-vs-castleconnor

# Then run pipeline:
python 1_clips_to_descriptions.py --game cmull-vs-castleconnor --start-clip 7 --end-clip 39
python 2_create_coherent_narrative.py --game cmull-vs-castleconnor
python 3_event_classification.py --game cmull-vs-castleconnor
# ... etc
```

---

## Goal
Get **possession detection to 100% accuracy** by:
1. Simple clip structure (40s clips, 30s intervals, 5s overlap)
2. Focus ONLY on possession (who has ball, where are they)
3. Use simple logic (goal position = attack/defense end)
4. Explicit possession marking in Stage 2
5. Extract every possession period in Stage 3

Once possession is perfect, we can add other events (shots, fouls, etc.).
