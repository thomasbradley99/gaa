/**
 * Export clubs in Ireland that ARE using VEO to CSV file
 */

const { pool } = require('./utils/database');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const OUTPUT_FILE = path.join(__dirname, '../crm-data/veo/clubs_ireland_using_veo.csv');

async function exportClubsIrelandUsingVeo() {
  try {
    console.log('📊 Querying clubs in Ireland using VEO from database...');
    
    const result = await pool.query(
      `SELECT 
        club_name,
        pitch_name,
        latitude,
        longitude,
        province,
        country,
        division,
        county,
        directions,
        twitter,
        elevation,
        annual_rainfall,
        rain_days,
        uses_veo,
        veo_recordings,
        veo_club_identifier
      FROM clubs 
      WHERE uses_veo = true 
        AND country = 'Ireland'
      ORDER BY club_name ASC`
    );
    
    console.log(`✅ Found ${result.rows.length} clubs in Ireland using VEO`);
    
    if (result.rows.length === 0) {
      console.log('⚠️  No clubs found. Nothing to export.');
      await pool.end();
      return;
    }
    
    // Create CSV header
    const headers = [
      'Club Name',
      'Pitch Name',
      'Latitude',
      'Longitude',
      'Province',
      'Country',
      'Division',
      'County',
      'Directions',
      'Twitter',
      'Elevation',
      'Annual Rainfall',
      'Rain Days',
      'Uses VEO',
      'VEO Recordings',
      'VEO Club Identifier'
    ];
    
    // Create CSV rows
    const csvRows = [headers.join(',')];
    
    for (const club of result.rows) {
      const row = [
        escapeCSV(club.club_name || ''),
        escapeCSV(club.pitch_name || ''),
        club.latitude || '',
        club.longitude || '',
        escapeCSV(club.province || ''),
        escapeCSV(club.country || ''),
        escapeCSV(club.division || ''),
        escapeCSV(club.county || ''),
        escapeCSV(club.directions || ''),
        escapeCSV(club.twitter || ''),
        club.elevation || '',
        club.annual_rainfall || '',
        club.rain_days || '',
        club.uses_veo ? 'true' : 'false',
        club.veo_recordings || '0',
        escapeCSV(club.veo_club_identifier || '')
      ];
      csvRows.push(row.join(','));
    }
    
    // Write to file
    const csvContent = csvRows.join('\n');
    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf8');
    
    console.log(`\n✅ Export complete!`);
    console.log(`   File: ${OUTPUT_FILE}`);
    console.log(`   Total clubs: ${result.rows.length}`);
    console.log(`   File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error exporting clubs:', error);
    process.exit(1);
  }
}

/**
 * Escape CSV field values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Run export
exportClubsIrelandUsingVeo();

