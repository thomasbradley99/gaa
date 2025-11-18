#!/bin/bash
# Deploy GAA AI Analyzer Lambda (S3 Version)
# Analyzes videos already in S3

set -e

echo "🚀 Deploying GAA AI Analyzer Lambda (S3 Version)"
echo ""

# Configuration
FUNCTION_NAME="gaa-ai-analyzer-nov25"
RUNTIME="python3.11"
HANDLER="lambda_handler_s3.lambda_handler"
ROLE_ARN="arn:aws:iam::905418018179:role/clann-gaa-lambda-role-nov25"
REGION="eu-west-1"
TIMEOUT=900  # 15 minutes
MEMORY_SIZE=3008  # 3GB (max allowed)
EPHEMERAL_STORAGE=10240  # 10GB /tmp storage

# Environment variables
GEMINI_API_KEY="${GEMINI_API_KEY}"
DATABASE_URL="${DATABASE_URL}"
BUCKET_NAME="${AWS_BUCKET_NAME:-clann-gaa-videos-nov25}"
BACKEND_API_URL="${BACKEND_API_URL:-https://api-gaa.clannai.com}"
LAMBDA_API_KEY="${LAMBDA_API_KEY:-gaa-lambda-secret-key-change-in-production}"

# Check required env vars
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY environment variable not set"
    echo "   Export it before running: export GEMINI_API_KEY='your-key-here'"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    echo "   Export it before running: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "📋 Configuration:"
echo "   Function Name: $FUNCTION_NAME"
echo "   Runtime: $RUNTIME"
echo "   Handler: $HANDLER"
echo "   Region: $REGION"
echo "   Memory: ${MEMORY_SIZE}MB"
echo "   Ephemeral Storage (/tmp): ${EPHEMERAL_STORAGE}MB (10GB)"
echo "   Timeout: ${TIMEOUT}s"
echo "   Database: ${DATABASE_URL%%@*}@***"  # Mask password
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt -t ./package \
    --platform manylinux2014_x86_64 \
    --only-binary=:all: \
    --upgrade

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
cd package
zip -r9 ../deployment.zip .
cd ..

# Add Lambda handler and stages
zip -g deployment.zip lambda_handler_s3.py utils.py
zip -g deployment.zip -r stages/

echo "✅ Deployment package created: deployment.zip"
echo ""

# Step 3: Check if function exists
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "✅ Function exists - updating code..."
    
    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip \
        --region $REGION
    
    echo "✅ Code updated"
    
    # Update configuration
    echo "🔧 Updating configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --ephemeral-storage Size=$EPHEMERAL_STORAGE \
        --environment Variables="{
            GEMINI_API_KEY=$GEMINI_API_KEY,
            DATABASE_URL=$DATABASE_URL,
            AWS_BUCKET_NAME=$BUCKET_NAME,
            BACKEND_API_URL=$BACKEND_API_URL,
            LAMBDA_API_KEY=$LAMBDA_API_KEY
        }" \
        --region $REGION
    
    echo "✅ Configuration updated"
    
else
    echo "❌ Function doesn't exist - creating new function..."
    
    # Create new function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://deployment.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --ephemeral-storage Size=$EPHEMERAL_STORAGE \
        --environment Variables="{
            GEMINI_API_KEY=$GEMINI_API_KEY,
            DATABASE_URL=$DATABASE_URL,
            AWS_BUCKET_NAME=$BUCKET_NAME,
            BACKEND_API_URL=$BACKEND_API_URL,
            LAMBDA_API_KEY=$LAMBDA_API_KEY
        }" \
        --region $REGION
    
    echo "✅ Function created"
fi

# Step 4: Cleanup
echo "🧹 Cleaning up..."
rm -rf package deployment.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the function with a sample event"
echo "   2. Update Lambda 1 (veo-downloader) to trigger this function"
echo "   3. Monitor CloudWatch logs: /aws/lambda/$FUNCTION_NAME"
echo ""
echo "🧪 Test command:"
echo "   aws lambda invoke \\"
echo "     --function-name $FUNCTION_NAME \\"
echo "     --payload '{\"game_id\":\"test-123\",\"s3_key\":\"videos/test-123/video.mp4\"}' \\"
echo "     --region $REGION \\"
echo "     response.json"
echo ""

