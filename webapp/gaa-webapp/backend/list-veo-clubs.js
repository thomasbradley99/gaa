const { pool } = require('./utils/database');
const dotenv = require('dotenv');
dotenv.config();

async function listVeoClubs() {
  try {
    const result = await pool.query(
      'SELECT club_name, uses_veo, veo_recordings, veo_club_identifier FROM clubs WHERE uses_veo = true ORDER BY club_name'
    );
    
    console.log('\n✅ Clubs using VEO:');
    console.log(`Total: ${result.rows.length}\n`);
    
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.club_name}`);
      console.log(`   Recordings: ${row.veo_recordings}`);
      console.log(`   Identifier: ${row.veo_club_identifier || 'N/A'}`);
      console.log('');
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listVeoClubs();

