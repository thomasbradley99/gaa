# Manual S3 Upload Instructions

Since AWS CLI credentials aren't working, upload via AWS Console:

## Step 1: Go to S3 Console
https://s3.console.aws.amazon.com/s3/buckets/end-nov-webapp-clann?region=eu-west-1

## Step 2: Navigate to gaa-analysis folder
- Click on bucket: `end-nov-webapp-clann`
- Navigate to or create folder: `gaa-analysis/`

## Step 3: Upload game_viewer.html
- Click "Upload"
- Add file: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production1/game_viewer.html`
- Set Content-Type: `text/html`
- Set Permissions: Public read access
- Upload

## Step 4: Create game folder
- Inside `gaa-analysis/`, create folder: `cmull-vs-castleconnor/`

## Step 5: Upload data files
Upload these files to `gaa-analysis/cmull-vs-castleconnor/`:

1. **professional_events_data.js**
   - Path: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/professional_events_data.js`
   - Content-Type: `application/javascript`
   - Permissions: Public read

2. **descriptions_data.js**
   - Path: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/descriptions_data.js`
   - Content-Type: `application/javascript`
   - Permissions: Public read

3. **video.mp4** (743MB - will take time)
   - Path: `/home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/inputs/cmull-vs-castleconnor.mp4`
   - Upload as: `video.mp4` (rename during upload)
   - Content-Type: `video/mp4`
   - Permissions: Public read

## Step 6: Verify
After upload, test:
https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio
