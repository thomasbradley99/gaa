#!/bin/bash
# Docker Container Lambda Deployment Script
# Deploys gaa-ai-analyzer Lambda function as container image

set -e  # Exit on error

echo "🐳 GAA AI Analyzer - Docker Container Deployment"
echo "=================================================="
echo ""

# Configuration
FUNCTION_NAME="gaa-ai-analyzer-nov25"
REGION="eu-west-1"
AWS_ACCOUNT_ID="905418018179"
ECR_REPOSITORY="${FUNCTION_NAME}"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Environment variables (from .env file or passed in)
# GEMINI_API_KEY must be set as environment variable - never hardcode!
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ ERROR: GEMINI_API_KEY environment variable is required"
    echo "   Set it with: export GEMINI_API_KEY=your_key_here"
    exit 1
fi
BACKEND_API_URL="${BACKEND_API_URL:-https://api-gaa.clannai.com}"
LAMBDA_API_KEY="${LAMBDA_API_KEY:-gaa-lambda-secret-key-2024}"
DATABASE_URL="${DATABASE_URL:-postgresql://gaaadmin:YourSecurePassword123!@clann-gaa-db-nov25.cfcgo2cma4or.eu-west-1.rds.amazonaws.com:5432/gaa_app}"
AWS_BUCKET_NAME="${AWS_BUCKET_NAME:-clann-gaa-videos-nov25}"

echo "✅ Environment configured"
echo ""

# Check Docker is running
echo "🔍 Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "⚠️  WARNING: Docker may not be fully ready"
    echo "   Trying anyway..."
fi
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo "📦 Step 1: Checking ECR repository..."
if aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${REGION} > /dev/null 2>&1; then
    echo "✅ ECR repository exists: ${ECR_REPOSITORY}"
else
    echo "📦 Creating ECR repository: ${ECR_REPOSITORY}"
    aws ecr create-repository \
        --repository-name ${ECR_REPOSITORY} \
        --region ${REGION} \
        --image-scanning-configuration scanOnPush=true
    echo "✅ ECR repository created"
fi
echo ""

# Step 2: Build Docker image for x86_64 (Lambda architecture)
echo "🔨 Step 2: Building Docker image for x86_64..."
# Build ONLY for linux/amd64, disable provenance/attestation (single image, no manifest list)
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --sbom=false \
  --load \
  -t ${ECR_REPOSITORY}:latest .
echo "✅ Docker image built"
echo ""

# Step 3: Login to ECR
echo "🔐 Step 3: Authenticating with ECR..."
aws ecr get-login-password --region ${REGION} | \
    docker login --username AWS --password-stdin ${ECR_URI}
echo "✅ Authenticated with ECR"
echo ""

# Step 4: Tag image for ECR
echo "🏷️  Step 4: Tagging Docker image..."
docker tag ${ECR_REPOSITORY}:latest ${ECR_URI}:latest
echo "✅ Image tagged"
echo ""

# Step 5: Push to ECR
echo "📤 Step 5: Pushing image to ECR..."
docker push ${ECR_URI}:latest
echo "✅ Image pushed to ECR"
echo ""

# Step 6: Check if Lambda function exists
echo "⚙️  Step 6: Checking Lambda function..."
if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} > /dev/null 2>&1; then
    echo "♻️  Function exists, updating code..."
    
    # Update existing function to use container image
    aws lambda update-function-code \
        --function-name ${FUNCTION_NAME} \
        --image-uri ${ECR_URI}:latest \
        --region ${REGION}
    
    echo "✅ Lambda function code updated"
    
    # Wait for code update to complete before updating configuration
    echo "⏳ Waiting for code update to complete..."
    aws lambda wait function-updated \
        --function-name ${FUNCTION_NAME} \
        --region ${REGION}
    echo "✅ Code update complete"
else
    echo "📦 Creating new Lambda function..."
    
    # Use existing IAM role
    ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/clann-gaa-lambda-role-nov25"
    
    # Create Lambda function with container image
    aws lambda create-function \
        --function-name ${FUNCTION_NAME} \
        --package-type Image \
        --code ImageUri=${ECR_URI}:latest \
        --role ${ROLE_ARN} \
        --timeout 900 \
        --memory-size 3008 \
        --ephemeral-storage Size=10240 \
        --region ${REGION}
    
    echo "✅ Lambda function created"
fi
echo ""

# Step 7: Update Lambda configuration
echo "⚙️  Step 7: Updating Lambda configuration..."

aws lambda update-function-configuration \
    --function-name ${FUNCTION_NAME} \
    --timeout 900 \
    --memory-size 3008 \
    --environment "Variables={
        GEMINI_API_KEY=${GEMINI_API_KEY},
        BACKEND_API_URL=${BACKEND_API_URL},
        LAMBDA_API_KEY=${LAMBDA_API_KEY},
        DATABASE_URL=${DATABASE_URL},
        AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
    }" \
    --region ${REGION} > /dev/null

echo "✅ Lambda configuration updated"
echo ""

# Step 8: Wait for function to be ready
echo "⏳ Step 8: Waiting for Lambda function to be ready..."
aws lambda wait function-updated \
    --function-name ${FUNCTION_NAME} \
    --region ${REGION}
echo "✅ Lambda function is ready"
echo ""

# Success!
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Function Details:"
echo "  Name: ${FUNCTION_NAME}"
echo "  Region: ${REGION}"
echo "  Image: ${ECR_URI}:latest"
echo "  Memory: 3008 MB"
echo "  Timeout: 900 seconds (15 minutes)"
echo ""
echo "✅ Lambda now has ffmpeg and can process GAA videos!"
echo ""
echo "🧪 Test with:"
echo "  aws lambda invoke --function-name ${FUNCTION_NAME} --region ${REGION} output.json"
echo ""

