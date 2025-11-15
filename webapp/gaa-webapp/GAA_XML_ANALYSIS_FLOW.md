# GAA XML Analysis Flow

**Complete workflow for video analysis and comprehensive stats display**

## Overview

This document describes how GAA match videos are processed, analyzed, and displayed with full iSportsAnalysis-style statistics using XML files.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER UPLOADS VEO URL                     │
│                                                                  │
│  Frontend → Backend → Lambda → AI Analysis → XML → Frontend    │
└─────────────────────────────────────────────────────────────────┘

1. User submits VEO URL via webapp
2. Backend triggers Lambda function
3. Lambda downloads video → S3
4. Lambda runs AI analysis
5. Lambda generates XML (Anadi format)
6. Lambda stores XML in S3
7. Lambda updates database with keys
8. Frontend loads XML from S3
9. Frontend displays comprehensive stats
```

---

## Database Schema

### Games Table

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id),
  
  -- Video & Analysis Files
  video_url VARCHAR(500),        -- Original VEO URL
  s3_key VARCHAR(500),            -- Video S3 path (videos/{game_id}/video.mp4)
  xml_s3_key VARCHAR(500),        -- XML S3 path (videos/{game_id}/analysis.xml)
  
  -- Processed Data
  events JSONB,                   -- AI-generated events JSON
  tactical_analysis JSONB,        -- Optional tactical insights
  
  -- Metadata
  location VARCHAR(255),          -- Game location/venue
  opponent VARCHAR(255),          -- Opponent team name
  game_date DATE,                 -- Date game was played
  duration_seconds INTEGER,       -- Video duration
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Timestamps
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_games_s3_key ON games(s3_key);
CREATE INDEX idx_games_xml_s3_key ON games(xml_s3_key);
```

---

## Lambda Flow

### Input Event

```json
{
  "game_id": "uuid-here",
  "video_url": "https://veo.co/matches/xxx",
  "events": [],  // Optional: AI-generated events
  "match_info": {
    "title": "Match Title",
    "date": "2025-11-15",
    "location": "Venue Name"
  },
  "team_mapping": {
    "home": "Team A",
    "away": "Team B"
  }
}
```

### Processing Steps

**1. Video Download**
```python
# Extract direct video URL from VEO page
direct_url = extract_video_url(veo_url)

# Download to /tmp
download_video(direct_url, "/tmp/video.mp4")

# Upload to S3
s3_key = f"videos/{game_id}/video.mp4"
upload_to_s3(video_path, s3_key)
```

**2. AI Analysis (Placeholder)**
```python
# TODO: Run AI analysis pipeline
# This will generate events list
ai_events = analyze_video(video_path)
```

**3. XML Generation**
```python
# Generate iSportsAnalysis-style XML
xml_content = generate_xml_from_events(ai_events)

# XML format:
# <file>
#   <ALL_INSTANCES>
#     <instance>
#       <ID>1</ID>
#       <start>22.992541</start>
#       <end>35.992541</end>
#       <code>Shot Own</code>
#       <label>
#         <group>Tags</group>
#         <text>From Play</text>
#         <text>Point</text>
#       </label>
#     </instance>
#     ...
#   </ALL_INSTANCES>
# </file>
```

**4. XML Upload**
```python
xml_s3_key = f"videos/{game_id}/analysis.xml"
upload_xml_to_s3(xml_content, xml_s3_key)
```

**5. Events Storage**
```python
# Store events via backend API
store_events_via_api(game_id, {
  'events': ai_events,
  'match_info': match_info,
  'team_mapping': team_mapping
})
```

**6. Database Update**
```python
# Update game with both S3 keys
UPDATE games 
SET s3_key = 'videos/{game_id}/video.mp4',
    xml_s3_key = 'videos/{game_id}/analysis.xml',
    status = 'analyzed'
WHERE id = game_id
```

### Output Response

```json
{
  "statusCode": 200,
  "body": {
    "message": "Video processed and analyzed successfully",
    "game_id": "uuid-here",
    "s3_key": "videos/uuid/video.mp4",
    "xml_s3_key": "videos/uuid/analysis.xml",
    "events_count": 486
  }
}
```

---

## Frontend Flow

### 1. Load Game Data

