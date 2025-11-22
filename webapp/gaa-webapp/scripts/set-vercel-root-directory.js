#!/usr/bin/env node

/**
 * Set Vercel root directory via API
 * This sets the root directory for frontend and backend projects
 * Run once to configure, then auto-deploys will work forever
 */

const https = require('https');

const FRONTEND_PROJECT_ID = 'prj_UPwbj8WgshVyGhv8RjDMfZLT6QQL';
const BACKEND_PROJECT_ID = 'prj_B4tbqxPBmNzFevDGBRrx9a3V9np8';
const TEAM_ID = 'team_toJIL961FsGnSvsL1828sExW';

// Get Vercel token from environment or auth file
let token = process.env.VERCEL_TOKEN;
if (!token) {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      // Get token from the first team/user
      const firstKey = Object.keys(auth)[0];
      token = auth[firstKey]?.token;
    }
  } catch (e) {
    // Fall through
  }
}

if (!token) {
  console.error('❌ No Vercel token found. Run: vercel login');
  process.exit(1);
}

function updateProjectSettings(projectId, rootDirectory) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      rootDirectory: rootDirectory || null
    });

    const options = {
      hostname: 'api.vercel.com',
      path: `/v9/projects/${projectId}?teamId=${TEAM_ID}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔧 Setting Vercel root directories...\n');

    // Set frontend root directory
    console.log('📁 Setting frontend root directory to: webapp/gaa-webapp/frontend');
    await updateProjectSettings(FRONTEND_PROJECT_ID, 'webapp/gaa-webapp/frontend');
    console.log('✅ Frontend root directory set\n');

    // Set backend root directory (should be null/empty)
    console.log('📁 Setting backend root directory to: webapp/gaa-webapp/backend');
    await updateProjectSettings(BACKEND_PROJECT_ID, 'webapp/gaa-webapp/backend');
    console.log('✅ Backend root directory set\n');

    console.log('🎉 Done! Auto-deploys from Git will now work correctly.');
    console.log('   Just push to main branch and Vercel will auto-deploy.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 You may need to:');
    console.error('   1. Run: vercel login');
    console.error('   2. Or set VERCEL_TOKEN environment variable');
    process.exit(1);
  }
}

main();

