# Lambda Organization & Data Contract Analysis

## 📂 Lambda Structure

### Two Lambda Functions

```
lambda/
├── veo-downloader/              # Lambda 1: Downloads VEO videos
│   ├── lambda_handler.py        # Main handler
│   ├── package/                 # Dependencies (boto3, requests, psycopg2)
│   ├── bin/ffmpeg              # FFmpeg for video processing
│   ├── deploy.sh               # Deployment script
│   └── README.md
│
└── gaa-ai-analyzer/            # Lambda 2: AI Analysis Pipeline
    ├── lambda_handler_s3.py    # Main handler (S3 version - ACTIVE)
    ├── lambda_handler.py       # Old handler (deprecated)
    ├── stages/                 # 🔥 Pipeline stages (well organized!)
    │   ├── stage_0_0_download_calibration_frames.py
    │   ├── stage_0_5_calibrate_game.py
    │   ├── stage_0_1_extract_first_10mins.py
    │   ├── stage_0_2_generate_clips.py
    │   ├── stage_1_clips_to_descriptions.py
    │   ├── stage_2_create_coherent_narrative.py
    │   ├── stage_3_event_classification.py
    │   ├── stage_4_json_extraction.py
    │   └── stage_5_export_to_anadi_xml.py
    ├── utils/                  # Helper utilities
    ├── package/                # Dependencies (Gemini, boto3, FFmpeg)
    ├── Dockerfile             # Docker container for Lambda
    ├── docker-deploy.sh       # Deployment script
    └── README.md              # 📖 Excellent documentation!
```

---

## ✅ Organization Quality

### GOOD:
1. ✅ **Clear separation** - 2 Lambda functions with distinct purposes
2. ✅ **Modular stages** - AI pipeline broken into 10 clear stages
3. ✅ **Good naming** - Stage files are numbered and descriptive
4. ✅ **Documentation** - Both Lambdas have detailed READMEs
5. ✅ **Docker-based** - Using containers to handle large dependencies

