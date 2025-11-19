#!/usr/bin/env node
/**
 * Quick migration runner
 * Usage: node db/run-migration.js db/migrations/006_add_team_colors.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  process.exit(1);
}

// Read migration SQL
const sqlPath = path.resolve(__dirname, '..', migrationFile);
const sql = fs.readFileSync(sqlPath, 'utf8');

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log(`📦 Running migration: ${path.basename(migrationFile)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await client.query(sql);
    
    console.log('✅ Migration successful!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

