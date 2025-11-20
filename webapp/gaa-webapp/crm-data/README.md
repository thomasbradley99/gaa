# CRM Data for GAA Clubs

This directory contains all the CRM/sales data needed for the GAA webapp, consolidated from the main CLANNAI/crm directory.

## 📁 Directory Structure

```
crm-data/
└── veo/
    ├── clubs_ireland.csv          (45 clubs using VEO in Ireland)
    └── clubs_northern_ireland.csv (19 clubs using VEO in NI)
```

## 📊 Data Overview

### VEO CSV Files

These CSVs contain GAA clubs that are **actively using VEO** video recording systems:

| File | Clubs | Purpose |
|------|-------|---------|
| `clubs_ireland.csv` | 45 | Irish GAA clubs with VEO |
| `clubs_northern_ireland.csv` | 19 | Northern Ireland GAA clubs with VEO |

**CSV Format:**
```csv
Club Name,Recordings,Club Identifier,Country,Activity_Score
```

### What This Data Is Used For

1. **Import Script** (`backend/import-clubs.js`)
   - Loads all 1,680+ clubs from `gaapitchfinder_data.json`
   - Matches them against VEO CSVs to mark which ones use VEO
   - Imports into `clubs` database table

2. **Admin Dashboard** (`/admin` → Clubs tab)
   - Shows all clubs with VEO status
   - Filter by VEO usage, county, province
   - Display recording counts

3. **Public Clubs Page** (`/clubs`)
   - Public-facing club directory
   - Same filtering as admin

## 🚀 Usage

### Import Clubs into Database

```bash
cd backend

# 1. Install dependencies
npm install csv-parser

# 2. Run migration to create clubs table
node run-clubs-migration.js

# 3. Import clubs (uses CSVs from this directory)
node import-clubs.js
```

The import script will:
- Load 1,680+ clubs from pitch finder data
- Match them with VEO clubs from these CSVs
- Insert into database with `uses_veo` flag

Expected output:
```
✅ Loaded 1,680 clubs from JSON
✅ Found 64 GAA clubs using VEO (45 Ireland + 19 NI)
✅ Import complete!
   Total clubs imported: 1,680
   Clubs using VEO: ~10-15 (depending on matching accuracy)
```

## 📝 Notes

- **Source:** These CSVs are copied from `CLANNAI/crm/veo/crm-clean/data/2-by-country/`
- **Matching Logic:** The import script uses fuzzy matching to match club names (handles variations like "Dublin GAA" vs "Dublin")
- **Updates:** If the CRM data is updated, re-copy the CSVs here and re-run the import

## 🔗 Related Files

- `backend/import-clubs.js` - Import script
- `backend/routes/clubs.js` - API endpoints
- `db/migrations/009_create_clubs_table.sql` - Database schema
- `frontend/src/app/admin/page.tsx` - Admin dashboard
- `frontend/src/app/clubs/page.tsx` - Public clubs page

