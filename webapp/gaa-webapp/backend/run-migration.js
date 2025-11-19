const { query } = require('./utils/database');
const fs = require('fs');

const sql = fs.readFileSync('../db/migrations/008_allow_duplicate_team_names.sql', 'utf8');

async function run() {
  try {
    console.log('📦 Running migration: 008_allow_duplicate_team_names.sql');
    await query(sql);
    console.log('✅ Migration successful! You can now have multiple teams with the same name.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

run();
