# GAA VEO Downloader Lambda - Deployment Guide

## 🎯 What the Deployment Script Does

The `deploy.sh` script automates the entire Lambda deployment process:

### Step 1: Check S3 Bucket
- Verifies `clann-gaa-videos-nov25` bucket exists
- Creates it if it doesn't exist

### Step 2: Install Dependencies
- Installs Python packages from `requirements.txt`
- Uses `manylinux2014_x86_64` platform for Lambda compatibility
- Installs to `./package` directory

### Step 3: Create Deployment Package
- Zips all dependencies into `lambda.zip`
- Adds `lambda_handler.py` to the zip
- Creates a deployment-ready package

### Step 4: Deploy to AWS Lambda
- **If function exists:** Updates code and configuration
- **If function doesn't exist:** Creates new Lambda function
- Sets timeout: 15 minutes (900 seconds)
- Sets memory: 512 MB

### Step 5: Set Environment Variables
- `BUCKET_NAME` = clann-gaa-videos-nov25
- `DATABASE_URL` = Your database connection string
- `AWS_REGION` = eu-west-1

### Step 6: Cleanup
- Removes temporary `package` directory
- Removes `lambda.zip` file

---

## 🚀 Quick Deploy

```bash
cd lambda/veo-downloader

# Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/gaa_app"

# Run deployment script
./deploy.sh
```

---

## 📋 Prerequisites

### 1. AWS CLI Configured
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region (eu-west-1)
```

### 2. IAM Role Created
Create IAM role: `clann-gaa-lambda-role-nov25`

**Required Permissions:**
- S3: `PutObject` on `clann-gaa-videos-nov25` bucket
- RDS: Connect to database (if database is in VPC)
- CloudWatch: Write logs

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 3. Environment Variables
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/gaa_app"
```

---

## 🔧 Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Install Dependencies
```bash
cd lambda/veo-downloader
pip3 install -r requirements.txt -t ./package \
    --platform manylinux2014_x86_64 \
    --only-binary=:all:
```

### 2. Create Zip Package
```bash
cd package
zip -r9 ../lambda.zip .
cd ..
zip -g lambda.zip lambda_handler.py
```

### 3. Deploy via AWS CLI
```bash
# Create function (first time)
aws lambda create-function \
  --function-name gaa-veo-downloader-nov25 \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/clann-gaa-lambda-role-nov25 \
  --handler lambda_handler.lambda_handler \
  --zip-file fileb://lambda.zip \
  --timeout 900 \
  --memory-size 512 \
  --region eu-west-1

# Update function (subsequent deployments)
aws lambda update-function-code \
  --function-name gaa-veo-downloader-nov25 \
  --zip-file fileb://lambda.zip \
  --region eu-west-1
```

### 4. Set Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name gaa-veo-downloader-nov25 \
  --environment Variables="{
    BUCKET_NAME=clann-gaa-videos-nov25,
    DATABASE_URL=postgresql://user:pass@host:5432/gaa_app,
    AWS_REGION=eu-west-1
  }" \
  --region eu-west-1
```

---

## 🧪 Testing After Deployment

### Test with AWS CLI
```bash
aws lambda invoke \
  --function-name gaa-veo-downloader-nov25 \
  --payload '{
    "game_id": "test-game-id",
    "video_url": "https://veo.co/teams/123/matches/456"
  }' \
  --region eu-west-1 \
  output.json

cat output.json
```

### Test from Backend
1. Submit VEO URL via webapp
2. Check CloudWatch logs: `/aws/lambda/gaa-veo-downloader-nov25`
3. Check database: `s3_key` should be set after successful download

---

## 🐛 Troubleshooting

**Deployment fails:**
- Check AWS credentials: `aws sts get-caller-identity`
- Check IAM role exists and has correct permissions
- Check S3 bucket exists and is accessible

**Lambda fails to run:**
- Check CloudWatch logs for errors
- Verify environment variables are set correctly
- Check IAM role has S3 and RDS permissions

**Database connection fails:**
- Verify `DATABASE_URL` is correct
- If database is in VPC, Lambda needs VPC configuration
- Check security groups allow Lambda to connect

---

## 📝 Configuration Updates

To update configuration after deployment:

```bash
# Update timeout
aws lambda update-function-configuration \
  --function-name gaa-veo-downloader-nov25 \
  --timeout 900 \
  --region eu-west-1

# Update memory
aws lambda update-function-configuration \
  --function-name gaa-veo-downloader-nov25 \
  --memory-size 1024 \
  --region eu-west-1
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Lambda function exists in AWS Console
- [ ] Environment variables are set correctly
- [ ] IAM role has S3 PutObject permission
- [ ] IAM role has RDS access (if needed)
- [ ] Test invocation works
- [ ] CloudWatch logs are being written
- [ ] Backend can trigger Lambda successfully

---

**Last Updated:** 2025-01-13  
**GAA Webapp - Lambda Deployment**

