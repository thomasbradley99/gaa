# Fix 500 Error - Team Colors

## The Problem
You're getting this error:
```
PATCH http://localhost:4011/api/teams/.../colors 500 (Internal Server Error)
```

**Cause:** The database columns `primary_color` and `secondary_color` don't exist yet. You need to run the migration.

## Quick Fix (30 seconds)

### Option 1: Using the migration script
```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp
./run-migration.sh
```

### Option 2: Direct SQL (if you know your database connection)
```bash
# Replace with your actual database connection details
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE -f db/migrations/004_add_team_colors.sql
```

### Option 3: Using your existing backend setup
If you have a backend database connection set up:

```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp/backend
node -e "
const { query } = require('./utils/database');
const fs = require('fs');
const sql = fs.readFileSync('../db/migrations/004_add_team_colors.sql', 'utf8');
query(sql).then(() => {
  console.log('✅ Migration successful!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
"
```

## After Running Migration

1. **Restart backend:**
```bash
cd backend
npm start  # or however you start it
```

2. **Refresh frontend** (Ctrl+R in browser)

3. **Try again** - Click on "Team Kit Colors" dropdown and save

## What the Migration Does

Adds three new columns to your `teams` table:
- `primary_color` (e.g., `#016F32` for green)
- `secondary_color` (e.g., `#FFD700` for gold)
- `accent_color` (optional)

## Still Getting Errors?

Check backend logs for the actual error. Common issues:
- Database not running
- Wrong database credentials in `.env`
- Migration already partially ran (run it again, it's safe)

## UI Changes

The color picker is now a **collapsible dropdown**:
- Collapsed: Shows current colors (e.g., `#016F32 • #FFD700`)
- Expanded: Shows full color picker with presets
- Click header to expand/collapse

