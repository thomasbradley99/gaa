/**
 * Import GAA clubs from gaapitchfinder_data.json into database
 * and mark clubs that use VEO based on CSV files
 */

const { pool } = require('./utils/database');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const dotenv = require('dotenv');
dotenv.config();

// Paths to data files
const PITCH_FINDER_DATA = path.join(__dirname, '../frontend/src/components/pitch-finder/gaapitchfinder_data.json');

// Try multiple possible paths for CSV files (local GAA directory first, then CLANNAI)
const possiblePaths = [
  path.join(__dirname, '../crm-data/veo/clubs_ireland.csv'),                                      // 1. Local GAA directory (preferred)
  path.join(__dirname, '../../../CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv'), // 2. CLANNAI path (fallback)
  path.join(__dirname, '../../CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv'),
  path.join(process.cwd(), 'CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv'),
  path.join(__dirname, '../../../../CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv'),
];
const IRELAND_VEO_CSV = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
const NI_VEO_CSV = IRELAND_VEO_CSV.replace('clubs_ireland.csv', 'clubs_northern_ireland.csv');

/**
 * Normalize club name for matching
 * Removes common suffixes and normalizes case
 */
function normalizeClubName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bgaa\b/gi, '')
    .replace(/\bclub\b/gi, '')
    .replace(/\bteam\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Extract club name from VEO club name
 * Handles variations like "Dublin GAA", "Galway Hurling", etc.
 */
function extractClubNameFromVeo(veoName) {
  if (!veoName) return '';
  
  // Remove common suffixes
  let name = veoName
    .replace(/\s+(GAA|gaa|Hurling|hurling|Camogie|camogie|GAC|gac)\s*$/i, '')
    .trim();
  
  return normalizeClubName(name);
}

/**
 * Load VEO clubs from CSV files
 */
async function loadVeoClubs() {
  const veoClubs = new Map(); // club_name -> { recordings, identifier }
  
  // Load Ireland CSV
  if (fs.existsSync(IRELAND_VEO_CSV)) {
    console.log(`   Loading from: ${IRELAND_VEO_CSV}`);
    await new Promise((resolve, reject) => {
      fs.createReadStream(IRELAND_VEO_CSV)
        .pipe(csv())
        .on('data', (row) => {
          const clubName = row['Club Name'];
          if (clubName && (clubName.includes('GAA') || clubName.includes('Hurling') || clubName.includes('Camogie'))) {
            const normalized = extractClubNameFromVeo(clubName);
            if (normalized) {
              veoClubs.set(normalized, {
                recordings: parseInt(row['Recordings']) || 0,
                identifier: row['Club Identifier'] || '',
                originalName: clubName
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }
  
  // Load Northern Ireland CSV
  if (fs.existsSync(NI_VEO_CSV)) {
    console.log(`   Loading from: ${NI_VEO_CSV}`);
    await new Promise((resolve, reject) => {
      fs.createReadStream(NI_VEO_CSV)
        .pipe(csv())
        .on('data', (row) => {
          const clubName = row['Club Name'];
          if (clubName && (clubName.includes('GAA') || clubName.includes('GAC') || clubName.includes('Hurling'))) {
            const normalized = extractClubNameFromVeo(clubName);
            if (normalized) {
              veoClubs.set(normalized, {
                recordings: parseInt(row['Recordings']) || 0,
                identifier: row['Club Identifier'] || '',
                originalName: clubName
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }
  
  return veoClubs;
}

/**
 * Manual mappings for known VEO clubs
 * Maps pitch finder club names to VEO club identifiers
 * Key is the normalized club name from pitch finder data
 */
const MANUAL_VEO_MAPPINGS = {
  // Ireland clubs
  'claregalway': { recordings: 134, identifier: 'claregalway-gaa', originalName: 'Claregalway GAA' },
  'st johns ballinteer': { recordings: 53, identifier: 'ballinteer-st-johns-gaa-club-dublin', originalName: 'Ballinteer St Johns GAA Club Dublin' },
  'ballinteer': { recordings: 53, identifier: 'ballinteer-st-johns-gaa-club-dublin', originalName: 'Ballinteer St Johns GAA Club Dublin' },
  'dublin': { recordings: 155, identifier: 'dublin-gaa', originalName: 'Dublin GAA' },
  'dublin camogie': { recordings: 36, identifier: 'dublin-camogie', originalName: 'Dublin Camogie' },
  'ballinagar': { recordings: 21, identifier: 'ballianagar-gaa-ireland', originalName: 'Ballianagar GAA Ireland' },
  'ballianagar': { recordings: 21, identifier: 'ballianagar-gaa-ireland', originalName: 'Ballianagar GAA Ireland' },
  // Northern Ireland clubs
  'derrylaughan kevin barry': { recordings: 179, identifier: 'derrylauglan-kevin-barrys-gac', originalName: "Derrylauglan Kevin Barry's" },
  'st mochuas derrynoose': { recordings: 40, identifier: 'derrynoose-st-mochuas-gac', originalName: 'Derrynoose GAC' },
};

/**
 * Match club from pitch finder data with VEO clubs
 */
function findVeoMatch(clubName, veoClubs) {
  if (!clubName) return null;
  
  const normalized = normalizeClubName(clubName);
  
  // Check manual mappings first (exact or very specific matches)
  for (const [key, data] of Object.entries(MANUAL_VEO_MAPPINGS)) {
    // Exact match
    if (normalized === key) {
      return data;
    }
    // For "st johns ballinteer" or "ballinteer" - must include both "st johns" and "ballinteer" or just "ballinteer"
    if (key === 'st johns ballinteer' || key === 'ballinteer') {
      if (normalized.includes('ballinteer')) {
        // Only match if it's specifically Ballinteer, not other St. John's clubs
        if (normalized.includes('ballinteer') && !normalized.includes('belfast') && 
            !normalized.includes('carraroe') && !normalized.includes('drumnaquoile')) {
          return data;
        }
      }
    }
    // For "ballinagar" or "ballianagar" - exact match or contains
    if (key === 'ballinagar' || key === 'ballianagar') {
      if (normalized.includes('ballinagar') || normalized.includes('ballianagar')) {
        return data;
      }
    }
    // For "claregalway" - must be exact or contain full word
    if (key === 'claregalway') {
      if (normalized === 'claregalway' || normalized.includes('claregalway')) {
        return data;
      }
    }
    // For "st mochuas derrynoose" - must include both
    if (key === 'st mochuas derrynoose') {
      if (normalized.includes('mochua') && normalized.includes('derrynoose')) {
        return data;
      }
    }
    // For "derrylaughan kevin barry" - must include both
    if (key === 'derrylaughan kevin barry') {
      if ((normalized.includes('derrylaughan') || normalized.includes('derrylauglan')) && 
          (normalized.includes('kevin') || normalized.includes('barry'))) {
        return data;
      }
    }
  }
  
  // Try exact match with VEO clubs
  if (veoClubs.has(normalized)) {
    return veoClubs.get(normalized);
  }
  
  // Special case: Dublin GAA - must be exact "dublin" (not "dublin something else")
  if (normalized === 'dublin') {
    return MANUAL_VEO_MAPPINGS['dublin'];
  }
  
  // Special case: Dublin Camogie - must include both words
  if (normalized.includes('dublin') && normalized.includes('camogie')) {
    return MANUAL_VEO_MAPPINGS['dublin camogie'];
  }
  
  // Special case: Galway GAA/Hurling - must be exact "galway" (not "claregalway")
  if (normalized === 'galway') {
    for (const [veoKey, veoData] of veoClubs.entries()) {
      if (veoKey === 'galway' || (veoKey.includes('galway') && !veoKey.includes('clare'))) {
        return veoData;
      }
    }
  }
  
  // Try word-by-word matching for multi-word names (more strict)
  for (const [veoKey, veoData] of veoClubs.entries()) {
    const normalizedWords = normalized.split(/\s+/).filter(w => w.length >= 3);
    const veoWords = veoKey.split(/\s+/).filter(w => w.length >= 3);
    
    if (normalizedWords.length > 0 && veoWords.length > 0) {
      // Count matching words
      const matchingWords = normalizedWords.filter(w => veoWords.includes(w));
      const totalWords = Math.min(normalizedWords.length, veoWords.length);
      
      // Require at least 50% word match and at least 2 words, or exact single word match
      if (matchingWords.length >= 2 && matchingWords.length >= totalWords * 0.5) {
        // Additional check: ensure no conflicting words
        const conflictingWords = ['clare', 'belfast', 'carraroe', 'drumnaquoile'];
        const hasConflict = conflictingWords.some(word => 
          normalized.includes(word) && !veoKey.includes(word)
        );
        if (!hasConflict) {
          return veoData;
        }
      }
    }
  }
  
  return null;
}

/**
 * Import clubs from JSON file
 */
async function importClubs() {
  try {
    console.log('📖 Loading pitch finder data...');
    const pitchFinderData = JSON.parse(fs.readFileSync(PITCH_FINDER_DATA, 'utf8'));
    console.log(`✅ Loaded ${pitchFinderData.length} clubs from JSON`);
    
    console.log('📖 Loading VEO clubs from CSV files...');
    console.log(`   Looking for CSV at: ${IRELAND_VEO_CSV}`);
    if (!fs.existsSync(IRELAND_VEO_CSV)) {
      console.log('⚠️  CSV files not found. VEO matching will be skipped.');
      console.log('   Expected path: CLANNAI/crm/veo/crm-clean/data/2-by-country/clubs_ireland.csv');
    }
    const veoClubs = await loadVeoClubs();
    console.log(`✅ Found ${veoClubs.size} GAA clubs using VEO`);
    
    console.log('🗄️  Clearing existing clubs...');
    await pool.query('TRUNCATE TABLE clubs CASCADE');
    
    console.log('📝 Importing clubs into database...');
    let imported = 0;
    let veoMatched = 0;
    
    for (const club of pitchFinderData) {
      const veoMatch = findVeoMatch(club.Club, veoClubs);
      const usesVeo = !!veoMatch;
      
      if (usesVeo) {
        veoMatched++;
      }
      
      await pool.query(
        `INSERT INTO clubs (
          club_name, pitch_name, code, latitude, longitude,
          province, country, division, county, directions,
          twitter, elevation, annual_rainfall, rain_days,
          uses_veo, veo_recordings, veo_club_identifier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          club.Club || '',
          club.Pitch || null,
          club.Code || null,
          club.Latitude || null,
          club.Longitude || null,
          club.Province || null,
          club.Country || null,
          club.Division || null,
          club.County || null,
          club.Directions || null,
          club.Twitter || null,
          club.Elevation || null,
          club.annual_rainfall || null,
          club.rain_days || null,
          usesVeo,
          veoMatch ? veoMatch.recordings : 0,
          veoMatch ? veoMatch.identifier : null
        ]
      );
      
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`   Imported ${imported}/${pitchFinderData.length} clubs...`);
      }
    }
    
    console.log('\n✅ Import complete!');
    console.log(`   Total clubs imported: ${imported}`);
    console.log(`   Clubs using VEO: ${veoMatched}`);
    console.log(`   Clubs not using VEO: ${imported - veoMatched}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error importing clubs:', error);
    process.exit(1);
  }
}

// Run import
importClubs();

