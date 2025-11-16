#!/usr/bin/env node

/**
 * Quick migration runner for team colors
 * Run this from the gaa-webapp root directory:
 *   node run-colors-migration.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🏐 GAA Webapp - Team Colors Migration');
  console.log('=====================================\n');

  try {
    // Load database utility
    const dbPath = path.join(__dirname, 'backend', 'utils', 'database.js');
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Error: backend/utils/database.js not found');
      console.error('Make sure you run this from the gaa-webapp root directory\n');
      process.exit(1);
    }

    const { query } = require(dbPath);

    // Read migration file
    const migrationPath = path.join(__dirname, 'db', 'migrations', '004_add_team_colors.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Error: Migration file not found');
      console.error(`Expected: ${migrationPath}\n`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...\n');
    
    // Run the migration
    await query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Refresh your frontend browser tab');
    console.log('3. Go to Team page and click "Team Kit Colors"');
    console.log('4. Set your team colors and save\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:\n');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure your database is running');
    console.error('- Check your DATABASE_URL in .env file');
    console.error('- The migration is safe to run multiple times\n');
    
    process.exit(1);
  }
}

runMigration();

