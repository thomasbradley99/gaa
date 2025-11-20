# Clubs Database Setup

This guide explains how to set up the clubs database table and import GAA club data.

## Steps

### 1. Run the Database Migration

First, run the migration to create the clubs table:

```sql
-- Run this SQL file
\i db/migrations/009_create_clubs_table.sql
```

Or using psql:
```bash
psql -U postgres -d gaa_app -f db/migrations/009_create_clubs_table.sql
```

### 2. Install csv-parser Dependency

The import script requires the `csv-parser` package:

```bash
cd backend
npm install csv-parser
```

### 3. Run the Import Script

The import script will:
- Load all clubs from `gaapitchfinder_data.json`
- Match them with VEO clubs from the CSV files
- Import everything into the database

```bash
cd backend
node import-clubs.js
```

**Note:** The script expects the CSV files to be at:
- `../../CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv`
- `../../CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_northern_ireland.csv`

If these paths are different, update them in `import-clubs.js`.

### 4. Verify the Import

Check that clubs were imported:

```sql
SELECT COUNT(*) FROM clubs;
SELECT COUNT(*) FROM clubs WHERE uses_veo = true;
```

You should see:
- ~1,680 total clubs
- ~10 clubs using VEO (based on the CSV files)

## Matching Logic

The script matches clubs by:
1. Normalizing club names (removing "GAA", "Club", etc.)
2. Exact match on normalized names
3. Partial match if one name contains the other

This handles variations like:
- "Dublin GAA" matches "Dublin"
- "Galway Hurling" matches "Galway"
- "Derrylauglan Kevin Barry's" matches "Derrylauglan"

## Troubleshooting

If clubs aren't matching:
1. Check the CSV files contain GAA clubs (filter for "GAA", "Hurling", "Camogie", "GAC")
2. Review the matching logic in `import-clubs.js`
3. Check the console output for match statistics

