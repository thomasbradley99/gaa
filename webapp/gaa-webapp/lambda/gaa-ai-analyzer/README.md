# GAA AI Analyzer Lambda

**Function Name:** `gaa-ai-analyzer-nov25`  
**Purpose:** Analyzes GAA match videos from S3, detects events, and posts to backend

---

## 🎯 What It Does

Analyzes the first 10 minutes of GAA matches using Gemini AI in production pipeline structure.

**Flow:**
1. Downloads video from S3 to Lambda `/tmp`
2. Extracts calibration frames and detects team colors + match start time
3. Extracts first 10 minutes from match start
4. Generates 10 × 60-second clips
5. Analyzes all clips in parallel with Gemini AI
6. Creates narrative → Classifies events → Extracts JSON
7. Exports to Anadi XML format
8. Posts events to backend API
9. Updates game status to `'analyzed'`

---

## 📥 Input Event Format

```json
{
  "game_id": "uuid",
  "s3_key": "videos/{game_id}/video.mp4",
  "title": "Team A vs Team B"
}
```

---

## 📤 Output

### Posts to Backend:
```
POST /api/games/{game_id}/events
X-API-Key: {LAMBDA_API_KEY}

{
  "events": [
    {
      "id": "event_1",
      "time": 23,          // Seconds from match start
      "team": "home",
      "action": "Throw-up",
      "outcome": "Won"
    },
    {
      "id": "event_2", 
      "time": 65,
      "team": "home",
      "action": "Shot",
      "outcome": "Point"
    }
  ],
  "match_info": {
    "title": "10-minute analysis",
    "total_events": 50,
    "analysis_method": "Gemini AI"
  },
  "team_mapping": {
    "red": "home",
    "blue": "away"
  }
}
```

### Uploads to S3:
- `videos/{game_id}/analysis.xml` - Anadi format XML

---

## 🔄 Pipeline Stages

### Stage 0.0: Download Calibration Frames
Extracts 3 frames (30s, 5min, 25min) for team detection

### Stage 0.5: Calibrate Game
Analyzes frames in parallel to identify:
- Team colors (e.g., "green", "blue")
- Match start time (e.g., 300 seconds into recording)
- Attacking directions

### Stage 0.1: Extract First 10 Minutes
Streams and extracts first 10 minutes from match start

### Stage 0.2: Generate Clips
Splits 10-minute video into 10 × 60-second clips (ultra-fast with ffmpeg stream copy)

### Stage 1: Clips to Descriptions
**PARALLEL** - Analyzes all 10 clips simultaneously with Gemini 2.0 Flash

### Stage 2: Create Coherent Narrative
Stitches clip descriptions into coherent play-by-play

### Stage 3: Event Classification
Classifies GAA events (kickouts, shots, turnovers, fouls, etc.)

### Stage 4: JSON Extraction
Converts classified events to structured JSON

### Stage 5: Export to Anadi XML
Exports events in Anadi iSportsAnalysis XML format

---

## 📊 Performance

**Total Duration:** ~3-4 minutes per 10-minute analysis

Breakdown:
- Download from S3: 20-30s
- Stage 0.0 (calibration frames): 10s
- Stage 0.5 (calibration AI): 20s
- Stage 0.1 (extract 10 mins): 15s
- Stage 0.2 (generate clips): 15s
- Stage 1 (parallel AI - 10 clips): 40s
- Stages 2-5 (narrative → events → XML): 60s
- Post to backend: 5s

**Memory Used:** ~8-9GB (requires 10GB allocation)

---

## 💰 Cost Per Match

**Gemini API:**
- Flash (calibration): ~$0.01
- Flash (10 clips + processing): ~$0.15
- **Total Gemini**: ~$0.16

**Lambda:**
- 10GB memory × 4 min = $0.03

**TOTAL: ~$0.19 per match**

At scale:
- 100 matches/month: ~$19/month
- 1000 matches/month: ~$190/month

---

## ⚙️ Environment Variables

