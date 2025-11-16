const { pool } = require('./utils/database');

async function debugEvents() {
  try {
    const result = await pool.query(`
      SELECT id, title, events
      FROM games
      WHERE events IS NOT NULL
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('No games with events found');
      process.exit(0);
    }
    
    const game = result.rows[0];
    console.log('\nGame:', game.title);
    console.log('\nEvents structure:', JSON.stringify(game.events, null, 2));
    
    // Check first 5 events
    if (game.events && game.events.events) {
      console.log('\n\nFirst 5 events team values:');
      game.events.events.slice(0, 5).forEach((e, i) => {
        console.log(`Event ${i+1}: team="${e.team}", action="${e.action}"`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugEvents();

