#!/usr/bin/env node
/**
 * Check which user/team owns the Lambda-analyzed games
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkGameOwners() {
  const gameIds = [
    '8e32d1fd-bf1e-4f75-96bd-158daba3154f', // 34 events (Nov 18, 13:34)
    '849cbb45-9b48-4ab3-8f2e-f676268c2623', // 45 events (Nov 18, 17:52)
  ];

  console.log('🔍 Checking game ownership...\n');

  for (const gameId of gameIds) {
    try {
      const result = await pool.query(
        `SELECT 
          g.id,
          g.title,
          g.status,
          g.created_at,
          g.team_id,
          t.name as team_name,
          u.email as creator_email,
          u.name as creator_name
         FROM games g
         LEFT JOIN teams t ON g.team_id = t.id
         LEFT JOIN team_members tm ON g.team_id = tm.team_id
         LEFT JOIN users u ON tm.user_id = u.id
         WHERE g.id = $1
         LIMIT 1`,
        [gameId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Game ${gameId} not found\n`);
        continue;
      }

      const game = result.rows[0];
      console.log(`📊 Game: ${game.id.substring(0, 8)}...`);
      console.log(`   Title: ${game.title}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Team: ${game.team_name || 'N/A'}`);
      console.log(`   Creator: ${game.creator_name || 'N/A'} (${game.creator_email || 'N/A'})`);
      console.log(`   Created: ${game.created_at}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error checking game ${gameId}:`, error.message);
    }
  }

  await pool.end();
}

checkGameOwners().catch(console.error);

