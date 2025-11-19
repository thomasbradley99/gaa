require('dotenv').config({ path: './.env' });
const { query } = require('./utils/database');

async function checkLatestGame() {
  try {
    console.log('✅ Connected to PostgreSQL database\n');
    
    // Get latest game with all details
    const gameResult = await query(`
      SELECT 
        g.id,
        g.title,
        g.video_url,
        g.status,
        g.created_at,
        g.events,
        g.metadata,
        t.name as team_name,
        t.primary_color,
        t.secondary_color,
        u.email as created_by_email,
        u.name as created_by_name
      FROM games g
      JOIN teams t ON g.team_id = t.id
      JOIN users u ON g.created_by = u.id
      ORDER BY g.created_at DESC
      LIMIT 1
    `);
    
    if (gameResult.rows.length === 0) {
      console.log('❌ No games found in database\n');
      return;
    }
    
    const game = gameResult.rows[0];
    
    console.log('📊 LATEST GAME:\n');
    console.log(`  Title: ${game.title}`);
    console.log(`  ID: ${game.id}`);
    console.log(`  Status: ${game.status}`);
    console.log(`  Created: ${game.created_at}`);
    console.log(`  VEO URL: ${game.video_url || 'N/A'}`);
    console.log(`\n👤 CREATED BY:\n`);
    console.log(`  Name: ${game.created_by_name}`);
    console.log(`  Email: ${game.created_by_email}`);
    console.log(`\n🏆 TEAM:\n`);
    console.log(`  Name: ${game.team_name}`);
    console.log(`  Colors: ${game.primary_color} / ${game.secondary_color || 'N/A'}`);
    console.log(`\n📈 DATA:\n`);
    console.log(`  Events: ${game.events ? Object.keys(game.events).length + ' keys' : 'None'}`);
    console.log(`  Metadata: ${game.metadata ? JSON.stringify(game.metadata, null, 2) : 'None'}`);
    
    // Check if Lambda has been triggered
    console.log(`\n🚀 LAMBDA STATUS:\n`);
    if (game.status === 'pending') {
      console.log(`  ⏳ Waiting for Lambda to process video`);
    } else if (game.status === 'analyzed') {
      console.log(`  ✅ AI analysis complete`);
    }
    
  } catch (error) {
    console.error('Error checking latest game:', error);
  }
}

checkLatestGame();