Required:
- `GEMINI_API_KEY` - Google Gemini API key
- `BACKEND_API_URL` - Backend API URL (e.g., https://api-gaa.clannai.com)
- `LAMBDA_API_KEY` - API key for posting results back to backend
- `AWS_BUCKET_NAME` - S3 bucket (default: clann-gaa-videos-nov25)
- `AWS_REGION` - AWS region (default: eu-west-1)

---

## 🚀 Deployment

### Docker Deployment (Current Method)

```bash
cd lambda/gaa-ai-analyzer

# Build and deploy Docker image
./docker-deploy.sh
```

This script:
1. Builds Docker image with FFmpeg
2. Pushes to AWS ECR
3. Updates Lambda function

### Lambda Configuration
```yaml
Memory: 10GB (max)
Timeout: 15 minutes (max)
Runtime: Python 3.11 (container)
Image: gaa-ai-analyzer:latest
```

---

## 🔄 Integration with VEO Downloader

Lambda 1 (`gaa-veo-downloader-nov25`) automatically triggers this Lambda after video download:

```python
# Lambda 1 invokes Lambda 2 with:
{
  "game_id": "uuid",
  "s3_key": "videos/{game_id}/video.mp4",
  "title": "Team A vs Team B"
}
```

---

## 🧪 Testing

### Test with AWS CLI

```bash
aws lambda invoke \
  --function-name gaa-ai-analyzer-nov25 \
  --payload '{"game_id":"test-123","s3_key":"videos/test-123/video.mp4","title":"Test Match"}' \
  --region eu-west-1 \
  response.json

cat response.json
```

### Monitor Logs

```bash
# Tail logs in real-time
aws logs tail /aws/lambda/gaa-ai-analyzer-nov25 --follow --region eu-west-1

# Get recent logs
aws logs tail /aws/lambda/gaa-ai-analyzer-nov25 --since 30m --region eu-west-1
```

---

## 🐛 Troubleshooting

### Lambda Timeout
- Current: 900 seconds (15 min) ✅
- If timeouts occur, check video file size

### Out of Memory
- Current: 10240 MB (10GB) ✅
- Check CloudWatch logs for memory usage

### Video Download Fails
- Check S3 permissions on Lambda execution role
- Verify `s3_key` exists in bucket

### AI Analysis Fails
- Check `GEMINI_API_KEY` is valid
- Check API quota limits
- Review CloudWatch logs for specific errors

### Events Not Appearing
- Check `BACKEND_API_URL` is correct
- Check `LAMBDA_API_KEY` matches backend
- Verify `/api/games/:id/events` endpoint works
- Check backend logs

---

## 📝 Database Status Flow

```
User submits VEO URL
  ↓
Lambda 1: Downloads → Status = 'downloaded'
  ↓
Lambda 2: Triggered automatically → Status = 'processing'
  ↓
AI analysis runs
  ↓
Events detected and posted → Status = 'analyzed' ✅
```

Frontend shows:
- "Downloading video..." (downloaded)
- "Analyzing with AI..." (processing)
- "Analysis complete!" (analyzed)

---

## 📂 Files

- `lambda_handler_s3.py` - Main handler (S3 download version)
- `Dockerfile` - Container image definition
- `docker-deploy.sh` - Deployment script
- `requirements.txt` - Python dependencies
- `stages/` - AI processing stages
  - `stage_0_5_calibration.py` - Team color detection
  - `stage_1_clips_to_descriptions.py` - Clip analysis
  - `stage_2_create_narrative.py` - Narrative creation
  - `stage_3_event_classification.py` - Event classification
  - `stage_4_json_extraction.py` - JSON extraction
  - `stage_5_export_anadi_xml.py` - XML export
- `utils/` - Helper functions

---

## ✅ Verification Checklist

After deployment:

- [ ] Lambda function exists in AWS Console
- [ ] Environment variables set correctly
- [ ] Timeout = 900s (15 min)
- [ ] Memory = 10240 MB (10GB)
- [ ] IAM role has S3 read access
- [ ] Test invocation works
- [ ] CloudWatch logs appear
- [ ] Events post to backend successfully
- [ ] Frontend displays events correctly

---

**Last Updated:** November 19, 2025  
**Status:** Deployed and working (Docker-based)
