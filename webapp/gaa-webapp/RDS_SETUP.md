# 🗄️ AWS RDS Setup Guide

## Quick Setup

We're using **AWS RDS PostgreSQL** for both local development and production - same database, same connection.

### Option 1: Automated Setup (Recommended)

```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp

# Set password (optional, defaults to YourSecurePassword123!)
export RDS_PASSWORD="YourSecurePassword123!"

# Run setup script
./setup-rds.sh
```

The script will:
1. ✅ Create RDS PostgreSQL instance (`clann-gaa-db-nov25`)
2. ✅ Configure security group (allows your IP + all IPs for testing)
3. ✅ Create database (`gaa_app`)
4. ✅ Run schema and migrations
5. ✅ Give you connection string

### Option 2: Manual Setup

See `AWS_INFRASTRUCTURE_SETUP.md` for step-by-step manual instructions.

---

## After Setup

### 1. Update Backend `.env`

```env
DATABASE_URL=postgresql://gaaadmin:YourSecurePassword123!@clann-gaa-db-nov25.xxxxx.eu-west-1.rds.amazonaws.com:5432/gaa_app
```

### 2. Update Vercel Environment Variables

When deploying, add the same `DATABASE_URL` to Vercel:
- Go to Vercel project → Settings → Environment Variables
- Add `DATABASE_URL` with the same value

### 3. Restart Backend

```bash
# Stop backend (Ctrl+C)
# Start again
cd backend && npm run dev
```

### 4. Test Connection

```bash
# Test from command line
psql "postgresql://gaaadmin:YourSecurePassword123!@ENDPOINT:5432/gaa_app" -c "SELECT version();"

# Or test via backend
curl http://localhost:4011/health
```

---

## Security Notes

⚠️ **The setup script allows all IPs (0.0.0.0/0) for testing.**

**For production:**
1. Remove the 0.0.0.0/0 rule from security group
2. Add specific IPs:
   - Your development IP
   - Vercel IPs (or use VPC peering)

**To restrict access:**
```bash
# Remove all IPs rule
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --region eu-west-1

# Add only your IP
MY_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32 \
  --region eu-west-1
```

---

## Cost

- **db.t3.micro**: ~$15/month (free tier eligible for first year)
- **Storage (20GB)**: ~$2.30/month
- **Total**: ~$17/month (or **FREE** for first year with AWS Free Tier)

---

## Troubleshooting

### Can't connect from local machine
- Check security group allows your IP
- Check RDS is publicly accessible
- Check password is correct

### Can't connect from Vercel
- Add Vercel IPs to security group
- Or use VPC peering (advanced)

### Database doesn't exist
- Run: `psql "postgresql://..." -c "CREATE DATABASE gaa_app;"`
- Then run schema: `psql "postgresql://..." -f db/schema.sql`

---

## Cleanup

```bash
# Delete RDS instance (careful - deletes everything!)
aws rds delete-db-instance \
  --db-instance-identifier clann-gaa-db-nov25 \
  --skip-final-snapshot \
  --region eu-west-1
```

