#!/usr/bin/env node
/**
 * Check if Lambda-analyzed games have events in database
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

async function checkGames() {
  const gameIds = [
    '8e32d1fd-bf1e-4f75-96bd-158daba3154f', // 34 events
    '849cbb45-9b48-4ab3-8f2e-f676268c2623', // 45 events
    '8658c430-bb6a-461d-8be3-972ac9f5b4e9', // Failed (401)
  ];

  console.log('🔍 Checking Lambda-analyzed games...\n');

  for (const gameId of gameIds) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          title,
          status,
          created_at,
          (events IS NOT NULL) as has_events_field,
          (events->'events' IS NOT NULL) as has_events_array,
          jsonb_array_length(events->'events') as event_count,
          (metadata IS NOT NULL) as has_metadata,
          (metadata->'teams' IS NOT NULL) as has_teams_metadata
         FROM games 
         WHERE id = $1`,
        [gameId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Game ${gameId} not found`);
        continue;
      }

      const game = result.rows[0];
      console.log(`📊 Game: ${game.id.substring(0, 8)}...`);
      console.log(`   Title: ${game.title}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Has events field: ${game.has_events_field}`);
      console.log(`   Has events array: ${game.has_events_array}`);
      console.log(`   Event count: ${game.event_count}`);
      console.log(`   Has metadata: ${game.has_metadata}`);
      console.log(`   Has teams metadata: ${game.has_teams_metadata}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error checking game ${gameId}:`, error.message);
    }
  }

  await pool.end();
}

checkGames().catch(console.error);

