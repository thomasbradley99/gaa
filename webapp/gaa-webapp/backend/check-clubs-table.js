const { pool } = require('./utils/database');
const dotenv = require('dotenv');
dotenv.config();

async function checkTable() {
  try {
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clubs')"
    );
    
    if (result.rows[0].exists) {
      console.log('✅ Clubs table exists');
      
      // Check if it has data
      const countResult = await pool.query('SELECT COUNT(*) as count FROM clubs');
      console.log(`📊 Total clubs in database: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ Clubs table does NOT exist');
      console.log('\n📝 Please run the migration first:');
      console.log('   psql -U postgres -d gaa_app -f db/migrations/009_create_clubs_table.sql');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTable();

