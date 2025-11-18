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

async function checkEvents() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        title,
        jsonb_array_length(events->'events') as event_count,
        events->'events'->0 as first_event,
        events->'events'->1 as second_event,
        events->'team_mapping' as team_mapping
      FROM games 
      WHERE id = $1
    `, ['8e32d1fd-bf1e-4f75-96bd-158daba3154f']);

    if (result.rows.length > 0) {
      const game = result.rows[0];
      console.log('\n📊 Game:', game.title);
      console.log('Event count:', game.event_count);
      console.log('\n🔍 First event structure:');
      console.log(JSON.stringify(game.first_event, null, 2));
      console.log('\n🔍 Second event structure:');
      console.log(JSON.stringify(game.second_event, null, 2));
      console.log('\n🔍 Team mapping:');
      console.log(JSON.stringify(game.team_mapping, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkEvents();
