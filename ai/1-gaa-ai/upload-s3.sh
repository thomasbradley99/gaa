#!/bin/bash
# Upload GAA viewer files to S3

cd /home/ubuntu/clann/gaa/ai/1-gaa-ai

echo "📤 Uploading GAA Game Viewer to S3..."
echo ""

# 1. Upload game viewer HTML
echo "1️⃣ Uploading game_viewer.html..."
aws s3 cp pipelines/production1/game_viewer.html \
  s3://end-nov-webapp-clann/gaa-analysis/game_viewer.html \
  --content-type "text/html" \
  --acl public-read

# 2. Upload data files
echo ""
echo "2️⃣ Uploading data files..."
aws s3 cp games/cmull-vs-castleconnor/professional_events_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/professional_events_data.js \
  --content-type "application/javascript" \
  --acl public-read

aws s3 cp games/cmull-vs-castleconnor/descriptions_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/descriptions_data.js \
  --content-type "application/javascript" \
  --acl public-read

# 3. Upload video
echo ""
echo "3️⃣ Uploading video (743MB - this will take a while)..."
aws s3 cp games/cmull-vs-castleconnor/inputs/cmull-vs-castleconnor.mp4 \
  s3://end-nov-webapp-clann/gaa-analysis/cmull-vs-castleconnor/video.mp4 \
  --content-type "video/mp4" \
  --acl public-read

echo ""
echo "✅ Upload complete!"
echo ""
echo "🌐 Access at:"
echo "https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=cmull-vs-castleconnor&audio=with-audio"
