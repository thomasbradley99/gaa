#!/usr/bin/env python3
"""
Match VEO clubs with Irish GAA clubs using Gemini API

This script:
1. Loads the reference list of Irish GAA clubs (clubs_ireland.csv)
2. Reads VEO club files (veo_clubs_27k_part*.csv)
3. Uses Gemini API to identify which VEO clubs are in the GAA list
4. Outputs matches to a CSV file with club name and number of videos
"""

import os
import csv
import json
import sys
from pathlib import Path
from typing import List, Dict, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from tqdm import tqdm
import time

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'veo'
load_dotenv(SCRIPT_DIR / '.env')

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '50'))  # Number of clubs to send to Gemini at once
TEST_MODE = False  # Set to False to process all files
TEST_LIMIT = 1000  # Number of clubs to process in test mode (entire first file)

# File paths
CLUBS_IRELAND_CSV = DATA_DIR / 'clubs_not_using_veo.csv'  # Using clubs_not_using_veo.csv as reference
VEO_CLUBS_PATTERN = DATA_DIR / 'veo_clubs_27k_part*.csv'
OUTPUT_CSV = DATA_DIR / 'irish_veo_clubs_matched.csv'


def setup_gemini():
    """Setup Gemini API client"""
    if not GEMINI_API_KEY:
        raise ValueError("❌ GEMINI_API_KEY not found in environment. Please set it in .env file")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Try to list available models first to find the right one
    try:
        models = genai.list_models()
        available_models = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
        print(f"📋 Available models: {available_models[:5]}...")  # Show first 5
        
        # Use the first available model that supports generateContent
        if available_models:
            model_name = available_models[0]  # Use first available model
            model = genai.GenerativeModel(model_name)
            print(f"✅ Gemini API configured (model: {model_name})")
            return model
        else:
            # Fallback to configured model
            model = genai.GenerativeModel(GEMINI_MODEL)
            print(f"✅ Gemini API configured (model: {GEMINI_MODEL})")
            return model
    except Exception as e:
        print(f"⚠️  Could not list models, using default: {e}")
        model = genai.GenerativeModel('gemini-pro')
        print(f"✅ Gemini API configured (model: gemini-pro)")
        return model


