const { pool } = require('./utils/database');
const dotenv = require('dotenv');

dotenv.config();

async function makeAdmin() {
  try {
    const email = 'thomasbradley859@gmail.com';
    
    const result = await pool.query(
      `UPDATE users 
       SET role = 'admin', updated_at = NOW()
       WHERE email = $1
       RETURNING id, email, name, role`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    const user = result.rows[0];
    console.log('\n✅ User updated to admin:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}\n`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error updating user:', error);
    process.exit(1);
  }
}

makeAdmin();

