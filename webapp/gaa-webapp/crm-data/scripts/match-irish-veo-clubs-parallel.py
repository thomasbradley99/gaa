#!/usr/bin/env python3
"""
Match VEO clubs with Irish GAA clubs using Gemini API - Parallel Processing Version

This script:
1. Reads VEO club files (veo_clubs_27k_part*.csv)
2. Uses Gemini API to identify Irish GAA clubs (Gemini has knowledge of all GAA clubs)
3. Processes in parallel for speed
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
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'veo'
load_dotenv(SCRIPT_DIR / '.env')

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '1000'))  # 1000 clubs per API call
MAX_WORKERS = int(os.getenv('MAX_WORKERS', '50'))  # Fully parallel - high number for all batches
MAX_FILES = int(os.getenv('MAX_FILES', '999'))  # Process all files (999 = all)
START_FILE = int(os.getenv('START_FILE', '1'))  # Start from file number (1-indexed)
USE_REFERENCE_MATCHING = os.getenv('USE_REFERENCE_MATCHING', 'false').lower() == 'true'

# File paths
CLUBS_IRELAND_CSV = DATA_DIR / 'clubs_not_using_veo.csv'
VEO_CLUBS_PATTERN = DATA_DIR / 'veo_clubs_27k_part*.csv'
OUTPUT_CSV = DATA_DIR / 'irish_veo_clubs_matched.csv'

# Thread-safe lock for writing results
results_lock = Lock()
all_matches = []


def setup_gemini():
    """Setup Gemini API client - use Flash model for speed"""
    if not GEMINI_API_KEY:
        raise ValueError("❌ GEMINI_API_KEY not found in environment. Please set it in .env file")
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Prefer Flash model for speed, fallback to first available
    try:
        models = genai.list_models()
        available_models = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
        
        # Prefer Flash model for speed
        flash_models = [m for m in available_models if 'flash' in m.lower()]
        if flash_models:
            model_name = flash_models[0]
        else:
            model_name = available_models[0]
        
        model = genai.GenerativeModel(model_name)
        print(f"✅ Using model: {model_name} (optimized for speed)")
        return model
    except Exception as e:
        print(f"⚠️  Could not list models, using default: {e}")
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        print(f"✅ Using default: models/gemini-2.5-flash")
        return model


def load_irish_clubs() -> List[Dict]:
    """Load the reference list of Irish GAA clubs (optional, for validation)"""
    if not USE_REFERENCE_MATCHING:
        return []
    
    clubs = []
    if not CLUBS_IRELAND_CSV.exists():
        return []
    
    with open(CLUBS_IRELAND_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            club_name = row.get('Club Name', '').strip()
            if club_name:
                clubs.append({
                    'name': club_name,
                    'recordings': row.get('Recordings', row.get('VEO Recordings', '0')),
                    'identifier': row.get('Club Identifier', row.get('VEO Club Identifier', ''))
                })
    return clubs


def load_veo_clubs_files() -> List[Path]:
    """Find all VEO club part files"""
    veo_files = sorted(DATA_DIR.glob('veo_clubs_27k_part*.csv'))
    return veo_files


def load_veo_clubs_from_file(file_path: Path) -> List[Dict]:
    """Load all VEO clubs from a single file"""
    clubs = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            clubs.append({
                'name': row['Club Name'].strip(),
                'recordings': row.get('Recordings', '0'),
                'identifier': row.get('Club Identifier', '').strip()
            })
    return clubs


def create_gemini_prompt(veo_clubs_batch: List[Dict]) -> str:
    """Create prompt for Gemini API to identify Irish GAA clubs"""
    
    # Format VEO clubs batch for the prompt
    veo_clubs_text = "\n".join([
        f"- {club['name']} ({club['recordings']} recordings" + 
        (f", identifier: {club['identifier']})" if club.get('identifier') else ")")
        for club in veo_clubs_batch
    ])
    
    prompt = f"""Identify Irish GAA (Gaelic Athletic Association) clubs from this list of sports clubs.

Clubs to analyze:
{veo_clubs_text}

Identify Irish GAA clubs by looking for:
1. Clubs with "GAA" in the name or identifier (e.g., "adamstown-gaa-club")
2. Clubs with Irish place names (Dublin, Cork, Galway, Kerry, Wexford, etc.)
3. Clubs with Irish county or town names
4. Clubs matching known GAA club naming patterns

IMPORTANT: 
- If identifier contains "gaa" or "gaa-club", it's likely a GAA club
- Irish place names (even without "GAA") often indicate GAA clubs
- Be inclusive - include clubs with Irish place name characteristics

Exclude:
- Clearly non-GAA sports (soccer, rugby, basketball unless identifier suggests GAA)
- Generic names like "-", "_", "---"
- Non-Irish clubs (unless identifier suggests GAA)

Return ONLY Irish GAA clubs as JSON array:
[
  {{"club_name": "Club Name", "recordings": "123"}},
  {{"club_name": "Another Club", "recordings": "456"}}
]

