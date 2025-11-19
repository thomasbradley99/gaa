const { query } = require('./utils/database');

async function run() {
  try {
    const result = await query('SELECT id, name, primary_color, secondary_color FROM teams ORDER BY name');
    console.log('\n📋 Your Teams:\n');
    result.rows.forEach(team => {
      const colors = team.primary_color && team.secondary_color 
        ? `${team.primary_color} / ${team.secondary_color}` 
        : 'No colors set';
      console.log(`  ${team.name}`);
      console.log(`    ID: ${team.id}`);
      console.log(`    Colors: ${colors}\n`);
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
