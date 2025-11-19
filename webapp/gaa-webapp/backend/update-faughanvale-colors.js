const { query } = require('./utils/database');

async function run() {
  try {
    const result = await query(
      `UPDATE teams 
       SET primary_color = '#FFFFFF', 
           secondary_color = '#000000',
           updated_at = NOW()
       WHERE name ILIKE '%faughanvale%'
       RETURNING id, name, primary_color, secondary_color`,
      []
    );
    
    console.log('\n✅ Updated Faughanvale colors!\n');
    console.log(`  ${result.rows[0].name}`);
    console.log(`  Primary: ${result.rows[0].primary_color} (White)`);
    console.log(`  Secondary: ${result.rows[0].secondary_color} (Black)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
