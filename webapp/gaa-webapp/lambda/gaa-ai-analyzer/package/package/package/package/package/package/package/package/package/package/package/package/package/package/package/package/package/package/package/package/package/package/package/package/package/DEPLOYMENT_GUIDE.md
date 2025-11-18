# GAA AI Analyzer - Deployment Guide

## What We Built

A **Lambda-based AI analyzer** that processes the **first 10 minutes** of GAA matches using your existing production pipeline structure, but optimized for AWS Lambda.

## Pipeline Overview

```
VEO URL Input
    ↓
0.0 Download Calibration Frames (30s)
    ↓
0.5 Calibrate Game - Parallel Gemini (20s)
    ↓
0.1 Extract First 10 Minutes (40s)
    ↓
0.2 Generate 10 x 60s Clips (15s)
    ↓
1. Clips to Descriptions - PARALLEL 10 clips (40s)
    ↓
2. Create Coherent Narrative (20s)
    ↓
3. Event Classification (20s)
    ↓
4. JSON Extraction (15s)
    ↓
5. Export to Anadi XML (5s)
    ↓
Post Results to Backend API
```

**Total: ~3-4 minutes per match**

## Key Features

✅ **Keeps your exact numbering system** (0.0, 0.5, 0.1, 0.2, 1-5)
✅ **Parallel Gemini calls** in stage 1 (10 clips analyzed simultaneously)
✅ **No full video download** - streams first 10 mins only
✅ **Ultra-fast clip generation** - ffmpeg stream copy (no re-encoding)
✅ **Same prompt structure** as your production pipeline
✅ **Automatic calibration** - detects teams and match times
✅ **Posts results to backend** automatically

## Deployment Steps

### 1. Install ffmpeg Lambda Layer

```bash
# Use serverlesspub's ffmpeg layer
# https://github.com/serverlesspub/ffmpeg-aws-lambda-layer

# For eu-west-1:
FFMPEG_LAYER_ARN="arn:aws:lambda:eu-west-1:764866452798:layer:ffmpeg:1"
```

### 2. Update deploy.sh with your details

```bash
# Edit deploy.sh:
- ROLE_ARN (your Lambda execution role)
- GEMINI_API_KEY
- BACKEND_API_URL
- LAMBDA_API_KEY
```

### 3. Deploy

```bash
cd lambda/gaa-ai-analyzer
./deploy.sh
```

### 4. Add ffmpeg layer in AWS Console

1. Go to Lambda function
2. Layers → Add Layer
3. Specify ARN: `arn:aws:lambda:eu-west-1:764866452798:layer:ffmpeg:1`

### 5. Update Backend to Trigger Lambda

Your backend already has `triggerVeoDownload()` function in `routes/games.js`.

Update it to call the new AI analyzer:

```javascript
const lambdaFunctionName = process.env.AWS_LAMBDA_AI_ANALYZER || 'gaa-ai-analyzer';
```

## Environment Variables

Set in Lambda:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
BACKEND_API_URL=https://your-backend.com (or http://localhost:4011 for dev)
LAMBDA_API_KEY=your-lambda-api-key
```

## Testing

### Local Test

```bash
cd lambda/gaa-ai-analyzer

export GEMINI_API_KEY="your-key"
export BACKEND_API_URL="http://localhost:4011"
export LAMBDA_API_KEY="test-key"

python3 lambda_handler.py
```

### Lambda Test Event

```json
{
  "game_id": "test-game-123",
  "video_url": "https://veo.co/teams/southport-trinity-gaa/matches/2024-07-14-southport-trinity-vs-st-chads/22dd26be",
  "title": "Test Match"
}
```

## Cost Estimate

**Per 10-minute analysis:**
- Gemini Flash (calibration): $0.01
- Gemini Pro (10 clips + processing): $0.15
- Lambda compute (10GB, 4 mins): $0.02
- **Total: ~$0.18 per match**

**At scale:**
- 100 matches/month: $18
- 1000 matches/month: $180

## Troubleshooting

### Lambda timeout
- Increase timeout to 15 minutes (max)
- Increase memory to 10GB (max)

### "No space left on device"
- Lambda has 10GB /tmp - should be enough
- Check clip generation isn't creating huge files

### Gemini API errors
- Check API key is set
- Check API quota limits
- Retry with exponential backoff (built into google-generativeai SDK)

### Video stream fails
- VEO URL might be expired/invalid
- Try proxying through backend first
- Check network connectivity from Lambda

## Next Steps

1. Deploy Lambda
2. Test with one VEO URL
3. Update backend to auto-trigger on game upload
4. Monitor CloudWatch logs
5. Optimize costs if needed (use Flash instead of Pro for some stages)

## Pipeline Customization

Want to analyze full match instead of 10 mins?

Edit `stage_0_1_extract_first_10mins.py`:
```python
duration = 2700  # 45 minutes (full first half)
```

Want more/fewer clips?

Edit `stage_0_2_generate_clips.py`:
```python
'-segment_time', '30',  # 30-second clips instead of 60
```

Want different events?

Edit `stage_3_event_classification.py` prompt to include/exclude event types.

