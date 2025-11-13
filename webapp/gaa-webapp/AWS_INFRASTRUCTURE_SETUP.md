# 🏗️ GAA Webapp - AWS Infrastructure Setup

## 🎯 Overview

Clean, new AWS infrastructure for the GAA webapp. Separate from existing buckets to keep things organized.

---

## 📦 Required AWS Resources

### 1. S3 Buckets
- **Primary**: `clann-gaa-videos-nov25` - Video storage (VEO URLs + file uploads)
- **Optional**: `clann-gaa-clips-nov25` - Processed clips (if needed later)

### 2. Lambda Function (Optional - for future video processing)
- **Function**: `clann-gaa-video-processor-nov25`
- **Purpose**: Video analysis/transcoding (if needed)

### 3. IAM Roles & Policies
- **Role**: `clann-gaa-lambda-role-nov25` (for Lambda)
- **Policy**: S3 read/write permissions

### 4. Database
- **Option A**: Vercel Postgres (recommended - easier)
- **Option B**: AWS RDS PostgreSQL (if you want AWS-managed)

---

## 🪣 S3 Bucket Setup

### Primary Bucket: `clann-gaa-videos-nov25`

**Purpose:**
- Store uploaded video files (if users upload files directly)
- Store transcoded videos (if processing VEO URLs)
- Public read access for video playback

**Region:** `eu-west-1` (Ireland - closest to GAA users)

#### Step 1: Create Bucket

```bash
# Create bucket
aws s3 mb s3://clann-gaa-videos-nov25 --region eu-west-1

# Verify it exists
aws s3 ls s3://clann-gaa-videos-nov25 --region eu-west-1
```

#### Step 2: Configure CORS Policy

Create `cors-config.json`:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "AllowedOrigins": [
        "https://gaa.clannai.com",
        "https://*.vercel.app",
        "http://localhost:4012",
        "http://localhost:3013"
      ],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS:
```bash
aws s3api put-bucket-cors \
  --bucket clann-gaa-videos-nov25 \
  --cors-configuration file://cors-config.json \
  --region eu-west-1
```

#### Step 3: Configure Public Read Access (for video playback)

