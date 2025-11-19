const { query } = require('./utils/database');
const crypto = require('crypto');

async function run() {
  try {
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const result = await query(
      `INSERT INTO teams (name, description, primary_color, secondary_color, invite_code)
       VALUES ('Kilmeena GAA', 'Second test team - same name!', '#000000', NULL, $1)
       RETURNING id, name, invite_code`,
      [inviteCode]
    );
    
    console.log('\n✅ Created second "Kilmeena GAA" team!\n');
    console.log(`  Name: ${result.rows[0].name}`);
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Invite: ${result.rows[0].invite_code}\n`);
    console.log('🎉 No conflicts! Multiple teams can have the same name now.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
