#!/bin/bash
# Upload GAA viewer files to S3 - Kilmeena vs Cill Chomain (First 10 Minutes)

cd /home/ubuntu/clann/gaa/ai/2-gaa-ai

echo "📤 Uploading Kilmeena vs Cill Chomain - First 10 Minutes..."
echo ""

# 1. Upload game viewer HTML
echo "1️⃣ Uploading game_viewer.html..."
aws s3 cp pipelines/production1/game_viewer.html \
  s3://end-nov-webapp-clann/gaa-analysis/game_viewer.html \
  --content-type "text/html"

# 2. Upload data files
echo ""
echo "2️⃣ Uploading data files (first 10 mins pro events)..."
aws s3 cp games/kilmeena-vs-cill-chomain/professional_events_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/kilmeena-vs-cill-chomain/professional_events_data.js \
  --content-type "application/javascript"

aws s3 cp games/kilmeena-vs-cill-chomain/ai_events_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/kilmeena-vs-cill-chomain/ai_events_data.js \
  --content-type "application/javascript"

aws s3 cp games/kilmeena-vs-cill-chomain/descriptions_data.js \
  s3://end-nov-webapp-clann/gaa-analysis/kilmeena-vs-cill-chomain/descriptions_data.js \
  --content-type "application/javascript"

# 3. Upload video (2.7GB - this will take a while)
echo ""
echo "3️⃣ Uploading video (2.7GB - this will take a while)..."
aws s3 cp games/kilmeena-vs-cill-chomain/inputs/kilmeena-vs-cill-chomain.mp4 \
  s3://end-nov-webapp-clann/gaa-analysis/kilmeena-vs-cill-chomain/video.mp4 \
  --content-type "video/mp4"

echo ""
echo "✅ Upload complete!"
echo ""
echo "🌐 Access at:"
echo "https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=kilmeena-vs-cill-chomain&audio=with-audio"
echo ""
echo "📊 Showing:"
echo "   - Pro Events: 20 (first 10 mins, detectable only)"
echo "   - AI Events: 96 (old run, just for comparison)"
echo "   - Descriptions: 33 (old run)"
