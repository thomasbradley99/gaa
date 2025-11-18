# GAA AI Analyzer Lambda

Analyzes the first 10 minutes of GAA matches using Gemini AI in production pipeline structure.

## Pipeline Stages

### 0.0 Download Calibration Frames
Extracts a few frames from the video for team detection

### 0.5 Calibrate Game
Analyzes frames in parallel to identify teams, colors, and match times

### 0.1 Extract First 10 Minutes
Streams and extracts first 10 minutes from VEO URL (using calibrated start time)

### 0.2 Generate Clips
Splits 10-minute video into 10 x 60-second clips (ultra-fast with ffmpeg stream copy)

### 1. Clips to Descriptions
**PARALLEL** - Analyzes all 10 clips simultaneously with Gemini 2.5 Pro

### 2. Create Coherent Narrative
Stitches clip descriptions into coherent play-by-play

### 3. Event Classification
Classifies GAA events (kickouts, shots, turnovers, fouls, etc.)

### 4. JSON Extraction
Converts classified events to structured JSON

### 5. Export to Anadi XML
Exports events in Anadi iSportsAnalysis XML format

## Performance

**Total time: ~3-4 minutes** for first 10 minutes analysis

- Stage 0.0: 30s (frame extraction)
- Stage 0.5: 20s (parallel calibration)
- Stage 0.1: 40s (stream first 10 mins)
- Stage 0.2: 15s (generate clips)
- Stage 1: 40s (parallel Gemini - 10 clips at once!)
- Stages 2-5: 60s (sequential processing)

## Lambda Configuration

```yaml
Memory: 10GB (max)
Timeout: 15 minutes (max)
/tmp storage: 10GB
Runtime: Python 3.11
Layers: ffmpeg binary layer
```

## Environment Variables

Required:
- `GEMINI_API_KEY` - Google Gemini API key
- `BACKEND_API_URL` - Backend API URL (e.g., https://your-backend.com)
- `LAMBDA_API_KEY` - API key for posting results back to backend

## Deployment

```bash
# Deploy Lambda
./deploy.sh
```

## Local Testing

```bash
# Set environment variables
export GEMINI_API_KEY="your-key-here"
export BACKEND_API_URL="http://localhost:4011"
export LAMBDA_API_KEY="test-key"

# Run locally
python3 lambda_handler.py
```

## Event Format

Posts events to backend in this format:

```json
{
  "events": [
    {
      "id": "event_001",
      "timestamp": 65,
      "type": "shot",
      "team": "home",
      "description": "Blue scores point over the bar",
      "metadata": {
        "scoreType": "point"
      }
    }
  ]
}
```

## Cost Estimate

**Per 10-minute analysis:**
- Gemini Flash (calibration): ~$0.01
- Gemini Pro (10 clips + processing): ~$0.15
- **Total: ~$0.16 per match**

At scale:
- 100 matches/month: ~$16/month
- 1000 matches/month: ~$160/month

