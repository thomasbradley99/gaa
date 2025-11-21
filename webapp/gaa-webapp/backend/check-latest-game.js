require('dotenv').config();
const pg = require('pg');

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('rds.amazonaws.com')
    ? { rejectUnauthorized: false, require: true }
    : false,
});

async function checkLatestGame() {
  try {
    console.log('🔍 Checking latest game...\n');
    
    const result = await pool.query(`
      SELECT 
        g.id,
        g.title,
        g.description,
        g.video_url,
        g.status,
        g.created_at,
        g.updated_at,
        g.thumbnail_key,
        g.metadata,
        t.name as team_name,
        u.email as created_by_email
      FROM games g
      LEFT JOIN teams t ON g.team_id = t.id
      LEFT JOIN users u ON g.created_by = u.id
      ORDER BY g.created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No games found in database');
      return;
    }
    
    const game = result.rows[0];
    
    console.log('✅ Latest Game Found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${game.id}`);
    console.log(`Title: ${game.title}`);
    console.log(`Description: ${game.description || 'N/A'}`);
    console.log(`Team: ${game.team_name || 'N/A'}`);
    console.log(`Created by: ${game.created_by_email || 'N/A'}`);
    console.log(`Status: ${game.status}`);
    console.log(`Video URL: ${game.video_url || 'N/A'}`);
    console.log(`Thumbnail Key: ${game.thumbnail_key || 'N/A'}`);
    console.log(`Created: ${game.created_at}`);
    console.log(`Updated: ${game.updated_at}`);
    
    if (game.metadata) {
      console.log('\n📊 Metadata:');
      console.log(JSON.stringify(game.metadata, null, 2));
      
      // Check for detected team colors
      if (game.metadata.teams) {
        console.log('\n🎨 Detected Team Colors:');
        if (game.metadata.teams.home_team) {
          console.log(`  Home: ${game.metadata.teams.home_team.jersey_color || 'N/A'}`);
        }
        if (game.metadata.teams.away_team) {
          console.log(`  Away: ${game.metadata.teams.away_team.jersey_color || 'N/A'}`);
        }
      }
    } else {
      console.log('\n📊 Metadata: None');
    }
    
    // Check if events exist
    const eventsResult = await pool.query(
      'SELECT events FROM games WHERE id = $1',
      [game.id]
    );
    
    if (eventsResult.rows[0]?.events) {
      const events = eventsResult.rows[0].events;
      console.log(`\n📈 Events: ${Array.isArray(events) ? events.length : 'N/A'} events`);
    } else {
      console.log('\n📈 Events: None');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error checking game:', error.message);
  } finally {
    await pool.end();
  }
}

checkLatestGame();
