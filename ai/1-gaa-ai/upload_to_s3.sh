#!/bin/bash
# Upload files to S3 for webapp

set -e

GAME="cmull-vs-castleconnor"
S3_BASE="s3://end-nov-webapp-clann/gaa-analysis"
REGION="eu-west-1"

echo "📤 Uploading files to S3..."
echo ""

# Upload JS data files
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai/games/${GAME}
echo "📁 Uploading JS data files..."
aws s3 cp ai_events_data.js ${S3_BASE}/${GAME}/ai_events_data.js --region ${REGION}
aws s3 cp professional_events_data.js ${S3_BASE}/${GAME}/professional_events_data.js --region ${REGION}
aws s3 cp descriptions_data.js ${S3_BASE}/${GAME}/descriptions_data.js --region ${REGION}

# Upload game profile
cd inputs
echo "📁 Uploading game profile..."
aws s3 cp game_profile.json ${S3_BASE}/${GAME}/game_profile.json --region ${REGION}

# Upload web viewer
cd ../../pipelines/production1
echo "📁 Uploading web viewer..."
aws s3 cp game_viewer.html ${S3_BASE}/game_viewer.html --region ${REGION}

echo ""
echo "✅ Upload complete!"
echo ""
echo "🌐 Webapp URL:"
echo "https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game=${GAME}&audio=with-audio"

