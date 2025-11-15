#!/bin/bash

# GAA Webapp - AWS RDS Setup Script
# This creates an RDS PostgreSQL instance for both local dev and production

set -e

# Configuration
DB_INSTANCE_ID="clann-gaa-db-nov25"
DB_NAME="gaa_app"
DB_USERNAME="gaaadmin"
DB_PASSWORD="${RDS_PASSWORD:-YourSecurePassword123!}"  # Set RDS_PASSWORD env var or change default
REGION="eu-west-1"

echo "🚀 Setting up AWS RDS PostgreSQL for GAA Webapp"
echo "================================================"
echo ""
echo "Instance ID: $DB_INSTANCE_ID"
echo "Database: $DB_NAME"
echo "Username: $DB_USERNAME"
echo "Region: $REGION"
echo ""

# Check if instance already exists
EXISTS=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_ID \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text \
  --region $REGION 2>/dev/null || echo "none")

if [ "$EXISTS" != "none" ] && [ "$EXISTS" != "None" ]; then
  echo "⚠️  RDS instance already exists with status: $EXISTS"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 1: Create RDS instance
echo "📦 Step 1: Creating RDS PostgreSQL instance..."
echo "   This will take 5-10 minutes..."

aws rds create-db-instance \
  --db-instance-identifier $DB_INSTANCE_ID \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.15 \
  --master-username $DB_USERNAME \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp2 \
  --backup-retention-period 7 \
  --publicly-accessible \
  --region $REGION > /dev/null

echo "✅ RDS instance creation started"
echo "   Waiting for instance to be available..."

# Wait for instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier $DB_INSTANCE_ID \
  --region $REGION

echo "✅ RDS instance is available!"

# Get endpoint
ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_ID \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region $REGION)

echo ""
echo "📡 RDS Endpoint: $ENDPOINT"
echo ""

# Step 2: Configure Security Group
echo "🔒 Step 2: Configuring security group..."

# Get security group ID
SG_ID=$(aws rds describe-db-instances \
  --db-instance-identifier $DB_INSTANCE_ID \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text \
  --region $REGION)

echo "   Security Group ID: $SG_ID"

# Get current IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "   Your IP: $MY_IP"

# Add rule for your IP (if not already exists)
echo "   Adding rule for your IP..."
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region $REGION 2>/dev/null || echo "   Rule already exists or error (may need manual setup)"

# Add rule for all IPs (for testing - remove in production!)
echo "   ⚠️  Adding rule for all IPs (0.0.0.0/0) - REMOVE THIS IN PRODUCTION!"
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "   Rule already exists"

echo "✅ Security group configured"
echo ""

# Step 3: Create database and run schema
echo "🗄️  Step 3: Creating database and running schema..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found. Install PostgreSQL client to run schema."
  echo "   On macOS: brew install postgresql"
  echo ""
  echo "   Then run manually:"
  echo "   psql \"postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/postgres\" -c \"CREATE DATABASE $DB_NAME;\""
  echo "   psql \"postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME\" -f db/schema.sql"
  echo "   psql \"postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME\" -f db/migrations/001_add_video_fields.sql"
else
  # Create database
  echo "   Creating database '$DB_NAME'..."
  psql "postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/postgres" \
    -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   Database may already exist"

  # Run schema
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "   Running schema.sql..."
  psql "postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME" \
    -f "$SCRIPT_DIR/db/schema.sql"

  # Run migration
  echo "   Running migration..."
  psql "postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME" \
    -f "$SCRIPT_DIR/db/migrations/001_add_video_fields.sql"

  echo "✅ Database schema created!"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Update backend/.env with:"
echo "   DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME"
echo ""
echo "2. Update Vercel environment variables with same DATABASE_URL"
echo ""
echo "3. Restart your backend server"
echo ""
echo "4. Test connection:"
echo "   psql \"postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:5432/$DB_NAME\" -c \"SELECT version();\""
echo ""

