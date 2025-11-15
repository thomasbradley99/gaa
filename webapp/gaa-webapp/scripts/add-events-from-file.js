#!/usr/bin/env node
/**
 * Add Events from JSON File to Game
 * 
 * Loads events from a JSON file (GAA Events Schema format) and adds to game via API.
 * 
 * Usage:
 *   node scripts/add-events-from-file.js <game-id> <events-file.json>
 *   OR
 *   node scripts/add-events-from-file.js --video-url "https://..." <events-file.json>
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Load environment variables
const envPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
}

const { query } = require('../backend/utils/database');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4011';
const LAMBDA_API_KEY = process.env.LAMBDA_API_KEY || 'gaa-lambda-secret-key-change-in-production';

async function findGameByVideoUrl(videoUrl) {
  try {
    console.log(`🔍 Searching for game with video URL containing: ${videoUrl.substring(0, 50)}...`);
    
    const result = await query(
      `SELECT id, title, video_url FROM games WHERE video_url LIKE $1 LIMIT 1`,
      [`%${videoUrl}%`]
    );
    
    if (result.rows.length === 0) {
      console.error(`❌ No game found with that video URL`);
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error searching for game:', error);
    return null;
  }
}

function loadEventsFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Handle different formats
    if (data.events && Array.isArray(data.events)) {
      // Already in GAA Events Schema format
      return data;
    } else if (Array.isArray(data)) {
      // Array of events, wrap in schema format
      return {
        match_info: {
          title: "GAA Match Events",
          total_events: data.length,
          analysis_method: "Loaded from file"
        },
        events: data
      };
    } else {
      throw new Error('Invalid events file format');
    }
  } catch (error) {
    console.error(`❌ Error loading events file: ${error.message}`);
    process.exit(1);
  }
}

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function addEventsViaAPI(gameId, eventsData) {
  try {
    const url = new URL(`${BACKEND_URL}/api/games/${gameId}/events`);
    
    console.log(`📤 Sending events to API: ${url.toString()}`);
    console.log(`   Events count: ${eventsData.events.length}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LAMBDA_API_KEY
      }
    };
    
    const response = await makeRequest(options, eventsData);
    
    console.log(`✅ Events added successfully via API!`);
    console.log(`   Game ID: ${response.body.game_id}`);
    console.log(`   Events count: ${response.body.events_count}`);
    console.log(`   Status: ${response.body.status}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error calling API: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node scripts/add-events-from-file.js <game-id> <events-file.json>');
    console.log('  node scripts/add-events-from-file.js --video-url "https://..." <events-file.json>');
    process.exit(1);
  }
  
  let gameId = null;
  let eventsFile = null;
  
  if (args[0] === '--video-url' && args.length >= 2) {
    const videoUrl = args[1];
    eventsFile = args[2];
    const game = await findGameByVideoUrl(videoUrl);
    if (!game) {
      process.exit(1);
    }
    gameId = game.id;
    console.log(`✅ Found game: ${game.title} (${game.id})`);
  } else {
    gameId = args[0];
    eventsFile = args[1];
  }
  
  if (!eventsFile) {
    console.error('❌ Events file path required');
    process.exit(1);
  }
  
  if (!fs.existsSync(eventsFile)) {
    console.error(`❌ Events file not found: ${eventsFile}`);
    process.exit(1);
  }
  
  console.log(`📂 Loading events from: ${eventsFile}`);
  const eventsData = loadEventsFile(eventsFile);
  
  await addEventsViaAPI(gameId, eventsData);
  process.exit(0);
}

main();

