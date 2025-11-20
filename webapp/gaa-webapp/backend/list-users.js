const { pool } = require('./utils/database');
const dotenv = require('dotenv');

dotenv.config();

async function listUsers() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        email,
        name,
        phone,
        role,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log('\n📊 Users in Database:\n');
    console.log(`Total users: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'N/A'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  }
}

listUsers();

