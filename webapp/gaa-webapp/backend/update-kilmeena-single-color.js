const { query } = require('./utils/database');

async function run() {
  try {
    const result = await query(
      `UPDATE teams 
       SET primary_color = '#000000', 
           secondary_color = NULL,
           updated_at = NOW()
       WHERE name ILIKE '%kilmeena%'
       RETURNING id, name, primary_color, secondary_color`,
      []
    );
    
    console.log('\n✅ Updated Kilmeena to single color!\n');
    console.log(`  ${result.rows[0].name}`);
    console.log(`  Primary: ${result.rows[0].primary_color} (Black)`);
    console.log(`  Secondary: ${result.rows[0].secondary_color || 'N/A'}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
