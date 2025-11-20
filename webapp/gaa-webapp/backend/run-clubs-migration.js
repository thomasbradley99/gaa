/**
 * Run the clubs table migration
 */

const { pool } = require('./utils/database');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function runMigration() {
  try {
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, '../db/migrations/009_create_clubs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🗄️  Running migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Install csv-parser: npm install csv-parser');
    console.log('   2. Run import script: node import-clubs.js');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('\n⚠️  Table already exists. You can skip this step.');
    } else {
      console.error('\nFull error:', error);
      process.exit(1);
    }
  }
}

runMigration();

