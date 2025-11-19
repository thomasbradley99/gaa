const { query } = require('./utils/database');

async function run() {
  try {
    const result = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'teams'
      AND constraint_type = 'UNIQUE'
    `);
    
    console.log('\n📋 Unique constraints on teams table:\n');
    if (result.rows.length === 0) {
      console.log('  None! ✅ Team names can already be duplicated.\n');
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.constraint_name} (${row.constraint_type})`);
      });
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
