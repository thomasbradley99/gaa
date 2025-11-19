const { query } = require('./utils/database');
const crypto = require('crypto');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function run() {
  try {
    // Check if Kilmeena exists
    let result = await query(
      `SELECT id, name FROM teams WHERE name ILIKE '%kilmeena%' OR name ILIKE '%kilmeen%'`,
      []
    );
    
    if (result.rows.length === 0) {
      // Create Kilmeena
      console.log('📦 Creating Kilmeena GAA...');
      const inviteCode = generateInviteCode();
      result = await query(
        `INSERT INTO teams (name, description, primary_color, secondary_color, invite_code)
         VALUES ('Kilmeena GAA', 'Mayo GAA Club', '#000000', '#FFFFFF', $1)
         RETURNING id, name, primary_color, secondary_color, invite_code`,
        [inviteCode]
      );
    } else {
      // Update existing
      console.log('📦 Updating Kilmeena GAA...');
      result = await query(
        `UPDATE teams 
         SET primary_color = '#000000', 
             secondary_color = '#FFFFFF',
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, primary_color, secondary_color, invite_code`,
        [result.rows[0].id]
      );
    }
    
    const team = result.rows[0];
    console.log('\n✅ Kilmeena ready!\n');
    console.log(`  Team: ${team.name}`);
    console.log(`  ID: ${team.id}`);
    console.log(`  Primary: ${team.primary_color} (Black)`);
    console.log(`  Secondary: ${team.secondary_color} (White)`);
    console.log(`  Invite Code: ${team.invite_code}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

run();