### COULD IMPROVE:
1. ⚠️ **Two handlers** - `lambda_handler.py` (old) and `lambda_handler_s3.py` (active) - delete old one
2. ⚠️ **package_backup/** - Backup folder exists, likely not needed
3. ⚠️ **Data contract** - Not explicitly documented in one place
4. ⚠️ **Team colors missing** - Lambda 1 doesn't pass team colors to Lambda 2

---

## 📋 DATA CONTRACT

### How Data Flows (The Truth)

```
USER SUBMITS GAME
  ↓
FRONTEND: POST /api/games
  {
    title: "Kilmeena GAA vs Cill Chomáin GAA",
    teamId: "uuid",
    videoUrl: "https://veo.co/..."
  }
  ↓
BACKEND: Creates game in DB
  - status: "pending"
  - events: NULL
  - metadata: NULL
  ↓
BACKEND: Triggers Lambda 1 (VEO Downloader)
  {
    game_id: "uuid",
    video_url: "https://veo.co/..."
  }
  ↓
LAMBDA 1: Downloads video → S3
  - Uploads to: videos/{game_id}/video.mp4
  - Updates DB: status = "processing"
  - Triggers Lambda 2
  ↓
LAMBDA 2: AI Analysis Pipeline
  Receives:
  {
    game_id: "uuid",
    s3_key: "videos/{game_id}/video.mp4",
    title: "Kilmeena GAA vs Cill Chomáin GAA"
  }
  
  Process:
  1. Download video from S3
  2. Calibrate (detect teams, colors, match start)
  3. Extract first 10 minutes
  4. Generate 10 x 60-second clips
  5. Analyze clips in parallel (Gemini AI)
  6. Create narrative
  7. Classify events
  8. Extract JSON
  9. Export XML (optional, for Anadi tool)
  
  Posts to Backend:
  POST /api/games/{game_id}/events
  {
    "events": [
      {
        "id": "event_001",
        "team": "home",
        "time": 11,
        "action": "Shot",
        "outcome": "Point",
        "metadata": {
          "from": "play",
          "scoreType": "point"
        }
      },
      ...
    ],
    "team_mapping": {
      "red": "home",
      "blue": "away"
    },
    "match_info": {
      "title": "GAA Match",
      "total_events": 42,
      "analysis_method": "Gemini AI"
    },
    "metadata": {
      "teams": {
        "home_team": {
          "name": "Home",
          "jersey_color": "Black"
        },
        "away_team": {
          "name": "Away",
          "jersey_color": "White"
        }
      }
    }
  }
  ↓
BACKEND: Stores in DB
  - events: JSONB array (direct array!)
  - metadata: JSONB object (team_mapping, match_info, teams)
  - status: "analyzed"
  ↓
FRONTEND: Fetches game
  GET /api/games/{game_id}
  {
    id: "uuid",
    title: "Kilmeena GAA vs Cill Chomáin GAA",
    events: [array of events],
    metadata: {team_mapping, teams, ...}
  }
  ↓
FRONTEND: Transforms events
  - Maps action → type
  - Maps time → timestamp
  - For shots: outcome → type (point/wide/goal)
  ↓
DISPLAYS: Stats + Events + Coach tabs
```

---

## 🎯 THE XML QUESTION

### Is XML used to populate the database?

**NO!** ❌

**What IS the XML for?**
- Lambda generates XML in **Anadi iSportsAnalysis format**
- Uploads to S3: `videos/{game_id}/analysis.xml`
- This is for **export/compatibility** with Anadi sports analysis software
- It's NOT used to populate your database

**What DOES populate the database?**
- Lambda posts **JSON directly** to backend API: `POST /api/games/{game_id}/events`
- Backend stores JSON in PostgreSQL `jsonb` columns
- Frontend reads JSON from database

---

## 📝 Current Data Contract Format

### Event Object (Database & Frontend)

```javascript
{
  // Database format (what Lambda sends)
  id: "event_001",
  team: "home" | "away",
  time: 11,                    // seconds from match start
  action: "Shot" | "Kickout" | "Turnover" | "Foul" | ...,
  outcome: "Point" | "Wide" | "Won" | "Lost" | ...,
  metadata: {
    from: "play",
    scoreType: "point"
  }
}
```

### After Frontend Transformation

```javascript
{
  id: "event_001",
  type: "point",              // Mapped from action + outcome
  timestamp: 11,              // Mapped from time
  team: "home",
  description: "Shot - Point",
  metadata: {
    action: "Shot",           // Original preserved
    outcome: "Point",
    scoreType: "point"
  }
}
```

---

## 🐛 Current Issues

### 1. Team Colors Not Passed Through Lambda Chain ❌
- User defines team colors (primary: "#000000", secondary: "#FFD700")
- Backend has the colors
- Lambda 1 doesn't pass them to Lambda 2
- Lambda 2 detects colors from video (can't match to user's team)

**Fix Needed:**
```python
# Lambda 1 should trigger Lambda 2 with:
{
  "game_id": "uuid",
  "s3_key": "videos/{game_id}/video.mp4",
  "title": "Team vs Opposition",
  "team_colors": {           # ← MISSING!
    "primary": "#000000",
    "secondary": "#FFD700",
    "team_name": "Kilmeena GAA"
  }
}
```

### 2. Opposition Info Not Stored ❌
- Frontend collects opposition club + county
- Never stored in database
- Lost after form submission

**Fix Needed:**
```sql
ALTER TABLE games
ADD COLUMN opposition_name VARCHAR(255),
ADD COLUMN opposition_county VARCHAR(100);
```

### 3. No Single Data Contract Document ⚠️
- Contract is scattered across:
  - Lambda README
  - Backend routes
  - Frontend transformers
  - Our fix docs

**Fix Needed:**
- Create `DATA_CONTRACT.md` with canonical format

---

## ✅ What's Working Well

1. **Pipeline stages are clean** - 10 well-organized stages
2. **JSON-based** - No XML parsing complexity
3. **Direct array storage** - Backend now stores events as array (after our fix)
4. **Good separation** - Lambda handles AI, backend handles storage, frontend handles display
5. **Documentation exists** - READMEs are detailed

---

## 🎯 Summary

**Lambda Organization: 8/10** ✅
- Well structured with modular stages
- Good documentation
- Minor cleanup needed (old files)

**Data Contract: 7/10** ⚠️
- JSON-based (good!)
- Works after our fixes
- Not explicitly documented in one place
- Team colors/opposition info missing from flow

**XML Usage: NOT FOR DATABASE** ✅
- XML is export-only (Anadi compatibility)
- Database uses JSON exclusively
- No XML parsing needed


