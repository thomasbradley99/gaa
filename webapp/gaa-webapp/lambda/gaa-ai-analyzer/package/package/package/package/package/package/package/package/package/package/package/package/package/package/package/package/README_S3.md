# GAA AI Analyzer Lambda - S3 Version

**Purpose:** Analyzes GAA match videos already stored in S3 (uploaded by `gaa-veo-downloader-nov25`)

**Function Name:** `gaa-ai-analyzer-nov25`

---

## 🎯 What It Does

1. **Downloads video from S3** to Lambda `/tmp`
2. **Stage 0.0**: Extracts calibration frames (30s, 5min, 25min)
3. **Stage 0.5**: Calibrates game
   - Detects team colors
   - **Finds match start time** (critical!)
   - Identifies attacking directions
4. **Stage 0.1**: Extracts first 10 minutes **from match start**
5. **Stage 0.2**: Generates 10 x 60-second clips
6. **Stage 1**: Analyzes all clips in parallel with Gemini AI
7. **Stage 2-4**: Creates narrative → Classifies events → Extracts JSON
8. **Stage 5**: Exports to Anadi XML format
9. **Posts events to backend** via API
10. **Updates database**: Status = `'analyzed'`

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

### Posts to Backend API:
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
    // ... more events
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

## ⚙️ Environment Variables

Required:
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection string
- `AWS_BUCKET_NAME` - S3 bucket (default: clann-gaa-videos-nov25)
- `AWS_REGION` - AWS region (default: eu-west-1)
- `BACKEND_API_URL` - Backend API URL
- `LAMBDA_API_KEY` - API key for backend authentication

---

## 🚀 Deployment

### Quick Deploy

```bash
cd lambda/gaa-ai-analyzer

# Set required env vars
export GEMINI_API_KEY="your-gemini-api-key"
export DATABASE_URL="postgresql://user:pass@host:5432/gaa_app"

# Optional env vars (have defaults)
export AWS_BUCKET_NAME="clann-gaa-videos-nov25"
export BACKEND_API_URL="https://api-gaa.clannai.com"
export LAMBDA_API_KEY="gaa-lambda-secret-key-change-in-production"

# Deploy
./deploy-s3.sh
```

### Manual Deploy

```bash
# 1. Install dependencies
pip3 install -r requirements.txt -t ./package \
    --platform manylinux2014_x86_64 \
    --only-binary=:all:

# 2. Create deployment package
cd package && zip -r9 ../deployment.zip .
cd .. && zip -g deployment.zip lambda_handler_s3.py utils.py
zip -g deployment.zip -r stages/

# 3. Create/update function
aws lambda create-function \
  --function-name gaa-ai-analyzer-nov25 \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/clann-gaa-lambda-role-nov25 \
  --handler lambda_handler_s3.lambda_handler \
  --zip-file fileb://deployment.zip \
  --timeout 900 \
  --memory-size 10240 \
  --region eu-west-1

# 4. Set environment variables
aws lambda update-function-configuration \
  --function-name gaa-ai-analyzer-nov25 \
  --environment Variables="{
    GEMINI_API_KEY=...,
    DATABASE_URL=...,
    AWS_BUCKET_NAME=clann-gaa-videos-nov25,
    AWS_REGION=eu-west-1,
    BACKEND_API_URL=https://api-gaa.clannai.com,
    LAMBDA_API_KEY=...
  }" \
  --region eu-west-1
```

---

## 🧪 Testing

### Test with AWS CLI

```bash
aws lambda invoke \
  --function-name gaa-ai-analyzer-nov25 \
  --payload '{"game_id":"test-123","s3_key":"videos/test-123/video.mp4"}' \
  --region eu-west-1 \
  response.json

cat response.json
```

### Monitor Logs

```bash
# Tail logs
aws logs tail /aws/lambda/gaa-ai-analyzer-nov25 --follow --region eu-west-1

# Get latest log stream
aws logs describe-log-streams \
  --log-group-name /aws/lambda/gaa-ai-analyzer-nov25 \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --region eu-west-1
```

---

## 🔄 Integration with VEO Downloader

### Lambda 1 (veo-downloader) triggers Lambda 2 (ai-analyzer)

After successful video download, Lambda 1 automatically invokes Lambda 2:

```python
# In veo-downloader lambda_handler.py
trigger_ai_analyzer(game_id, s3_key)
```

### Environment Variable in Lambda 1:
```bash
AI_ANALYZER_FUNCTION_NAME=gaa-ai-analyzer-nov25
```

---

## 📊 Performance

**Total Duration:** ~3-4 minutes per 10-minute analysis

Breakdown:
- Download from S3: 20-30s (depends on file size)
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
- Pro (analysis): ~$0.15
- **Total Gemini**: ~$0.16

**Lambda:**
- 10GB memory × 4 min = $0.03
- **Total Lambda**: ~$0.03

**S3:**
- Transfer: Negligible (same region)

**TOTAL: ~$0.19 per match**

---

## 🐛 Troubleshooting

### Lambda Timeout
- Increase timeout to 15 minutes (max)
- Current: 900 seconds ✅

### Out of Memory
- Increase memory to 10GB (max)
- Current: 10240 MB ✅

### Video Download Fails
- Check S3 permissions on Lambda execution role
- Verify s3_key exists in bucket

### AI Analysis Fails
- Check GEMINI_API_KEY is valid
- Check API quota limits
- Review CloudWatch logs for specific errors

### Events Not Appearing
- Check BACKEND_API_URL is correct
- Check LAMBDA_API_KEY matches backend
- Verify `/api/games/:id/events` endpoint works

---

## 📝 Database Status Flow

```
User submits VEO URL
  ↓
Lambda 1: Downloads → Status = 'downloaded'
  ↓
Lambda 2: Triggered automatically
  ↓
Status = 'processing' (AI running)
  ↓
Events detected and posted
  ↓
Status = 'analyzed' ✅
```

Frontend can poll status to show:
- "Downloading video..." (downloaded)
- "Analyzing with AI..." (processing)
- "Analysis complete!" (analyzed)

---

## ✅ Verification Checklist

After deployment:

- [ ] Lambda function exists in AWS Console
- [ ] Environment variables set correctly
- [ ] Timeout = 900s (15 min)
- [ ] Memory = 10240 MB (10GB)
- [ ] IAM role has S3 read access
- [ ] IAM role has RDS/database access
- [ ] Test invocation works
- [ ] CloudWatch logs appear
- [ ] Events post to backend successfully
- [ ] Frontend displays events correctly

---

**Last Updated:** 2025-11-17  
**Status:** Ready for Deployment

