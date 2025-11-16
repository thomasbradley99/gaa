#!/bin/bash
set -e

echo "🚀 Deploying GAA AI Analyzer Lambda"

# Configuration
FUNCTION_NAME="gaa-ai-analyzer"
REGION="eu-west-1"
RUNTIME="python3.11"
MEMORY=3008  # 3GB (AWS Lambda max)
TIMEOUT=900   # 15 minutes

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf package
rm -f deployment.zip

# Install Python dependencies
pip3 install -r requirements.txt --target ./package --platform manylinux2014_x86_64 --only-binary=:all:

# Copy Lambda code
cp lambda_handler.py package/
cp -r stages package/
cp -r utils package/ 2>/dev/null || true

# Create zip
cd package
zip -r ../deployment.zip . -q
cd ..

# Add Lambda handler at root
zip -g deployment.zip lambda_handler.py

echo "✅ Package created: deployment.zip"

# Check if Lambda function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo "📝 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip \
        --region $REGION
    
    # Update configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    
    # IAM role ARN for Lambda execution
    ROLE_ARN="arn:aws:iam::905418018179:role/clann-gaa-lambda-role-nov25"
    
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler lambda_handler.lambda_handler \
        --zip-file fileb://deployment.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --region $REGION \
        --environment "Variables={GEMINI_API_KEY=AIzaSyDjpe_vHrJmwc7P9-93Bg7ICFSw195CaP0,BACKEND_API_URL=https://api-gaa.clannai.com,LAMBDA_API_KEY=gaa-lambda-secret-key-2024}"
fi

# Add ffmpeg layer (you'll need to create this layer first)
# See: https://github.com/serverlesspub/ffmpeg-aws-lambda-layer
echo "⚠️  Don't forget to add ffmpeg layer to Lambda!"
echo "   Layer ARN: arn:aws:lambda:eu-west-1:YOUR_ACCOUNT:layer:ffmpeg:1"

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in Lambda console"
echo "2. Add ffmpeg layer"
echo "3. Test with a VEO URL"

