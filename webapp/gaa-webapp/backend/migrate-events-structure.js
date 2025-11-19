require('dotenv').config({ path: './.env' });
const { query } = require('./utils/database');

async function migrateEventsStructure() {
  try {
    console.log('🔄 Starting events structure migration...\n');
    
    // Get all games with events
    const gamesResult = await query(`
      SELECT id, title, events, metadata
      FROM games
      WHERE events IS NOT NULL
    `);
    
    console.log(`Found ${gamesResult.rows.length} games with events\n`);
    
    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const game of gamesResult.rows) {
      try {
        // Check if events is already an array
        if (Array.isArray(game.events)) {
          console.log(`✅ ${game.title} - Already correct format (array)`);
          skipped++;
          continue;
        }
        
        // Check if events is nested object with events array inside
        if (game.events && typeof game.events === 'object' && game.events.events) {
          console.log(`🔧 ${game.title} - Migrating nested structure...`);
          
          // Extract the actual events array
          const eventsArray = game.events.events;
          
          // Build enriched metadata
          const newMetadata = {
            ...(game.metadata || {}),
            team_mapping: game.events.team_mapping || null,
            match_info: game.events.match_info || {
              title: game.title,
              total_events: eventsArray.length,
              migrated_at: new Date().toISOString()
            },
            updated_at: game.events.updated_at || new Date().toISOString()
          };
          
          // Update database
          await query(
            `UPDATE games
             SET events = $1::jsonb,
                 metadata = $2::jsonb
             WHERE id = $3`,
            [JSON.stringify(eventsArray), JSON.stringify(newMetadata), game.id]
          );
          
          console.log(`   ✅ Migrated ${eventsArray.length} events`);
          console.log(`   📦 Updated metadata with team_mapping and match_info`);
          migrated++;
          
        } else {
          console.log(`⚠️  ${game.title} - Unknown structure, skipping`);
          skipped++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to migrate game ${game.id}:`, error.message);
        failed++;
      }
      
      console.log(''); // Empty line between games
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Migrated: ${migrated} games`);
    console.log(`⏭️  Skipped: ${skipped} games (already correct)`);
    console.log(`❌ Failed: ${failed} games`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateEventsStructure();
