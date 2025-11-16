# Team Colors Setup Guide

This guide will help you add team colors to your GAA webapp so that events show the actual team colors instead of just "red" and "blue".

## What I've Added

### Database Migration
- `db/migrations/004_add_team_colors.sql` - Adds `home_color`, `away_color`, and `accent_color` fields to the teams table

### Team Colors Reference Data
- `db/gaa_team_colors.json` - Contains common GAA team colors for quick reference (Dublin, Kerry, Mayo, Cork, etc.)

### Backend API
- Updated `backend/routes/teams.js` with:
  - Modified `PUT /:teamId` endpoint to accept color fields
  - New `PATCH /:teamId/colors` endpoint for updating colors only

### Frontend Components
- `frontend/src/components/teams/TeamColorPicker.tsx` - Beautiful color picker UI with:
  - Quick select presets for 20 common GAA teams
  - Manual color picker for custom colors
  - Live preview
  - Easy-to-use interface

### API Client
- Updated `frontend/src/lib/api-client.ts` with `updateTeamColors()` method

### Team Page
- Updated `frontend/src/app/team/page.tsx` to include the color picker

## How to Set It Up

### Step 1: Run the Database Migration

```bash
cd /Users/thomasbradley/clann-repos/gaa/webapp/gaa-webapp

# If using the backend migration runner
node backend/run-migration.js db/migrations/004_add_team_colors.sql

# Or connect directly to your database and run:
psql -h your-db-host -U your-user -d your-database -f db/migrations/004_add_team_colors.sql
```

### Step 2: Restart Your Backend

```bash
cd backend
npm start
# or if using a different command
```

### Step 3: Restart Your Frontend

```bash
cd frontend
npm run dev
```

### Step 4: Set Your Team Colors

1. Go to your webapp at http://localhost:3000 (or your URL)
2. Log in
3. Go to the Team page
4. Scroll down to the "Team Colors" section
5. Either:
   - Click on a preset GAA team to use their colors
   - Or manually pick colors using the color pickers
6. Click "Save Team Colors"

## How Team Colors Work

### In the Database
- `primary_color`: First color on the team's kit (hex format, e.g., `#016F32` for Kerry green)
- `secondary_color`: Second color on the team's kit (hex format, e.g., `#FFD700` for Kerry gold)
- `accent_color`: Optional third color for teams with multiple colors

### Important: GAA Teams Have ONE Kit
Unlike soccer teams with home/away kits, **GAA teams have ONE kit with TWO colors**:
- Kerry: Green & Gold (one kit)
- Dublin: Sky Blue & Navy (one kit)
- Mayo: Red & Green (one kit)

### In the Webapp
When viewing game videos and events, your team's kit colors will be displayed accurately, making it easy to identify your team during matches

## Common GAA Team Colors Included

The color picker includes quick presets for these teams (with their kit colors):
- Dublin (Sky Blue & Navy)
- Kerry (Green & Gold)
- Mayo (Red & Green)
- Tyrone (White & Red)
- Cork (Red & White)
- Galway (Maroon & White)
- Donegal (Green & Gold)
- Kilkenny (Black & Amber)
- Limerick (Green & White)
- Tipperary (Blue & Gold)
- Waterford (Blue & White)
- Clare (Saffron & Blue)
- Wexford (Purple & Gold)
- Meath (Green & Gold)
- Kildare (White)
- Armagh (Orange & White)
- Roscommon (Primrose & Blue)
- Down (Red & Black)
- Monaghan (White & Blue)
- Derry (Red & White)

## Troubleshooting

### Migration fails
- Make sure you're connected to the correct database
- Check if the migration has already been run
- Verify database credentials

### Colors not saving
- Check browser console for errors
- Verify backend is running
- Check that you're an admin of the team (only admins can change colors)

### Colors not showing in videos
- The color mapping happens in the event display components
- You may need to refresh the game page after updating colors
- Check that the game has team_mapping data

## Next Steps

After setting up team colors, you might want to:
1. Update the video player components to use team colors from the database
2. Add color indicators to the event list
3. Create a team profile page showing the colors

