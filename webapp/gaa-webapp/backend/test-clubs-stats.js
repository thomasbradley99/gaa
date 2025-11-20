const { pool } = require('./utils/database');
const dotenv = require('dotenv');
dotenv.config();

async function testClubsStats() {
  try {
    console.log('Testing clubs stats query...\n');
    
    // Test the exact query used in the API
    const [totalResult, veoResult, countiesResult, provincesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clubs'),
      pool.query('SELECT COUNT(*) as count FROM clubs WHERE uses_veo = true'),
      pool.query('SELECT COUNT(DISTINCT county) as count FROM clubs WHERE county IS NOT NULL'),
      pool.query('SELECT COUNT(DISTINCT province) as count FROM clubs WHERE province IS NOT NULL')
    ]);
    
    const stats = {
      total: parseInt(totalResult.rows[0].count),
      usingVeo: parseInt(veoResult.rows[0].count),
      notUsingVeo: parseInt(totalResult.rows[0].count) - parseInt(veoResult.rows[0].count),
      counties: parseInt(countiesResult.rows[0].count),
      provinces: parseInt(provincesResult.rows[0].count)
    };
    
    console.log('Clubs Stats Result:');
    console.log(JSON.stringify({ stats }, null, 2));
    console.log('\n✅ Stats query successful!');
    console.log(`   Total clubs: ${stats.total}`);
    console.log(`   Using VEO: ${stats.usingVeo}`);
    console.log(`   Not using VEO: ${stats.notUsingVeo}`);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testClubsStats();