```typescript
// Fetch game from API
const game = await fetch(`/api/games/${id}`)

// Game object includes:
{
  id: "uuid",
  title: "Match Title",
  s3_key: "videos/uuid/video.mp4",
  xml_s3_key: "videos/uuid/analysis.xml",
  events: { ... },  // JSONB events
  status: "analyzed"
}
```

### 2. Load XML from S3

```typescript
import { loadXMLFromURL } from '@/lib/xml-parser'

// Generate presigned S3 URL for XML (backend endpoint)
const xmlUrl = await fetch(`/api/games/${id}/xml-url`)

// Load and parse XML
const xmlStats = await loadXMLFromURL(xmlUrl)

// Returns comprehensive stats:
{
  totalEvents: 486,
  eventsByCode: {
    "Shot Own": 45,
    "Kickout Own": 23,
    ...
  },
  possession: {
    home: { count: 120, duration: 1850 },
    away: { count: 115, duration: 1720 }
  },
  shots: {
    home: { total: 25, goals: 2, points: 15, wides: 5, ... },
    away: { total: 22, goals: 1, points: 12, wides: 8, ... }
  },
  kickouts: {
    home: { total: 12, long: 8, short: 2, mid: 2, won: 8, lost: 4, ... },
    away: { total: 11, long: 6, short: 3, mid: 2, won: 7, lost: 4, ... }
  },
  turnovers: {
    home: { total: 15, forced: 8, unforced: 7, d1: 2, d2: 3, ... },
    away: { total: 18, forced: 10, unforced: 8, d1: 3, d2: 4, ... }
  },
  fouls: {
    home: { conceded: 12, scoreable: 3, awarded: 15 },
    away: { conceded: 15, scoreable: 5, awarded: 12 }
  }
}
```

### 3. Display Comprehensive Stats

```typescript
<GameStats 
  game={game}
  events={gameEvents}
  xmlStats={xmlStats}  // NEW: Full XML stats
  duration={duration}
/>

// Displays:
// - Score (goals-points)
// - Conversion Rate %
// - Possession %
// - Team Possessions
// - 45M Entries
// - Shots breakdown
// - Kickout analysis (distance, direction, outcome)
// - Turnover analysis (type, zone)
// - Foul stats
// - Zone-based statistics (D1/D2/D3, M1/M2/M3, A1/A2/A3)
```

---

## XML File Structure

### iSportsAnalysis Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<file>
  <ALL_INSTANCES>
    
    <!-- Example: Shot Own (Point from Play) -->
    <instance>
      <ID>8</ID>
      <start>26.774523</start>
      <end>44.774523</end>
      <code>Shot Own</code>
      <label>
        <group>Tags</group>
        <text>From Play</text>
        <text>Point</text>
      </label>
    </instance>
    
    <!-- Example: Kickout Own (Long, Centre, Won) -->
    <instance>
      <ID>11</ID>
      <start>62.592045</start>
      <end>77.592045</end>
      <code>Kickout Own</code>
      <label>
        <group>Tags</group>
        <text>Long</text>
        <text>Centre</text>
        <text>Won</text>
      </label>
    </instance>
    
    <!-- Example: Turnover Won (Forced, M3 zone) -->
    <instance>
      <ID>131</ID>
      <start>1012.999931</start>
      <end>1026.999931</end>
      <code>Turnover Won</code>
      <label>
        <group>Tags</group>
        <text>Forced</text>
        <text>M3</text>
        <text>middle third</text>
      </label>
    </instance>
    
    <!-- More instances... -->
    
  </ALL_INSTANCES>
</file>
```

### Event Codes

**Core Events:**
- `Shot Own` / `Shot Opp` - Shot attempts
- `Kickout Own` / `Kickout Opp` - Kickouts
- `Possession Own` / `Possession Opp` - Possession periods
- `Turnover Won` / `Turnover lost` - Turnovers
- `Foul Awarded` / `Foul Conceded` - Fouls
- `Attack Own` / `Attack OPP` - Attack phases
- `Ball in Play` - Active play periods
- `Stoppage` - Stoppages
- `Throw Up` - Throw-ins
- `Highlight` - Key moments

**Labels (Tags):**
- Shot outcomes: `Goal`, `Point`, `Wide`, `Short Keeper`, `Saved`, `45M`, `Rebound Post`, `Pass / Other`
- Shot types: `From Play`, `From Free`
- Kickout distance: `Long`, `Short`, `Mid`
- Kickout direction: `Left`, `Centre`, `Right`
- Kickout outcome: `Won`, `Lost`
- Turnover type: `Forced`, `Unforced`
- Zones: `D1`, `D2`, `D3` (defensive), `M1`, `M2`, `M3` (middle), `A1`, `A2`, `A3` (attack)

---

## API Endpoints

### Get XML Presigned URL

```typescript
GET /api/games/:id/xml-url

