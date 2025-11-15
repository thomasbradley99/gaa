# GAA VEO Downloader Lambda Function

**Purpose:** Downloads GAA match videos from VEO URLs and uploads to S3 for display in the webapp.

**Part of:** GAA Webapp - Video Display System

---

## 🎯 What This Lambda Does

1. **Receives** game ID and VEO URL from backend
2. **Extracts** direct video URL from VEO match page
3. **Downloads** video file to Lambda `/tmp` directory
4. **Uploads** video to S3: `videos/{game_id}/video.mp4`
5. **Updates** database: sets `s3_key` and `status='analyzed'`

**No AI analysis** - This is purely for video download and storage.

---

## 📋 Lambda Function Details

**Function Name:** `gaa-veo-downloader-nov25`

**Runtime:** Python 3.11

**Timeout:** 15 minutes (videos can be large, 500MB+)

**Memory:** 512 MB (minimum, increase to 1024 MB for large videos)

**Architecture:** x86_64

---

## 🔧 Environment Variables

Required environment variables in Lambda:

```env
BUCKET_NAME=clann-gaa-videos-nov25
DATABASE_URL=postgresql://user:password@host:5432/gaa_app
AWS_REGION=eu-west-1
```

---

## 📦 Dependencies

See `requirements.txt`:
- `boto3` - AWS SDK for S3
- `psycopg2-binary` - PostgreSQL database connection
- `requests` - HTTP requests for VEO page scraping

---

## 🚀 Deployment

### Option 1: Automated Script (Recommended)

**Quick Deploy:**
```bash
cd lambda/veo-downloader

# Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/gaa_app"

# Run deployment script
./deploy.sh
```

**What the script does:**
1. ✅ Checks/creates S3 bucket
2. ✅ Installs Python dependencies
3. ✅ Creates deployment package
4. ✅ Deploys to AWS Lambda (create or update)
5. ✅ Sets environment variables
6. ✅ Cleans up temporary files

**See `DEPLOYMENT.md` for detailed documentation.**

---

### Option 2: AWS Console

1. **Create Lambda Function:**
   - Name: `gaa-veo-downloader-nov25`
   - Runtime: Python 3.11
   - Architecture: x86_64

2. **Upload Code:**
   - Create deployment package:
     ```bash
     cd lambda/veo-downloader
     pip install -r requirements.txt -t .
     zip -r function.zip .
     ```
   - Upload `function.zip` to Lambda

3. **Configure:**
   - Timeout: 15 minutes (900 seconds)
   - Memory: 512 MB (or 1024 MB)
   - Environment variables: Set BUCKET_NAME, DATABASE_URL, AWS_REGION

4. **IAM Permissions:**
   - S3: `PutObject` on `clann-gaa-videos-nov25` bucket
   - RDS/VPC: If database is in VPC, Lambda needs VPC access

### Option 3: AWS CLI (Manual)

```bash
# Create deployment package
cd lambda/veo-downloader
pip install -r requirements.txt -t .
zip -r function.zip .

# Create Lambda function
aws lambda create-function \
  --function-name gaa-veo-downloader-nov25 \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler lambda_handler.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 900 \
  --memory-size 512 \
  --environment Variables="{BUCKET_NAME=clann-gaa-videos-nov25,DATABASE_URL=...,AWS_REGION=eu-west-1}"
```

---

## 📥 Event Format

Lambda expects this event structure:

```json
{
  "game_id": "550e8400-e29b-41d4-a716-446655440000",
  "video_url": "https://veo.co/teams/123/matches/456"
}
```

**Fields:**
- `game_id` (required) - UUID of game record in database
- `video_url` (required) - VEO match URL to download from

---

## 📤 Response Format

**Success:**
```json
{
  "statusCode": 200,
  "body": {
    "message": "Video downloaded and uploaded successfully",
    "game_id": "550e8400-e29b-41d4-a716-446655440000",
    "s3_key": "videos/550e8400-e29b-41d4-a716-446655440000/video.mp4"
  }
}
```

**Error:**
```json
{
  "statusCode": 500,
  "body": {
    "error": "Error message here",
    "game_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

On error, Lambda also updates database `status='failed'`.

---

## 🔄 Integration with Backend

**Backend triggers Lambda:**
- When game is created with `file_type='veo'`
- Route: `POST /api/games`
- Lambda invoked asynchronously (Event invocation type)

**Backend environment variable:**
```env
AWS_LAMBDA_FUNCTION_NAME=gaa-veo-downloader-nov25
```

---

## 🧪 Testing Locally

```python
# test_lambda.py
import json
from lambda_handler import lambda_handler

event = {
    "game_id": "test-game-id",
    "video_url": "https://veo.co/teams/123/matches/456"
}

result = lambda_handler(event, None)
print(json.dumps(result, indent=2))
```

**Run:**
```bash
cd lambda/veo-downloader
python test_lambda.py
```

---

## 📊 Monitoring

**CloudWatch Logs:**
- Log group: `/aws/lambda/gaa-veo-downloader-nov25`
- Check for download progress, errors, S3 upload status

**Database:**
- Check `games` table: `s3_key` should be set after successful download
- Check `status`: Should change from 'pending' → 'analyzed' (or 'failed')

---

## 🐛 Troubleshooting

**Lambda not downloading:**
- Check VEO URL is accessible
- Check Lambda has internet access (if database is in VPC, Lambda needs NAT Gateway)
- Check CloudWatch logs for extraction errors

**S3 upload fails:**
- Check Lambda IAM role has `s3:PutObject` permission
- Check bucket name matches `BUCKET_NAME` env var
- Check bucket exists and is accessible

**Database update fails:**
- Check `DATABASE_URL` is correct
- Check Lambda can connect to database (VPC configuration if RDS)
- Check database user has UPDATE permission on `games` table

---

## 📝 Related Files

- **Backend trigger:** `backend/routes/games.js` - Triggers Lambda on VEO URL submission
- **Video player:** `frontend/src/components/games/video-player/` - Displays videos from S3
- **S3 utils:** `backend/utils/s3.js` - Generates presigned URLs for playback

---

## ✅ Status

- ✅ Lambda function code complete
- ✅ Backend integration complete
- ⏳ Lambda function needs deployment to AWS
- ⏳ IAM role and permissions need setup

---

**Last Updated:** 2025-01-13  
**Maintained by:** GAA Webapp Team
