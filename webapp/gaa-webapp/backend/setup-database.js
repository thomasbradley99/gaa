#!/usr/bin/env node

// Script to create database and run schema on RDS
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://gaaadmin:YourSecurePassword123!@clann-gaa-db-nov25.cfcgo2cma4or.eu-west-1.rds.amazonaws.com:5432/postgres';
const DB_NAME = 'gaa_app';

// Parse connection string
const url = new URL(DATABASE_URL.replace('postgresql://', 'http://'));
const adminPool = new Pool({
  host: url.hostname,
  port: url.port || 5432,
  user: url.username,
  password: url.password,
  database: 'postgres', // Connect to default postgres DB first
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

const appPool = new Pool({
  host: url.hostname,
  port: url.port || 5432,
  user: url.username,
  password: url.password,
  database: DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function runSQLFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running ${path.basename(filePath)}...`);
  await pool.query(sql);
  console.log(`✅ ${path.basename(filePath)} completed`);
}

async function setup() {
  try {
    console.log('🗄️  Setting up database...\n');

    // Step 1: Create database
    console.log(`Creating database '${DB_NAME}'...`);
    try {
      await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database '${DB_NAME}' created`);
    } catch (err) {
      if (err.code === '42P04') {
        console.log(`⚠️  Database '${DB_NAME}' already exists, continuing...`);
      } else {
        throw err;
      }
    }

    // Step 2: Run schema
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    await runSQLFile(appPool, schemaPath);

    // Step 3: Run migration
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '001_add_video_fields.sql');
    await runSQLFile(appPool, migrationPath);

    console.log('\n🎉 Database setup complete!');
    console.log(`\nConnection string:`);
    console.log(`postgresql://${url.username}:${url.password}@${url.hostname}:${url.port || 5432}/${DB_NAME}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await adminPool.end();
    await appPool.end();
  }
}

setup();

