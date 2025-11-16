#!/bin/bash

# Quick migration runner for team colors
# Usage: ./run-migration.sh

echo "Running team colors migration..."

# Check if .env exists
if [ -f "backend/.env" ]; then
    source backend/.env
elif [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found"
    echo "Please set DATABASE_URL manually or create .env file"
    exit 1
fi

# Run the migration
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    echo "Please set DATABASE_URL in your .env file"
    exit 1
fi

echo "Applying migration to database..."
psql "$DATABASE_URL" -f db/migrations/004_add_team_colors.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend server"
    echo "2. Refresh your frontend"
    echo "3. Go to Team page and set your colors"
else
    echo "❌ Migration failed"
    echo "Check the error above"
fi
