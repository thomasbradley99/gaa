# FULL DATA FLOW ANALYSIS

## CURRENT STATE OF THE GAME
- **Stats Tab**: Shows HOME 0-04, AWAY 0-02 (6 total points)
- **Events Tab**: "No events available" (BROKEN)
- **Problem**: Events exist somewhere (stats are calculated from them), but Events tab shows nothing

---

## COMPLETE DATA JOURNEY

### 1️⃣ USER CREATES GAME
**Location**: `frontend/src/components/games/UploadSection.tsx`

**What user enters**:
- Opposition Club: "Cill Chomáin GAA"
- VEO URL: `https://c.veocdn.com/...video.mp4`

**What gets sent to backend**:
```javascript
await games.create({
  title: "Kilmeena GAA vs Cill Chomáin GAA",  // ✅ Auto-generated
  teamId: "...",                               // ✅ User's team
  videoUrl: "https://c.veocdn.com/..."         // ✅ VEO CDN URL
})
```

**MISSING**:
- ❌ Opposition club name NOT stored
- ❌ Opposition county NOT stored
- ❌ No match metadata (date, location, etc.)

---

### 2️⃣ BACKEND CREATES GAME RECORD
**Location**: `backend/routes/games.js` - `POST /`

**What backend does**:
```javascript
// Fetches team colors
const teamData = memberResult.rows[0];
const teamColors = {
  primary: teamData.primary_color,      // ✅ "#000000"
  secondary: teamData.secondary_color   // ✅ "#FFD700"
};

// Inserts into database
INSERT INTO games (title, description, team_id, created_by, video_url, status)
VALUES ($1, $2, $3, $4, $5, 'pending')
```

**Database record created**:
- `title`: "Kilmeena GAA vs Cill Chomáin GAA"
- `video_url`: VEO CDN URL
- `status`: "pending"
- `events`: NULL
- `metadata`: NULL
- `team_id`: User's team ID

**Then triggers Lambda**:
```javascript
if (fileType === 'veo' && finalVideoUrl && !s3Key) {
  triggerVeoDownload(game.id, finalVideoUrl)  // ✅ Lambda 1
}
```

---

### 3️⃣ LAMBDA 1: VEO DOWNLOADER
**Location**: `lambda/veo-downloader/lambda_handler.py`

**What it receives**:
```python
{
  "game_id": "d2ed2627-...",
  "video_url": "https://c.veocdn.com/..."
}
```

**What it does**:
1. Downloads video from VEO
2. Uploads to S3: `videos/{game_id}/video.mp4`
3. Updates database:
   ```python
   UPDATE games 
   SET status = 'processing',
       s3_key = 'videos/{game_id}/video.mp4'
   WHERE id = game_id
   ```
4. Triggers Lambda 2 (AI Analyzer)

**MISSING**:
- ❌ Team colors NOT passed to Lambda 1
- ❌ Opposition info NOT passed to Lambda 1

---

### 4️⃣ LAMBDA 2: AI ANALYZER
**Location**: `lambda/gaa-ai-analyzer/lambda_handler_s3.py`

**What it SHOULD receive**:
```python
{
  "game_id": "d2ed2627-...",
  "s3_key": "videos/{game_id}/video.mp4",
  "title": "Kilmeena GAA vs Cill Chomáin GAA",
  "team_colors": {
    "primary": "#000000",
    "secondary": "#FFD700",
    "team_name": "Kilmeena GAA"
  }
}
```

**What it ACTUALLY receives** (from Lambda 1):
```python
{
  "game_id": "d2ed2627-...",
  "s3_key": "videos/{game_id}/video.mp4"
}
```

**DISCONNECT #1**: Team colors NOT passed from Lambda 1 to Lambda 2!

**What Lambda 2 does**:
1. Downloads video from S3
2. Runs AI analysis (calibration, events, narrative)
3. Posts results back to backend:
   ```python
   POST /api/games/{game_id}/events
   {
     "events": [...],      # Array of events
     "team_mapping": {...}, # red/blue to home/away
     "metadata": {...}      # Team colors, scores
   }
   ```

---

### 5️⃣ BACKEND RECEIVES AI RESULTS
**Location**: `backend/routes/games.js` - `POST /:id/events`

**What it receives**:
```javascript
{
  events: [
    { id: "1", time: 11, action: "Shot", outcome: "Point", team: "red" },
    { id: "2", time: 23, action: "Kickout", outcome: "Lost", team: "blue" }
  ],
  team_mapping: { red: "home", blue: "away" },
  metadata: {
    team_colors: { home: "black", away: "white" },
    scores: { home: 4, away: 2 }
  }
}
```

**What backend stores**:
```javascript
UPDATE games 
SET events = $1::jsonb,
    metadata = $2::jsonb,
    status = 'analyzed'
WHERE id = game_id
```

**Database now has**:
- `events`: JSON array of ALL events
- `metadata`: Team colors, scores, etc.
- `status`: "analyzed"

---

### 6️⃣ FRONTEND DISPLAYS GAME
**Location**: `frontend/src/app/games/[id]/page.tsx`

**What frontend does**:
1. Fetches game: `GET /api/games/{id}`
2. Receives:
   ```javascript
   {
     id: "d2ed2627-...",
     title: "Kilmeena GAA vs Cill Chomáin GAA",
     events: [...],     // Raw events from DB
     metadata: {...}    // Team colors, scores
   }
   ```
3. Transforms events using `event-transformer.ts`
4. Displays in Stats/Events/Coach tabs

**POTENTIAL DISCONNECT #2**: Events transformation or filtering broken?

---

## ROOT CAUSES OF DISCONNECTS

### 🔴 Disconnect #1: Lambda Chain Broken
- VEO Downloader (Lambda 1) does NOT pass team colors to AI Analyzer (Lambda 2)
- AI Analyzer can't properly determine home/away teams
- Results in incorrect team assignments

### 🔴 Disconnect #2: Opposition Info Lost
- Frontend collects opposition club + county
- Backend NEVER stores it
- Can't be used for matching or display

### 🔴 Disconnect #3: Events Display Broken
- Stats tab shows scores (calculated from events)
- Events tab shows "No events available"
- Likely: Events array exists but filtering/display logic is broken

### 🔴 Disconnect #4: Data Contract Mismatch
- Lambda outputs: `{ time, action, outcome, team }`
- Frontend expects: `{ timestamp, type, metadata }`
- Transformer tries to handle both, but may be failing

---

## NEXT STEPS

1. Check what's ACTUALLY in the database for this game
2. Check if events are being transformed correctly
3. Check if Events tab filtering is working
4. Fix the Lambda chain (pass team colors through)
5. Store opposition info in database
6. Ensure consistent data contract


