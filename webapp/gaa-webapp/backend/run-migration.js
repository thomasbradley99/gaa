require('dotenv').config();
const { Pool } = require('pg');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Read migration file
async function runMigration(migrationFile) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env file.');
    process.exit(1);
  }

  const url = new URL(connectionString);
  const DB_USERNAME = url.username;
  const DB_PASSWORD = url.password;
  const DB_HOST = url.hostname;
  const DB_PORT = url.port || 5432;
  const DB_NAME = url.pathname.slice(1) || 'gaa_app';

  const pool = new Pool({
    connectionString: `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`\n📝 Running migration: ${migrationFile}`);
    await pool.query(sql);
    console.log(`✅ Migration ${migrationFile} completed successfully!\n`);
  } catch (error) {
    if (error.code === '42P07') {
      console.log(`⚠️  Constraint already exists, skipping...`);
    } else {
      console.error(`❌ Migration failed:`, error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  console.error('Example: node run-migration.js 002_add_unique_team_name.sql');
  process.exit(1);
}

runMigration(migrationFile).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

