# Fix S3 Upload for GAA Viewer

## Problem
AWS credentials are invalid - getting "InvalidAccessKeyId" error.

## Solution Options

### Option 1: Fix AWS Credentials
You need valid AWS credentials with S3 write permissions:

```bash
# Check current config
aws configure list

# Reconfigure (if needed)
aws configure
# Enter:
# - AWS Access Key ID: [your key]
# - AWS Secret Access Key: [your secret]
# - Default region: eu-west-1
# - Default output format: json
```

### Option 2: Use Local Test Server (Already Running)
The local test server is working:
```
http://localhost:8001/gaa-analysis/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio
```

### Option 3: Manual Upload via AWS Console
1. Go to S3 console: https://s3.console.aws.amazon.com/s3/buckets/end-nov-webapp-clann
2. Navigate to `gaa-analysis/` folder
3. Upload:
   - `game_viewer.html` (from pipelines/production1/)
   - Create folder `cmull-vs-castleconnor/`
   - Upload `professional_events_data.js` and `descriptions_data.js`
   - Upload `video.mp4` (743MB)

### Option 4: Check if Someone Else Can Upload
The files are ready at:
- `/home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production1/game_viewer.html`
- `/home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/*.js`
- `/home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/inputs/cmull-vs-castleconnor.mp4`
