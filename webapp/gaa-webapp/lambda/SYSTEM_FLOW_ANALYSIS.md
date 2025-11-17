# GAA Lambda System Flow & Resource Analysis

## 📊 Complete System Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                     USER UPLOADS VEO URL                              │
│              Frontend → Backend API → POST /api/games                 │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│          LAMBDA 1: VEO DOWNLOADER (gaa-veo-downloader-nov25)         │
│                                                                        │
│  Resources:                                                            │
│    • Memory: 3GB (3008 MB)                                            │
│    • Timeout: 15 minutes                                              │
│    • /tmp: 512MB (default)                                            │
│                                                                        │
│  Process:                                                              │
│    1. Receives: {"game_id": "...", "video_url": "veo://..."}         │
│    2. Downloads video from VEO streaming URL                          │
│       └─> Uses requests library with streaming                        │
│       └─> Typical size: 1-4GB for full game                          │
│    3. Streams directly to S3 (no local storage!)                      │
│       └─> S3 path: clann-gaa-videos-nov25/videos/{game_id}/video.mp4│
│    4. Updates DB: status='downloaded', s3_key=...                     │
│    5. Triggers Lambda 2 asynchronously                                │
│       └─> boto3.invoke(FunctionName='gaa-ai-analyzer-nov25',         │
│                         InvocationType='Event')                       │
│                                                                        │
│  Memory Usage: ~500MB (streaming, no full file in memory)            │
│  ✅ No storage issues - streams to S3                                │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│          LAMBDA 2: AI ANALYZER (gaa-ai-analyzer-nov25)               │
│                                                                        │
│  Resources:                                                            │
│    • Memory: 3GB (3008 MB) - AWS Maximum                              │
│    • Timeout: 15 minutes                                              │
│    • /tmp: 10GB (10240 MB) ✅ UPDATED                                │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 0.0: Download & Extract Calibration Frames                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Input: s3_key = "videos/{game_id}/video.mp4"                      │
│                                                                        │
│    Step 1: Download video from S3                                     │
│      • boto3.download_file(s3_key, /tmp/video.mp4)                   │
│      • File size: 1-4GB (full match)                                  │
│      • /tmp usage: 1-4GB ✅ OK with 10GB                             │
│      • Time: ~30-60 seconds                                           │
│                                                                        │
│    Step 2: Extract 3 calibration frames                               │
│      • ffmpeg -ss 30 -i /tmp/video.mp4 -frames:v 1 frame_30s.jpg    │
│      • ffmpeg -ss 300 -i /tmp/video.mp4 -frames:v 1 frame_5m.jpg    │
│      • ffmpeg -ss 1500 -i /tmp/video.mp4 -frames:v 1 frame_25m.jpg  │
│      • Each frame: ~1-2MB                                             │
│      • /tmp usage: +6MB ✅ OK                                         │
│      • Time: ~10-15 seconds                                           │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 0.5: Calibrate Game (Detect Match Start)                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Sends 3 frames to Gemini Flash (parallel)                      │
│      • AI analyzes: teams, jersey colors, match start time           │
│      • Returns: {                                                      │
│          "match_times": {"start": 180},  // Match starts at 3:00     │
│          "team_a": {"name": "...", "jersey": "blue", ...},           │
│          "team_b": {"name": "...", "jersey": "red", ...}             │
│        }                                                               │
│                                                                        │
│    Memory: ~50MB (API calls, JSON)                                    │
│    Time: ~5-10 seconds (parallel)                                     │
│    ✅ This is the KEY stage - detects actual game start!             │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 0.1: Extract First 10 Minutes of Actual Gameplay               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Uses match_times.start from Stage 0.5 (e.g., 180 seconds)     │
│      • ffmpeg -ss 180 -t 600 -c copy -i /tmp/video.mp4 10min.mp4    │
│                                                                        │
│    Why "-c copy"? (Stream Copy - FAST!)                               │
│      • No re-encoding - just copies the video stream                  │
│      • Time: ~10-20 seconds (vs 5+ minutes with re-encoding)         │
│      • Quality: Lossless (exact same as source)                       │
│                                                                        │
│    Output:                                                             │
│      • /tmp/first_10_minutes.mp4                                      │
│      • Size: ~300-500MB (depends on bitrate)                          │
│      • /tmp usage: 1-4GB (original) + 300-500MB (clip) = ~1.5-4.5GB │
│      • ✅ OK with 10GB                                                │
│                                                                        │
│    Then: DELETE /tmp/video.mp4 to free space!                        │
│      • /tmp usage after cleanup: ~300-500MB ✅                        │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 0.2: Generate 5-Second Clips                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Split 10-min video into 120 clips (5 seconds each)            │
│      • for i in range(120):                                           │
│          ffmpeg -ss {i*5} -t 5 -c copy -i 10min.mp4 clip_{i}.mp4    │
│                                                                        │
│    Output:                                                             │
│      • 120 clips × ~20-30MB each = ~2.4-3.6GB                        │
│      • /tmp usage: 300MB (10min) + 2.4-3.6GB (clips) = ~3-4GB       │
│      • ⚠️  High but manageable with 10GB                             │
│                                                                        │
│    Optimization Idea:                                                  │
│      • Could process clips in batches of 20, then delete             │
│      • Would reduce peak /tmp to ~1GB                                 │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 1: Clips to Descriptions (AI Analysis)                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Send each clip to Gemini Flash                                 │
│      • Batch processing: 10 concurrent requests                       │
│      • AI describes: "Player in blue kicks ball towards goal..."     │
│                                                                        │
│    Memory:                                                             │
│      • Reads clips one at a time (not all in memory)                  │
│      • ~100MB per clip in memory during upload                        │
│      • ✅ Low memory usage (~500MB peak)                              │
│                                                                        │
│    Time: ~2-3 minutes (120 clips, batched)                            │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 2: Create Coherent Narrative                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Combines all descriptions into timeline                        │
│      • Gemini Pro creates narrative flow                              │
│      • Identifies key moments                                         │
│                                                                        │
│    Memory: ~100MB (text processing)                                   │
│    Time: ~30 seconds                                                   │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 3: Event Classification                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Classifies events: Shot, Pass, Foul, Score, etc.              │
│      • Uses Gemini Pro for structured analysis                        │
│                                                                        │
│    Memory: ~100MB                                                      │
│    Time: ~30 seconds                                                   │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  STAGE 4: JSON Extraction (Frontend Format)                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • Converts classified events to GAASchemaEvent format            │
│      • Output: {                                                       │
│          "events": [                                                   │
│            {                                                           │
│              "id": "event_001",                                        │
│              "time": 65,           // Seconds into match              │
│              "team": "home",                                           │
│              "action": "Shot",     // Capitalized!                    │
│              "outcome": "Point",                                       │
│              "metadata": {                                             │
│                "scoreType": "point",                                   │
│                "from": "play",                                         │
│                "autoGenerated": true                                   │
│              }                                                          │
│            }                                                           │
│          ]                                                             │
│        }                                                               │
│                                                                        │
│    Memory: ~50MB (JSON)                                                │
│    Time: ~20 seconds                                                   │
│    ✅ Format aligned with event-transformer.ts                        │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  FINAL STEP: Post to Backend                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│    Process:                                                            │
│      • POST /api/games/{game_id}/events                               │
│      • Headers: x-lambda-api-key: {LAMBDA_API_KEY}                   │
│      • Body: {events: [...], match_info: {...}}                      │
│                                                                        │
│    Backend:                                                            │
│      • Validates Lambda API key                                       │
│      • Stores in games.events (JSONB column)                          │
│      • Updates status: 'analyzed'                                     │
│                                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  TOTAL TIME: ~6-10 minutes                                             │
│  PEAK MEMORY: ~500MB (mostly FFmpeg operations)                       │
│  PEAK /tmp: ~4GB (video + clips)                                      │
│  ✅ All within limits with 10GB /tmp                                  │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND DISPLAYS EVENTS                        │
│                                                                        │
│  • VideoPlayer.tsx loads game data                                    │
│  • event-transformer.ts converts GAASchemaEvent → GameEvent          │
│  • UnifiedSidebar displays events on timeline                         │
│  • User clicks event → video seeks to timestamp                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Resource Bottleneck Analysis

