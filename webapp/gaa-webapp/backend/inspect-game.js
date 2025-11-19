require('dotenv').config({ path: './.env' });
const { query } = require('./utils/database');

async function inspectGame() {
  try {
    console.log('✅ Connected to PostgreSQL database\n');
    
    // Get the Kilmeena vs Cill Chomáin game
    const gameResult = await query(`
      SELECT 
        g.id,
        g.title,
        g.status,
        g.events,
        g.metadata
      FROM games g
      WHERE g.title LIKE '%Cill Chomáin%'
      ORDER BY g.created_at DESC
      LIMIT 1
    `);
    
    if (gameResult.rows.length === 0) {
      console.log('❌ Game not found\n');
      return;
    }
    
    const game = gameResult.rows[0];
    
    console.log('🎮 GAME FOUND:\n');
    console.log(`  Title: ${game.title}`);
    console.log(`  ID: ${game.id}`);
    console.log(`  Status: ${game.status}\n`);
    
    console.log('📊 EVENTS DATA:\n');
    if (!game.events) {
      console.log('  ❌ NULL - No events in database!\n');
    } else {
      console.log(`  Type: ${typeof game.events}`);
      console.log(`  Is Array: ${Array.isArray(game.events)}`);
      
      if (Array.isArray(game.events)) {
        console.log(`  Count: ${game.events.length} events`);
        if (game.events.length > 0) {
          console.log('\n  First 3 events:');
          game.events.slice(0, 3).forEach((event, i) => {
            console.log(`    ${i+1}. ${JSON.stringify(event)}`);
          });
        }
      } else {
        console.log(`  Structure: ${JSON.stringify(Object.keys(game.events))}`);
        console.log(`  Raw: ${JSON.stringify(game.events).substring(0, 200)}...`);
      }
    }
    
    console.log('\n📦 METADATA:\n');
    if (!game.metadata) {
      console.log('  ❌ NULL - No metadata in database!\n');
    } else {
      console.log(`  Keys: ${Object.keys(game.metadata).join(', ')}`);
      console.log(`  Full metadata:\n${JSON.stringify(game.metadata, null, 2)}`);
    }
    
  } catch (error) {
    console.error('Error inspecting game:', error);
  }
}

inspectGame();

