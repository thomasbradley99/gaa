const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const dbUrl = process.env.DATABASE_URL.replace('?sslmode=require', '');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkTimestamps() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        title,
        jsonb_array_length(events->'events') as event_count
      FROM games 
      WHERE id = $1
    `, ['8e32d1fd-bf1e-4f75-96bd-158daba3154f']);

    if (result.rows.length > 0) {
      const eventsResult = await pool.query(`
        SELECT 
          jsonb_array_elements(events->'events') as event
        FROM games 
        WHERE id = $1
      `, ['8e32d1fd-bf1e-4f75-96bd-158daba3154f']);

      console.log('\n📊 Checking timestamps for all events:\n');
      
      const badEvents = [];
      eventsResult.rows.forEach((row, idx) => {
        const event = row.event;
        const time = event.time;
        const timestamp = event.timestamp;
        
        if (time === null || time === undefined || isNaN(time) || !isFinite(time)) {
          badEvents.push({
            index: idx,
            id: event.id,
            time: time,
            timestamp: timestamp,
            team: event.team,
            type: event.type,
            action: event.action
          });
        }
      });

      if (badEvents.length > 0) {
        console.log(`❌ Found ${badEvents.length} events with invalid timestamps:\n`);
        badEvents.forEach(e => {
          console.log(`Event ${e.index}: ${e.id}`);
          console.log(`  time: ${e.time} (${typeof e.time})`);
          console.log(`  timestamp: ${e.timestamp}`);
          console.log(`  team: ${e.team}`);
          console.log(`  type/action: ${e.type || e.action}`);
          console.log('');
        });
      } else {
        console.log('✅ All events have valid timestamps');
        
        // Show first 5 events
        console.log('\n📝 Sample of first 5 events:\n');
        eventsResult.rows.slice(0, 5).forEach((row, idx) => {
          const event = row.event;
          console.log(`Event ${idx}: ${event.id}`);
          console.log(`  time: ${event.time}`);
          console.log(`  timestamp: ${event.timestamp}`);
          console.log(`  team: ${event.team}`);
          console.log(`  type: ${event.type}`);
          console.log(`  action: ${event.action}`);
          console.log('');
        });
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTimestamps();
