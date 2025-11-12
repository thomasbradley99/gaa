# Upload GAA Game Viewer to S3

To make the viewer work like the football one, upload these files:

## 1. Upload game viewer HTML
```bash
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai
aws s3 cp pipelines/production1/game_viewer.html \
  s3://end-nov-webapp-clann/gaa-analysis/game_viewer.html \
  --content-type "text/html"
```

## 2. Upload data files
```bash
aws s3 cp games/cmull-vs-castleconnor/professional_events_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/professional_events_data.js \
  --content-type "application/javascript"

aws s3 cp games/cmull-vs-castleconnor/descriptions_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/descriptions_data.js \
  --content-type "application/javascript"
```

## 3. Upload video (743MB - will take time)
```bash
aws s3 cp games/cmull-vs-castleconnor/inputs/cmull-vs-castleconnor.mp4 \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/video.mp4 \
  --content-type "video/mp4"
```

## After upload, access at:
https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio

## Note:
You'll need AWS credentials configured. Check with:
```bash
aws configure list
```
