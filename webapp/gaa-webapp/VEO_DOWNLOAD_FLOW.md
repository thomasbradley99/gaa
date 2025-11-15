# GAA VEO Download Flow - Video Display Only

## 🎯 What This Does

Simple flow to download GAA match videos from VEO URLs and display them in the webapp.

**NO AI analysis** - This is purely for video download, storage, and display.

## 📋 Complete Flow

### 1. User Submits VEO URL
- User pastes VEO URL in dashboard
- Frontend sends to `/api/games` with `videoUrl`

### 2. Backend Creates Game
- Backend creates game record:
  - `video_url` = VEO URL
  - `file_type` = 'veo'
  - `status` = 'pending'
  - `s3_key` = null (will be set by Lambda)

### 3. Backend Triggers Lambda
- If `file_type === 'veo'`, backend triggers Lambda:
  ```javascript
  {
    game_id: "uuid",
    video_url: "https://veo.co/teams/123/matches/456"
  }
  ```

### 4. Lambda Downloads Video
- Lambda extracts direct video URL from VEO page
- Downloads video file
- Uploads to S3: `videos/{game_id}/video.mp4`

### 5. Lambda Updates Database
- Updates game record:
  - `s3_key` = `videos/{game_id}/video.mp4`
  - `status` = 'analyzed'

### 6. Video Displays
- User clicks game → game detail page loads
- Backend generates presigned S3 URL
- Video player loads video from S3
- Video plays! ✅

## 🔧 Setup Required

### Backend Environment Variables
```env
AWS_LAMBDA_FUNCTION_NAME=gaa-veo-downloader
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=eu-west-1
```

### Lambda Function Setup
1. **Create Lambda function:** `gaa-veo-downloader-nov25`
2. **Upload code:** `lambda/veo-downloader/lambda_handler.py` + dependencies
3. **Set environment variables:**
   - `BUCKET_NAME` = clann-gaa-videos-nov25
   - `DATABASE_URL` = your database URL
   - `AWS_REGION` = eu-west-1
4. **Configure:**
   - Timeout: 15 minutes (900 seconds)
   - Memory: 512 MB (minimum, 1024 MB recommended for large videos)
   - Runtime: Python 3.11
5. **IAM Permissions:**
   - S3: `PutObject` on `clann-gaa-videos-nov25` bucket
   - RDS: Connect to database (VPC configuration if needed)

## 📁 Files Created

- `lambda/veo-downloader/lambda_handler.py` - Lambda function
- `lambda/veo-downloader/requirements.txt` - Python dependencies
- `lambda/veo-downloader/README.md` - Deployment guide

## 🔄 What Happens When

**User submits VEO URL:**
1. ✅ Game created with `status='pending'`
2. ✅ Lambda triggered (async)
3. ⏳ Lambda downloads video (2-5 minutes)
4. ✅ Lambda updates `s3_key` and `status='analyzed'`
5. ✅ Video appears in dashboard
6. ✅ Video plays when clicked

**User uploads file:**
1. ✅ File uploaded to S3 directly
2. ✅ Game created with `s3_key` set
3. ✅ Video plays immediately

## 🐛 Troubleshooting

**Lambda not triggering:**
- Check AWS credentials in backend `.env`:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
- Check `AWS_LAMBDA_FUNCTION_NAME=gaa-veo-downloader-nov25` matches Lambda function name
- Check backend logs for Lambda invocation errors
- Verify Lambda function exists in AWS Console

**Video not downloading:**
- Check Lambda logs in AWS Console
- Verify VEO URL is accessible
- Check Lambda has S3 write permissions

**Video not displaying:**
- Check `s3_key` is set in database
- Check presigned URL generation works
- Check S3 bucket CORS configuration

## ✅ Implementation Status

- ✅ Lambda function code: `lambda/veo-downloader/lambda_handler.py`
- ✅ Backend integration: `backend/routes/games.js`
- ✅ Video player: Already supports S3 videos
- ✅ Documentation: `lambda/veo-downloader/README.md`
- ⏳ **TODO:** Deploy Lambda function to AWS
- ⏳ **TODO:** Set up IAM role and permissions
- ⏳ **TODO:** Test end-to-end flow

---

## 📚 Related Documentation

- **Lambda README:** `lambda/veo-downloader/README.md` - Full deployment guide
- **Architecture:** `GAA_WEBAPP_ARCHITECTURE.md` - Overall system architecture
- **Video Player:** `VIDEO_PLAYER_ARCHITECTURE.md` - Video player implementation

---

**Last Updated:** 2025-01-13  
**GAA Webapp - Video Display System**