### **Before Update (512MB /tmp):**
```
❌ Stage 0.0: Download 2GB video → FAIL (exceeds 512MB)
❌ Stage 0.1: Extract 10min clip → FAIL (source > 512MB)
❌ Stage 0.2: Generate clips → FAIL (needs 3-4GB)
```

### **After Update (10GB /tmp):**
```
✅ Stage 0.0: Download 4GB video → OK (4GB < 10GB)
✅ Stage 0.1: Extract 10min clip → OK (4GB + 500MB < 10GB)
✅ Stage 0.2: Generate clips → OK (500MB + 3.6GB < 10GB)
✅ All stages → PASS
```

---

## 💰 Cost Implications

### **Lambda 2 with 10GB /tmp:**
- **Base cost**: $0.0000166667 per GB-second (3GB memory)
- **Ephemeral storage**: $0.0000000309 per GB-second (additional 9.5GB)
- **Typical execution**: 8 minutes = 480 seconds

**Cost per execution:**
- Compute: 3GB × 480s × $0.0000166667 = **$0.024**
- Storage: 9.5GB × 480s × $0.0000000309 = **$0.00014**
- **Total: ~$0.024 per analysis**

**For 100 videos/month:**
- Cost: $2.40/month
- Plus Gemini API calls: ~$0.50/video = $50/month
- **Total: ~$52/month** ✅ Very affordable!

