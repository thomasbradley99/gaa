#!/bin/bash

# Script to run the team colors migration
# This adds home_color, away_color, and accent_color fields to the teams table

echo "🏐 GAA Webapp - Team Colors Migration"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "db/migrations/004_add_team_colors.sql" ]; then
    echo "❌ Error: Migration file not found."
    echo "Please run this script from the gaa-webapp root directory."
    exit 1
fi

echo "This will add team color fields to your teams table."
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Running migration..."
echo ""

# Try using the Node.js migration runner if it exists
if [ -f "backend/run-migration.js" ]; then
    echo "Using Node.js migration runner..."
    node backend/run-migration.js db/migrations/004_add_team_colors.sql
else
    echo "⚠️  Node.js migration runner not found."
    echo ""
    echo "Please run the migration manually using one of these methods:"
    echo ""
    echo "Option 1: Using psql"
    echo "  psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f db/migrations/004_add_team_colors.sql"
    echo ""
    echo "Option 2: Copy and paste the SQL from db/migrations/004_add_team_colors.sql into your database client"
    echo ""
    exit 1
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Restart your frontend server"
echo "3. Go to the Team page in your webapp"
echo "4. Set your team colors using the color picker"
echo ""
echo "📖 For more information, see TEAM_COLORS_SETUP.md"