If none are GAA clubs, return: []
"""
    return prompt


def call_gemini_api(model, prompt: str, batch_num: int, total_batches: int) -> Optional[List[Dict]]:
    """Call Gemini API and parse the response"""
    try:
        start_time = time.time()
        response = model.generate_content(prompt)
        elapsed = time.time() - start_time
        
        response_text = response.text.strip()
        
        # Extract JSON from markdown code blocks if present
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        # Parse JSON
        matches = json.loads(response_text)
        result = matches if isinstance(matches, list) else []
        
        print(f"  Batch {batch_num}/{total_batches}: Found {len(result)} GAA clubs ({elapsed:.1f}s)")
        return result
        
    except json.JSONDecodeError as e:
        print(f"  ⚠️  Batch {batch_num}: JSON parse error: {e}")
        print(f"     Response preview: {response_text[:200]}...")
        return []
    except Exception as e:
        print(f"  ❌ Batch {batch_num}: API error: {e}")
        return []


def process_batch(model, batch: List[Dict], batch_num: int, total_batches: int) -> List[Dict]:
    """Process a single batch of clubs"""
    prompt = create_gemini_prompt(batch)
    matches = call_gemini_api(model, prompt, batch_num, total_batches)
    
    if matches:
        # Thread-safe append
        with results_lock:
            all_matches.extend(matches)
    
    return matches


def process_veo_clubs_parallel(model, veo_clubs: List[Dict]) -> List[Dict]:
    """Process VEO clubs in parallel batches"""
    # Create batches
    batches = []
    for i in range(0, len(veo_clubs), BATCH_SIZE):
        batches.append(veo_clubs[i:i + BATCH_SIZE])
    
    total_batches = len(batches)
    print(f"\n📊 Processing {len(veo_clubs)} clubs in {total_batches} batches of ~{BATCH_SIZE}")
    print(f"🚀 Using {MAX_WORKERS} parallel workers\n")
    
    # Process batches in parallel
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all batches
        future_to_batch = {
            executor.submit(process_batch, model, batch, i+1, total_batches): i+1
            for i, batch in enumerate(batches)
        }
        
        # Process completed batches with progress bar
        for future in tqdm(as_completed(future_to_batch), total=total_batches, desc="Processing batches"):
            batch_num = future_to_batch[future]
            try:
                future.result()
            except Exception as e:
                print(f"  ❌ Batch {batch_num} failed: {e}")
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Total processing time: {elapsed:.1f}s ({elapsed/60:.1f} minutes)")
    print(f"📈 Average: {elapsed/total_batches:.2f}s per batch")
    
    return all_matches.copy()


def save_matches(matches: List[Dict], output_path: Path, append: bool = False):
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
    unique_matches.sort(key=lambda x: int(x.get('recordings', 0) or 0), reverse=True)
    
    # Write to CSV (append or overwrite)
    mode = 'a' if append and output_path.exists() else 'w'
    with open(output_path, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Club Name', 'Number of Videos'])
        if mode == 'w' or not append:
            writer.writeheader()
        for match in unique_matches:
            writer.writerow({
                'Club Name': match.get('club_name', ''),
                'Number of Videos': match.get('recordings', '0')
            })
    
    action = "Appended" if append else "Saved"
    print(f"\n✅ {action} {len(unique_matches)} unique matches to: {output_path}")


def main():
    """Main execution function"""
    print("=" * 60)
    print("🔍 VEO Clubs - Irish GAA Matching Tool (Parallel)")
    print("=" * 60)
    print()
    
    # Setup Gemini
    try:
        model = setup_gemini()
    except Exception as e:
        print(f"❌ Failed to setup Gemini: {e}")
        return
    
    # Load reference list (optional)
    irish_clubs = []
    if USE_REFERENCE_MATCHING:
        try:
            irish_clubs = load_irish_clubs()
            print(f"✅ Loaded {len(irish_clubs)} reference clubs for validation")
        except Exception as e:
            print(f"⚠️  Could not load reference clubs: {e}")
    
    # Find VEO club files
    all_veo_files = load_veo_clubs_files()
    if not all_veo_files:
        print("❌ No VEO club files found")
        return
    
    # Select files to process (start from START_FILE, process MAX_FILES)
    start_idx = START_FILE - 1  # Convert to 0-indexed
    end_idx = start_idx + MAX_FILES if MAX_FILES < 999 else len(all_veo_files)
    veo_files = all_veo_files[start_idx:end_idx]
    
    print(f"✅ Found {len(all_veo_files)} total files")
    print(f"📂 Processing files {START_FILE} to {min(end_idx, len(all_veo_files))} ({len(veo_files)} files)")
    
    # Load all VEO clubs
    print(f"\n📂 Loading all VEO clubs from {len(veo_files)} files...")
    veo_clubs = []
    for file_path in tqdm(veo_files, desc="Loading files"):
        clubs = load_veo_clubs_from_file(file_path)
        veo_clubs.extend(clubs)
    
    print(f"✅ Loaded {len(veo_clubs)} total VEO clubs")
    
    # Process with Gemini (parallel)
    matches = process_veo_clubs_parallel(model, veo_clubs)
    
    # Save results (append if not starting from file 1)
    append_mode = START_FILE > 1
    if matches:
        save_matches(matches, OUTPUT_CSV, append=append_mode)
        print(f"\n📊 Summary:")
        print(f"   Total VEO clubs analyzed: {len(veo_clubs)}")
        print(f"   Total matches found: {len(matches)}")
        unique_count = len(set(m.get('club_name', '') for m in matches))
        print(f"   Unique matches: {unique_count}")
    else:
        print("\n⚠️  No matches found")
    
    print("\n✅ Process complete!")


if __name__ == '__main__':
    main()

