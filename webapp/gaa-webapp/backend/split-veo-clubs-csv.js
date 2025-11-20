/**
 * Split veo_clubs_27k.csv into multiple files with 999 rows each
 * Keeps the original file intact
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../crm-data/veo/veo_clubs_27k.csv');
const OUTPUT_DIR = path.join(__dirname, '../crm-data/veo');
const ROWS_PER_FILE = 999;

async function splitCSVFile() {
  try {
    console.log('📖 Reading veo_clubs_27k.csv...');
    
    // Read the entire file
    const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = fileContent.split('\n');
    
    if (lines.length === 0) {
      console.log('⚠️  File is empty');
      return;
    }
    
    // First line is the header
    const header = lines[0];
    const dataLines = lines.slice(1).filter(line => line.trim() !== ''); // Remove empty lines
    
    console.log(`✅ File read successfully`);
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Header: ${header.substring(0, 50)}...`);
    console.log(`   Data rows: ${dataLines.length}`);
    
    // Calculate number of files needed
    const numFiles = Math.ceil(dataLines.length / ROWS_PER_FILE);
    console.log(`\n📝 Splitting into ${numFiles} files (${ROWS_PER_FILE} rows per file)...`);
    
    let fileCount = 0;
    let totalRowsWritten = 0;
    
    // Split into chunks
    for (let i = 0; i < dataLines.length; i += ROWS_PER_FILE) {
      fileCount++;
      const chunk = dataLines.slice(i, i + ROWS_PER_FILE);
      const outputFileName = `veo_clubs_27k_part${fileCount}.csv`;
      const outputPath = path.join(OUTPUT_DIR, outputFileName);
      
      // Create file with header + chunk
      const fileContent = [header, ...chunk].join('\n');
      fs.writeFileSync(outputPath, fileContent, 'utf8');
      
      totalRowsWritten += chunk.length;
      console.log(`   ✓ Created ${outputFileName} (${chunk.length} rows)`);
    }
    
    console.log(`\n✅ Split complete!`);
    console.log(`   Original file: ${path.basename(INPUT_FILE)} (unchanged)`);
    console.log(`   Files created: ${fileCount}`);
    console.log(`   Total rows written: ${totalRowsWritten}`);
    console.log(`   Rows per file: ${ROWS_PER_FILE}`);
    
  } catch (error) {
    console.error('❌ Error splitting file:', error);
    process.exit(1);
  }
}

// Run split
splitCSVFile();

