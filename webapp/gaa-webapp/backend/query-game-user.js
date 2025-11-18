const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const dbUrl = process.env.DATABASE_URL.replace('?sslmode=require', '');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function queryGames() {
  try {
    const result = await pool.query(`
      SELECT 
        g.id,
        g.title,
        g.created_at,
        g.team_id,
        t.name as team_name,
        u.email,
        u.name as user_name
      FROM games g
      LEFT JOIN teams t ON g.team_id = t.id
      LEFT JOIN team_members tm ON g.team_id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE g.id IN ($1, $2)
      ORDER BY g.created_at DESC
    `, ['8e32d1fd-bf1e-4f75-96bd-158daba3154f', '849cbb45-9b48-4ab3-8f2e-f676268c2623']);

    console.log('\n📊 Lambda-processed games:\n');
    result.rows.forEach(row => {
      console.log(`Game: ${row.id.substring(0,8)}...`);
      console.log(`  Title: ${row.title}`);
      console.log(`  Team: ${row.team_name}`);
      console.log(`  User: ${row.user_name} (${row.email})`);
      console.log(`  Created: ${row.created_at}`);
      console.log('');
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

queryGames();
