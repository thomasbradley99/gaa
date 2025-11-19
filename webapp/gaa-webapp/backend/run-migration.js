const { query } = require('./utils/database');
const fs = require('fs');

const sql = fs.readFileSync('../db/migrations/007_make_secondary_color_optional.sql', 'utf8');

async function run() {
  try {
    console.log('📦 Running migration: 007_make_secondary_color_optional.sql');
    await query(sql);
    console.log('✅ Migration successful! Secondary color is now optional.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

run();
