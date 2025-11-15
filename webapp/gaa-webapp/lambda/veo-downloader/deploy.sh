#!/bin/bash
# GAA VEO Downloader Lambda - Deployment Script
# Deploys the GAA VEO downloader Lambda function to AWS

set -e

echo "🚀 GAA VEO Downloader Lambda - Deployment"
echo "=========================================="
echo ""

# Configuration
FUNCTION_NAME="gaa-veo-downloader-nov25"
REGION="eu-west-1"
ROLE_ARN="arn:aws:iam::905418018179:role/clann-gaa-lambda-role-nov25"  # Update this with your IAM role ARN
BUCKET_NAME="clann-gaa-videos-nov25"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    echo ""
    echo "Please set your database URL:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:5432/database'"
    echo ""
    echo "Options:"
    echo "  1. Local: postgresql://$(whoami)@localhost:5432/gaa_app"
    echo "  2. RDS: Get from AWS Console"
    exit 1
fi

echo "✅ DATABASE_URL: ${DATABASE_URL:0:30}..."
echo ""

# Step 1: Check S3 bucket
echo "📦 Step 1: Checking S3 bucket..."
if aws s3 ls "s3://$BUCKET_NAME" --region $REGION &>/dev/null; then
    echo "✅ Bucket exists: $BUCKET_NAME"
else
    echo "⚠️  Bucket doesn't exist. Creating..."
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
    echo "✅ Bucket created"
fi
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing Python dependencies..."
rm -rf package lambda.zip 2>/dev/null || true

# Install dependencies with platform-specific binaries for Lambda
pip3 install -r requirements.txt -t ./package \
    --platform manylinux2014_x86_64 \
    --only-binary=:all: \
    --quiet

echo "✅ Dependencies installed"
echo ""

# Step 3: Create deployment package
echo "📦 Step 3: Creating deployment package..."
cd package
zip -r9 ../lambda.zip . -q
cd ..
zip -g lambda.zip lambda_handler.py -q

FILE_SIZE=$(du -h lambda.zip | cut -f1)
echo "✅ Package created: lambda.zip ($FILE_SIZE)"
echo ""

# Step 4: Deploy Lambda
echo "☁️  Step 4: Deploying to AWS Lambda..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "📝 Function exists, updating code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda.zip \
        --region $REGION \
        --output text \
        --query 'FunctionArn'
    
    echo "⚙️  Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout 900 \
        --memory-size 512 \
        --region $REGION \
        --output text \
        --query 'FunctionName' \
        >/dev/null
else
    echo "🆕 Creating new function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime python3.11 \
        --role $ROLE_ARN \
        --handler lambda_handler.lambda_handler \
        --zip-file fileb://lambda.zip \
        --timeout 900 \
        --memory-size 512 \
        --region $REGION \
        --output text \
        --query 'FunctionArn'
    
    echo "⏳ Waiting for Lambda function to be ready..."
    # Wait for function to be active (max 30 seconds)
    for i in {1..30}; do
        STATUS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.State' --output text 2>/dev/null || echo "Pending")
        if [ "$STATUS" = "Active" ]; then
            echo "✅ Function is ready"
            break
        fi
        sleep 1
    done
fi

echo "✅ Lambda deployed"
echo ""

# Step 5: Set environment variables
echo "⚙️  Step 5: Setting environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{
        BUCKET_NAME=$BUCKET_NAME,
        DATABASE_URL=$DATABASE_URL,
        AWS_REGION=$REGION
    }" \
    --region $REGION \
    --output text \
    --query 'FunctionName' \
    >/dev/null

echo "✅ Environment variables set"
echo ""

# Cleanup
rm -rf package lambda.zip

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Function Details:"
echo "  Name: $FUNCTION_NAME"
echo "  Region: $REGION"
echo "  Timeout: 15 minutes (900 seconds)"
echo "  Memory: 512 MB"
echo ""
echo "🧪 Test it:"
echo "  aws lambda invoke \\"
echo "    --function-name $FUNCTION_NAME \\"
echo "    --payload '{\"game_id\":\"test-id\",\"video_url\":\"https://veo.co/test\"}' \\"
echo "    --region $REGION \\"
echo "    output.json"
echo ""
echo "🌐 View in AWS Console:"
echo "  https://console.aws.amazon.com/lambda/home?region=$REGION#/functions/$FUNCTION_NAME"
echo ""
echo "📝 Next Steps:"
echo "  1. Verify IAM role has S3 PutObject permission"
echo "  2. Verify IAM role has RDS access (if database is in VPC)"
echo "  3. Test with a real VEO URL from backend"
echo ""

