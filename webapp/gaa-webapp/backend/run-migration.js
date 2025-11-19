const { query } = require('./utils/database');
const fs = require('fs');

const sql = fs.readFileSync('../db/migrations/006_add_team_colors.sql', 'utf8');

async function run() {
  try {
    console.log('📦 Running migration: 006_add_team_colors.sql');
    await query(sql);
    console.log('✅ Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

run();
