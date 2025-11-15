# 🔧 Quick Fix for 500 Error

## The Problem
The 500 error on `/api/auth/register` is likely because:
1. **Database doesn't exist** - PostgreSQL database `gaa_app` hasn't been created
2. **Schema not run** - Tables don't exist yet

## Quick Fix

### Option 1: If PostgreSQL is installed locally

```bash
# 1. Create database
createdb gaa_app

# 2. Run schema
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp
psql -d gaa_app -f db/schema.sql

# 3. Run migration
psql -d gaa_app -f db/migrations/001_add_video_fields.sql
```

### Option 2: Check Backend Terminal

Look at your **backend terminal** (Terminal 1) - it should show the actual error:

```
Registration error: Error: connect ECONNREFUSED 127.0.0.1:5432
```

or

```
Database query error: relation "users" does not exist
```

### Option 3: Use Docker (if PostgreSQL not installed)

```bash
# Start PostgreSQL in Docker
docker run --name gaa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gaa_app \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds, then run schema
psql -h localhost -U postgres -d gaa_app -f db/schema.sql
# Password: password
```

## Check Backend Logs

**Look at your backend terminal** - it will show the exact error. Common errors:

1. **`ECONNREFUSED`** → PostgreSQL not running
2. **`relation "users" does not exist`** → Schema not run
3. **`database "gaa_app" does not exist`** → Database not created

## After Fixing

1. Restart backend server (Ctrl+C, then `npm run dev`)
2. Try signup again
3. Should work! ✅

---

**Most likely:** You need to run `psql -d gaa_app -f db/schema.sql` to create the tables.