**Bucket Policy** (`bucket-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::clann-gaa-videos-nov25/*"
    }
  ]
}
```

Apply policy:
```bash
# Remove public access block (if exists)
aws s3api delete-public-access-block \
  --bucket clann-gaa-videos-nov25 \
  --region eu-west-1

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket clann-gaa-videos-nov25 \
  --policy file://bucket-policy.json \
  --region eu-west-1
```

#### Step 4: Enable Versioning (Optional - for safety)

```bash
aws s3api put-bucket-versioning \
  --bucket clann-gaa-videos-nov25 \
  --versioning-configuration Status=Enabled \
  --region eu-west-1
```

#### Step 5: Configure Lifecycle Rules (Optional - cost optimization)

Create `lifecycle-config.json`:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "Id": "TransitionToGlacier",
      "Status": "Enabled",
      "Prefix": "archived/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

Apply lifecycle:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket clann-gaa-videos-nov25 \
  --lifecycle-configuration file://lifecycle-config.json \
  --region eu-west-1
```

---

## 🔐 IAM Setup

### IAM Role for Lambda (if using Lambda)

**Role Name:** `clann-gaa-lambda-role-nov25`

#### Step 1: Create IAM Role

```bash
# Create trust policy (trust-policy.json)
cat > trust-policy.json << 'EOF'
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
EOF

# Create role
aws iam create-role \
  --role-name clann-gaa-lambda-role-nov25 \
  --assume-role-policy-document file://trust-policy.json \
  --region eu-west-1
```

#### Step 2: Attach Policies

```bash
# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name clann-gaa-lambda-role-nov25 \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom S3 access policy (s3-policy.json)
cat > s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::clann-gaa-videos-nov25/*",
        "arn:aws:s3:::clann-gaa-clips-nov25/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::clann-gaa-videos-nov25",
        "arn:aws:s3:::clann-gaa-clips-nov25"
      ]
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name clann-gaa-lambda-s3-access-nov25 \
  --policy-document file://s3-policy.json \
  --region eu-west-1

# Get policy ARN (replace ACCOUNT_ID with your AWS account ID)
POLICY_ARN="arn:aws:iam::905418018179:policy/clann-gaa-lambda-s3-access-nov25"

# Attach to role
aws iam attach-role-policy \
  --role-name clann-gaa-lambda-role-nov25 \
  --policy-arn $POLICY_ARN
```

---

## 🚀 Lambda Function Setup (Optional - for future video processing)

### Create Lambda Function

```bash
# Create deployment package directory
mkdir -p lambda/clann-gaa-video-processor-nov25
cd lambda/clann-gaa-video-processor-nov25

# Create basic handler (index.js)
cat > index.js << 'EOF'
exports.handler = async (event) => {
    console.log('Clann GAA Video Processor:', JSON.stringify(event, null, 2));
    
    // TODO: Implement video processing logic
    // - Download video from S3
    // - Process/transcode if needed
    // - Upload result back to S3
    // - Update database
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Processing started' })
    };
};
EOF

# Create deployment package
zip -r function.zip index.js

# Create Lambda function
aws lambda create-function \
  --function-name clann-gaa-video-processor-nov25 \
  --runtime nodejs20.x \
  --role arn:aws:iam::905418018179:role/clann-gaa-lambda-role-nov25 \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 900 \
  --memory-size 3008 \
  --ephemeral-storage Size=10240 \
  --region eu-west-1
```

**Note:** This is optional - only needed if you want to process videos server-side. For now, VEO URLs can be used directly.

---

## 💾 Database Options

### Option A: Vercel Postgres (Recommended)

**Pros:**
- Easy setup (built into Vercel)
- Free tier available
- Automatic backups
- No AWS RDS costs

**Setup:**
1. Go to Vercel Dashboard → Your Project → Storage
2. Create Postgres database
3. Get connection string
4. Use as `DATABASE_URL` in backend env vars

### Option B: AWS RDS PostgreSQL

**Pros:**
- Full control
- Can scale independently
- Better for high traffic

**Setup:**
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier gaa-webapp-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username gaaadmin \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --region eu-west-1 \
  --publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted

# Wait 5-10 minutes, then get endpoint
aws rds describe-db-instances \
  --db-instance-identifier gaa-webapp-db \
  --region eu-west-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

**Connection String:**
```
postgresql://gaaadmin:YourSecurePassword123!@gaa-webapp-db.xxxxx.eu-west-1.rds.amazonaws.com:5432/gaa_app
```

---

## 🔑 IAM User for Backend (Vercel)

### Create IAM User for Backend Access

```bash
# Create IAM user
aws iam create-user --user-name clann-gaa-backend-nov25

# Create access key
aws iam create-access-key --user-name clann-gaa-backend-nov25

# Save the AccessKeyId and SecretAccessKey - you'll need these!
```

### Attach S3 Policy to User

```bash
# Create policy (backend-s3-policy.json)
cat > backend-s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::clann-gaa-videos-nov25/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::clann-gaa-videos-nov25"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name clann-gaa-backend-s3-access-nov25 \
  --policy-document file://backend-s3-policy.json

# Get policy ARN
POLICY_ARN="arn:aws:iam::905418018179:policy/clann-gaa-backend-s3-access-nov25"

# Attach to user
aws iam attach-user-policy \
  --user-name clann-gaa-backend-nov25 \
  --policy-arn $POLICY_ARN
```

---

## 📋 Environment Variables Summary

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/gaa_app
# OR (if using Vercel Postgres)
DATABASE_URL=postgres://default:password@host.vercel-storage.com:5432/verceldb

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d

# AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA... (from IAM user)
AWS_SECRET_ACCESS_KEY=... (from IAM user)
AWS_BUCKET_NAME=clann-gaa-videos-nov25

# AWS Lambda (optional - if using)
AWS_LAMBDA_FUNCTION_NAME=clann-gaa-video-processor-nov25

# Environment
NODE_ENV=production
VERCEL=1
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=https://gaa-backend.vercel.app
```

---

## 🗂️ S3 Folder Structure

### Proposed Structure

```
clann-gaa-videos-nov25/
├── videos/                    # Direct file uploads
│   └── {userId}/
│       └── {gameId}/
│           └── {filename}.mp4
│
├── veo/                       # VEO URL videos (if downloaded/processed)
│   └── {gameId}/
│       └── video.mp4
│
├── thumbnails/                # Video thumbnails
│   └── {gameId}/
│       └── thumbnail.jpg
│
└── transcoded/                # Transcoded videos (if processing)
    └── {gameId}/
        └── video.mp4
```

**Note:** Since VEO URLs are primary, most games will just have `video_url` pointing to VEO, not stored in S3. S3 is mainly for:
- Direct file uploads (secondary method)
- Thumbnails
- Processed/transcoded videos (if needed)

---

## ✅ Setup Checklist

### S3 Bucket
- [ ] Create `clann-gaa-videos-nov25` bucket
- [ ] Configure CORS policy
- [ ] Configure public read access (bucket policy)
- [ ] Enable versioning (optional)
- [ ] Configure lifecycle rules (optional)

### IAM
- [ ] Create IAM user `clann-gaa-backend-nov25`
- [ ] Create access keys
- [ ] Attach S3 access policy
- [ ] Create Lambda execution role `clann-gaa-lambda-role-nov25` (if using Lambda)
- [ ] Attach Lambda policies

### Lambda (Optional)
- [ ] Create Lambda function `clann-gaa-video-processor-nov25`
- [ ] Configure timeout (15 min)
- [ ] Configure memory (3GB)
- [ ] Add environment variables

### Database
- [ ] Choose: Vercel Postgres OR AWS RDS
- [ ] Create database
- [ ] Run schema migration
- [ ] Test connection

### Environment Variables
- [ ] Set backend env vars in Vercel
- [ ] Set frontend env vars in Vercel
- [ ] Test API endpoints

---

## 🧪 Testing AWS Setup

### Test S3 Access

```bash
# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://clann-gaa-videos-nov25/test/test.txt --region eu-west-1

# Test public read
curl https://clann-gaa-videos-nov25.s3.eu-west-1.amazonaws.com/test/test.txt

# Cleanup
aws s3 rm s3://clann-gaa-videos-nov25/test/test.txt --region eu-west-1
rm test.txt
```

### Test Lambda (if created)

```bash
# Invoke Lambda
aws lambda invoke \
  --function-name clann-gaa-video-processor-nov25 \
  --payload '{"test": "data"}' \
  --region eu-west-1 \
  response.json

cat response.json
rm response.json
```

---

## 💰 Cost Estimation

### S3 Storage
- **Storage**: ~$0.023/GB/month (eu-west-1)
- **Requests**: ~$0.0004 per 1,000 GET requests
- **Example**: 100GB videos = ~$2.30/month

### Lambda (if used)
- **Requests**: First 1M free, then $0.20 per 1M
- **Compute**: $0.0000166667 per GB-second
- **Example**: 1000 videos/month @ 5min each = ~$0.50/month

### RDS (if used instead of Vercel Postgres)
- **db.t3.micro**: ~$15/month
- **Storage**: $0.115/GB/month
- **Example**: 20GB = ~$17.30/month

**Recommendation:** Use Vercel Postgres (free tier) to save costs.

---

## 🚀 Quick Setup Script

Save as `setup-aws-infrastructure.sh`:

```bash
#!/bin/bash

# GAA Webapp AWS Infrastructure Setup
# Run this script to set up all AWS resources

set -e

REGION="eu-west-1"
BUCKET_NAME="clann-gaa-videos-nov25"
LAMBDA_ROLE="clann-gaa-lambda-role-nov25"
IAM_USER="clann-gaa-backend-nov25"

echo "🏗️  Setting up GAA Webapp AWS Infrastructure..."

# 1. Create S3 bucket
echo "📦 Creating S3 bucket..."
aws s3 mb s3://$BUCKET_NAME --region $REGION || echo "Bucket may already exist"

# 2. Configure CORS
echo "🔧 Configuring CORS..."
cat > cors-config.json << 'EOF'
{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "https://gaa.clannai.com",
      "https://*.vercel.app",
      "http://localhost:4012",
      "http://localhost:3013"
    ],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3000
  }]
}
EOF
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json --region $REGION
rm cors-config.json

# 3. Configure public read access
echo "🔓 Configuring public read access..."
aws s3api delete-public-access-block --bucket $BUCKET_NAME --region $REGION || true
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }]
}
EOF
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json --region $REGION
rm bucket-policy.json

# 4. Create IAM user
echo "👤 Creating IAM user..."
aws iam create-user --user-name $IAM_USER || echo "User may already exist"

# 5. Create and attach S3 policy
echo "🔐 Creating S3 access policy..."
cat > backend-s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:PutObjectAcl"],
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }, {
    "Effect": "Allow",
    "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
    "Resource": "arn:aws:s3:::$BUCKET_NAME"
  }]
}
EOF
POLICY_ARN=$(aws iam create-policy --policy-name clann-gaa-backend-s3-access-nov25 --policy-document file://backend-s3-policy.json --query 'Policy.Arn' --output text 2>/dev/null || aws iam list-policies --query "Policies[?PolicyName=='clann-gaa-backend-s3-access-nov25'].Arn" --output text)
aws iam attach-user-policy --user-name $IAM_USER --policy-arn $POLICY_ARN || echo "Policy may already be attached"
rm backend-s3-policy.json

# 6. Create access key
echo "🔑 Creating access key..."
ACCESS_KEY=$(aws iam create-access-key --user-name $IAM_USER --query 'AccessKey.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey}' --output json)

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Save these credentials securely:"
echo "$ACCESS_KEY"
echo ""
echo "2. Add to Vercel environment variables:"
echo "   AWS_REGION=$REGION"
echo "   AWS_BUCKET_NAME=$BUCKET_NAME"
echo "   AWS_ACCESS_KEY_ID=<from above>"
echo "   AWS_SECRET_ACCESS_KEY=<from above>"
echo ""
echo "3. Test S3 access:"
echo "   aws s3 ls s3://$BUCKET_NAME --region $REGION"
```

Make executable and run:
```bash
chmod +x setup-aws-infrastructure.sh
./setup-aws-infrastructure.sh
```

---

## 📝 Summary

**Required AWS Resources:**
1. ✅ **S3 Bucket**: `clann-gaa-videos-nov25` (eu-west-1)
2. ✅ **IAM User**: `clann-gaa-backend-nov25` (for backend access)
3. ✅ **IAM Policies**: S3 read/write access

**Optional Resources:**
- Lambda function: `clann-gaa-video-processor-nov25` (if processing videos server-side)
- RDS database (or use Vercel Postgres)

**Total Setup Time:** ~15 minutes

**Monthly Cost:** ~$2-5 (mostly S3 storage, minimal if using Vercel Postgres)

---

**Ready to deploy!** 🚀