def load_irish_clubs() -> List[Dict]:
    """Load the reference list of Irish GAA clubs"""
    clubs = []
    with open(CLUBS_IRELAND_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Handle both clubs_ireland.csv and clubs_not_using_veo.csv structures
            club_name = row.get('Club Name', '').strip()
            if not club_name:
                continue
            clubs.append({
                'name': club_name,
                'recordings': row.get('Recordings', row.get('VEO Recordings', '0')),
                'identifier': row.get('Club Identifier', row.get('VEO Club Identifier', ''))
            })
    print(f"✅ Loaded {len(clubs)} Irish GAA clubs from reference list")
    return clubs


def load_veo_clubs_files() -> List[Path]:
    """Find all VEO club part files"""
    veo_files = sorted(DATA_DIR.glob('veo_clubs_27k_part*.csv'))
    print(f"✅ Found {len(veo_files)} VEO club files")
    return veo_files


def load_veo_clubs_from_file(file_path: Path, limit: Optional[int] = None) -> List[Dict]:
    """Load VEO clubs from a single file"""
    clubs = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break
            clubs.append({
                'name': row['Club Name'].strip(),
                'recordings': row.get('Recordings', '0'),
                'identifier': row.get('Club Identifier', '').strip()
            })
    return clubs


def create_gemini_prompt(veo_clubs_batch: List[Dict]) -> str:
    """Create prompt for Gemini API to identify Irish GAA clubs"""
    
    # Format VEO clubs batch for the prompt, including identifier if available
    veo_clubs_text = "\n".join([
        f"- {club['name']} ({club['recordings']} recordings" + 
        (f", identifier: {club['identifier']})" if club.get('identifier') else ")")
        for club in veo_clubs_batch
    ])
    
    prompt = f"""You are analyzing a list of sports clubs to identify Irish GAA (Gaelic Athletic Association) clubs.

Here are the clubs to analyze:
{veo_clubs_text}

Identify Irish GAA clubs by looking for:
1. Clubs with "GAA" in the name or identifier (e.g., "adamstown-gaa-club")
2. Clubs with Irish place names (Dublin, Cork, Galway, Kerry, Wexford, etc.)
3. Clubs with Irish county names or town names
4. Clubs that match known GAA club naming patterns

IMPORTANT: 
- If a club's identifier contains "gaa" or "gaa-club", it is likely a GAA club
- Irish place names (even without "GAA" in the name) can indicate GAA clubs
- Be inclusive - if unsure but it has Irish place name characteristics, include it

Exclude:
- Clearly non-GAA clubs (soccer, rugby, basketball, etc. unless they have GAA identifiers)
- Generic names like "-", "_", "---", etc.
- Non-Irish clubs (unless identifier suggests GAA)

Return ONLY the clubs that are Irish GAA clubs. For each match, return:
- The exact club name as it appears in the input list
- The number of recordings

Format your response as JSON array:
[
  {{"club_name": "Club Name", "recordings": "123"}},
  {{"club_name": "Another Club", "recordings": "456"}}
]

If no clubs are Irish GAA clubs, return an empty array: []
"""
    return prompt


def call_gemini_api(model, prompt: str) -> Optional[List[Dict]]:
    """Call Gemini API and parse the response"""
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Debug: Show first 300 chars of response
        print(f"   📝 Gemini response (first 300 chars): {response_text[:300]}...")
        
        # Try to extract JSON from the response
        # Sometimes Gemini wraps JSON in markdown code blocks
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        # Parse JSON
        matches = json.loads(response_text)
        if matches:
            print(f"   ✅ Found {len(matches)} matches in response")
        return matches if isinstance(matches, list) else []
        
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parse error: {e}")
        print(f"   Response: {response_text[:500]}...")
        return []
    except Exception as e:
        print(f"❌ Gemini API error: {e}")
        return []


def normalize_name(name: str) -> str:
    """Normalize club name for matching"""
    if not name:
        return ""
    # Remove common suffixes and normalize
    name = name.lower().strip()
    name = name.replace('gaa', '').replace('club', '').replace('fc', '')
    name = name.replace('.', '').replace("'", '').replace('-', ' ').replace('  ', ' ')
    return name.strip()

def match_against_reference(gemini_matches: List[Dict], irish_clubs: List[Dict]) -> List[Dict]:
    """Match Gemini-identified clubs against the reference list"""
    # Create normalized reference set
    irish_clubs_normalized = {}
    for club in irish_clubs:
        normalized = normalize_name(club['name'])
        if normalized:
            irish_clubs_normalized[normalized] = club['name']
    
    matched = []
    for gemini_match in gemini_matches:
        club_name = gemini_match.get('club_name', '').strip()
        if not club_name:
            continue
        
        normalized_veo = normalize_name(club_name)
        
        # Check for match in reference list
        if normalized_veo in irish_clubs_normalized:
            matched.append({
                'club_name': club_name,
                'recordings': gemini_match.get('recordings', '0')
            })
            print(f"   ✅ Matched: {club_name} ({gemini_match.get('recordings', '0')} videos)")
        else:
            # Try fuzzy matching - check if any part of the name matches
            for ref_normalized, ref_original in irish_clubs_normalized.items():
                if normalized_veo in ref_normalized or ref_normalized in normalized_veo:
                    matched.append({
                        'club_name': club_name,
                        'recordings': gemini_match.get('recordings', '0')
                    })
                    print(f"   ✅ Matched (fuzzy): {club_name} -> {ref_original} ({gemini_match.get('recordings', '0')} videos)")
                    break
    
    return matched

def process_veo_clubs(model, veo_clubs: List[Dict], irish_clubs: List[Dict]) -> List[Dict]:
    """Process VEO clubs in batches using Gemini API"""
    all_matches = []
    
    # Process in batches
    total_batches = (len(veo_clubs) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"\n📊 Processing {len(veo_clubs)} VEO clubs in {total_batches} batches...")
    
    for i in range(0, len(veo_clubs), BATCH_SIZE):
        batch = veo_clubs[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        
        print(f"\n🔄 Processing batch {batch_num}/{total_batches} ({len(batch)} clubs)...")
        
        # Create prompt (Gemini identifies Irish GAA clubs, then we match against reference)
        prompt = create_gemini_prompt(batch)
        
        # Call Gemini API
        gemini_matches = call_gemini_api(model, prompt)
        
        if gemini_matches:
            print(f"   📋 Gemini identified {len(gemini_matches)} Irish GAA clubs")
            for gm in gemini_matches:
                print(f"      - {gm.get('club_name', 'Unknown')} ({gm.get('recordings', '0')} videos)")
            # Match against reference list
            batch_matches = match_against_reference(gemini_matches, irish_clubs)
            if batch_matches:
                all_matches.extend(batch_matches)
            else:
                print(f"   ⚠️  None matched against reference list (these clubs may not be in clubs_ireland.csv)")
        else:
            print(f"   ⚠️  No Irish GAA clubs identified in this batch")
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
    
    return all_matches


def save_matches(matches: List[Dict], output_path: Path):
    """Save matched clubs to CSV file"""
    if not matches:
        print("⚠️  No matches to save")
        return
    
    # Remove duplicates based on club name
    seen = set()
    unique_matches = []
    for match in matches:
        club_name = match.get('club_name', '').strip()
        if club_name and club_name not in seen:
            seen.add(club_name)
            unique_matches.append(match)
    
    # Sort by recordings (descending)
    unique_matches.sort(key=lambda x: int(x.get('recordings', 0)), reverse=True)
    
    # Write to CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Club Name', 'Number of Videos'])
        writer.writeheader()
        for match in unique_matches:
            writer.writerow({
                'Club Name': match.get('club_name', ''),
                'Number of Videos': match.get('recordings', '0')
            })
    
    print(f"\n✅ Saved {len(unique_matches)} unique matches to: {output_path}")


def main():
    """Main execution function"""
    print("=" * 60)
    print("🔍 VEO Clubs - Irish GAA Matching Tool")
    print("=" * 60)
    print()
    
    # Setup Gemini
    try:
        model = setup_gemini()
    except Exception as e:
        print(f"❌ Failed to setup Gemini: {e}")
        return
    
    # Load reference list
    try:
        irish_clubs = load_irish_clubs()
    except Exception as e:
        print(f"❌ Failed to load Irish clubs: {e}")
        return
    
    # Find VEO club files
    veo_files = load_veo_clubs_files()
    if not veo_files:
        print("❌ No VEO club files found")
        return
    
    # Load VEO clubs (test mode: just first file with limit)
    if TEST_MODE:
        print(f"\n🧪 TEST MODE: Processing first file with limit of {TEST_LIMIT} clubs")
        veo_clubs = load_veo_clubs_from_file(veo_files[0], limit=TEST_LIMIT)
    else:
        print(f"\n📂 Loading all VEO clubs from {len(veo_files)} files...")
        veo_clubs = []
        for file_path in tqdm(veo_files, desc="Loading files"):
            clubs = load_veo_clubs_from_file(file_path)
            veo_clubs.extend(clubs)
    
    print(f"✅ Loaded {len(veo_clubs)} VEO clubs to analyze")
    
    # Process with Gemini
    matches = process_veo_clubs(model, veo_clubs, irish_clubs)
    
    # Save results
    if matches:
        save_matches(matches, OUTPUT_CSV)
        print(f"\n📊 Summary:")
        print(f"   Total VEO clubs analyzed: {len(veo_clubs)}")
        print(f"   Matches found: {len(matches)}")
        print(f"   Unique matches: {len(set(m.get('club_name', '') for m in matches))}")
    else:
        print("\n⚠️  No matches found")
    
    print("\n✅ Process complete!")


if __name__ == '__main__':
    main()