Response:
{
  "url": "https://s3.amazonaws.com/...",
  "expiresIn": 3600
}
```

### Backend Implementation

```javascript
// backend/routes/games.js

router.get('/:id/xml-url', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // Get game
    const game = await query('SELECT xml_s3_key FROM games WHERE id = $1', [id])
    
    if (!game.rows[0]?.xml_s3_key) {
      return res.status(404).json({ error: 'XML not available' })
    }
    
    // Generate presigned URL
    const url = await getPresignedDownloadUrl(game.rows[0].xml_s3_key)
    
    res.json({ url, expiresIn: 3600 })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get XML URL' })
  }
})
```

---

## Migration

Run the migration to add XML support:

```bash
cd gaa/webapp/gaa-webapp
psql $DATABASE_URL -f db/migrations/003_add_xml_and_video_keys.sql
```

---

## Testing

### 1. Test Lambda with Sample Events

```python
# test-lambda.py
import json
import boto3

lambda_client = boto3.client('lambda', region_name='eu-west-1')

test_event = {
    "game_id": "your-game-id",
    "video_url": "https://veo.co/...",
    "events": [
        {
            "timestamp": 26.77,
            "duration": 18.0,
            "type": "Shot Own",
            "metadata": {
                "outcome": "Point",
                "playType": "From Play"
            }
        }
    ],
    "match_info": {
        "title": "Test Match",
        "date": "2025-11-15"
    }
}

response = lambda_client.invoke(
    FunctionName='gaa-veo-downloader-nov25',
    InvocationType='RequestResponse',
    Payload=json.dumps(test_event)
)

print(json.loads(response['Payload'].read()))
```

### 2. Test Frontend XML Parser

```typescript
// test-xml-parser.ts
import { parseGAAXML } from '@/lib/xml-parser'

const sampleXML = `<?xml version="1.0"?>
<file>
  <ALL_INSTANCES>
    <instance>
      <ID>1</ID>
      <start>26.77</start>
      <end>44.77</end>
      <code>Shot Own</code>
      <label>
        <group>Tags</group>
        <text>From Play</text>
        <text>Point</text>
      </label>
    </instance>
  </ALL_INSTANCES>
</file>`

const stats = parseGAAXML(sampleXML)
console.log(stats)
```

---

## Next Steps

1. ✅ Database migration (add xml_s3_key)
2. ✅ Lambda XML generation functions
3. ✅ Frontend XML parser
4. ✅ Enhanced video player (zoom, speed, Voronoi)
5. 🔄 Backend API endpoint for XML URL
6. 🔄 Frontend: Load and display XML stats
7. ⏳ **AI Analysis Pipeline Integration** (when ready)

---

## AI Analysis Integration (Future)

When the AI pipeline is ready, replace the placeholder:

```python
# In lambda_handler.py
# Replace this:
ai_events = event.get('events', [])  # Placeholder

# With this:
from gaa_ai_pipeline import analyze_video

ai_events = analyze_video(
    video_path=video_path,
    game_id=game_id,
    config={
        'detect_shots': True,
        'detect_kickouts': True,
        'detect_possessions': True,
        'detect_turnovers': True,
        'detect_fouls': True,
        'zone_analysis': True
    }
)
```

---

## Status

**Current Implementation:**
- ✅ Enhanced video player (zoom, speed, Voronoi tap regions)
- ✅ Lambda XML generation
- ✅ Frontend XML parser
- ✅ Database schema
- 🔄 Backend XML URL endpoint (needs implementation)
- 🔄 Frontend XML loading (needs implementation)
- ⏳ AI analysis pipeline (to be integrated)

**Ready for:**
- Testing Lambda XML generation with sample events
- Implementing backend XML URL endpoint
- Loading XML stats in frontend
- Full integration when AI pipeline is ready