---

## 🎯 Key Optimizations

1. **Stream to S3** (Lambda 1)
   - No local storage needed
   - Faster than download → upload

2. **Match Start Detection** (Stage 0.5)
   - Only analyzes 10 mins of actual gameplay
   - Skips pre-match footage
   - Saves 50% analysis time

3. **Stream Copy (-c copy)**
   - 10-20 seconds vs 5+ minutes
   - No quality loss
   - Minimal CPU usage

4. **Parallel API Calls**
   - 10 concurrent Gemini requests
   - Reduces Stage 1 from 15 mins → 2-3 mins

5. **Delete After Use**
   - Clean up full video after extracting 10min
   - Keeps /tmp usage manageable

---

## 🔍 Monitoring & Debugging

### **CloudWatch Logs:**

**Lambda 1 (VEO Downloader):**
```
/aws/lambda/gaa-veo-downloader-nov25

Look for:
- "✅ Video downloaded to S3"
- "Triggering AI Analyzer Lambda..."
- Error: "Failed to download video"
```

**Lambda 2 (AI Analyzer):**
```
/aws/lambda/gaa-ai-analyzer-nov25

Look for:
- Stage progress: "[Stage 0.0] Downloading video..."
- Match start time: "Match starts at 180 seconds"
- Events posted: "Successfully posted 45 events to backend"
- Errors: Check for /tmp space, memory, or timeout
```

### **Database Check:**
```sql
-- Check game status
SELECT id, status, s3_key, 
       jsonb_array_length(events) as event_count
FROM games 
WHERE id = 'your-game-id';

-- View events
SELECT jsonb_pretty(events) 
FROM games 
WHERE id = 'your-game-id';
```

---

## ✅ System Health Checklist

- [x] Lambda 2 deployed with 10GB /tmp
- [x] Lambda 1 triggers Lambda 2
- [x] Event format aligned with frontend
- [x] Match start detection working
- [x] Backend API endpoint ready
- [x] Database stores events properly
- [x] Frontend displays events correctly

**Status: PRODUCTION READY** ✅

