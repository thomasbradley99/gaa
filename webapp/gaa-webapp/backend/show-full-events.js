require('dotenv').config({ path: './.env' });
const { query } = require('./utils/database');
const fs = require('fs');

async function showFullEvents() {
  try {
    const gameResult = await query(`
      SELECT events, metadata
      FROM games
      WHERE title LIKE '%Cill Chomáin%'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    const game = gameResult.rows[0];
    
    // Write to file for inspection
    fs.writeFileSync('EVENTS_STRUCTURE.json', JSON.stringify(game.events, null, 2));
    fs.writeFileSync('METADATA_STRUCTURE.json', JSON.stringify(game.metadata, null, 2));
    
    console.log('✅ Written to EVENTS_STRUCTURE.json and METADATA_STRUCTURE.json');
    console.log('\n📊 EVENTS STRUCTURE:\n');
    console.log(JSON.stringify(game.events, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

showFullEvents();

