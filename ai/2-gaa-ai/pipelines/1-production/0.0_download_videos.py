#!/usr/bin/env python3
"""
Stage 0.0: Download Videos
Downloads match videos from URLs specified in inputs/video_source.json
"""

import sys
import os
import json
import argparse
from pathlib import Path
from urllib.parse import urlparse

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    import urllib.request

# Parse arguments
parser = argparse.ArgumentParser(description='Download videos from video_source.json')
parser.add_argument('--game', help='Game name (folder in games/). If omitted, processes all games.')
parser.add_argument('--dry-run', action='store_true', help='Validate configs without downloading')
parser.add_argument('--overwrite', action='store_true', help='Re-download even if file exists')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAMES_DIR = PROD_ROOT / "games"

def download_file(url, target_path, dry_run=False):
    """Download a file from URL to target path"""
    if target_path.exists() and not ARGS.overwrite:
        print(f"  ✓ Already exists: {target_path.name}")
        return True
    
    if dry_run:
        print(f"  [DRY RUN] Would download: {url}")
        print(f"            → {target_path}")
        return True
    
    print(f"  📥 Downloading: {url}")
    print(f"     → {target_path}")
    
    try:
        if HAS_REQUESTS:
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"\r     Progress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='', flush=True)
            
            print()  # New line after progress
        else:
            # Fallback to urllib
            urllib.request.urlretrieve(url, target_path)
        
        print(f"  ✅ Downloaded: {target_path.name}")
        return True
        
    except Exception as e:
        print(f"  ❌ Error downloading {url}: {e}")
        if target_path.exists():
            target_path.unlink()  # Remove partial file
        return False

def process_game(game_name):
    """Process a single game's video_source.json"""
    game_dir = GAMES_DIR / game_name
    config_path = game_dir / "inputs" / "video_source.json"
    
    if not config_path.exists():
        print(f"⚠️  {game_name}: No video_source.json found")
        return False
    
    print(f"\n🎮 Processing: {game_name}")
    print(f"   Config: {config_path}")
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ❌ Invalid JSON: {e}")
        return False
    
    game_title = config.get('title', game_name)
    downloads = config.get('downloads', [])
    
    if not downloads:
        print(f"  ⚠️  No downloads specified")
        return False
    
    print(f"   Title: {game_title}")
    print(f"   Downloads: {len(downloads)}")
    
    success_count = 0
    for item in downloads:
        label = item.get('label', 'unknown')
        url = item.get('url', '')
        target_name = item.get('target', f"{game_name}.mp4")
        
        if not url:
            print(f"  ⚠️  Skipping {label}: No URL provided")
            continue
        
        target_path = game_dir / "inputs" / target_name
        
        if download_file(url, target_path, dry_run=ARGS.dry_run):
            success_count += 1
    
    if success_count == len(downloads):
        print(f"  ✅ All downloads completed for {game_name}")
        return True
    else:
        print(f"  ⚠️  Completed {success_count}/{len(downloads)} downloads for {game_name}")
        return False

def main():
    """Main entry point"""
    if ARGS.dry_run:
        print("🔍 DRY RUN MODE - No files will be downloaded\n")
    
    if ARGS.game:
        # Process single game
        if not (GAMES_DIR / ARGS.game).exists():
            print(f"❌ Game directory not found: {ARGS.game}")
            sys.exit(1)
        process_game(ARGS.game)
    else:
        # Process all games
        print("📋 Processing all games in games/ directory\n")
        games = [d.name for d in GAMES_DIR.iterdir() if d.is_dir()]
        
        if not games:
            print("⚠️  No game directories found")
            sys.exit(1)
        
        success_count = 0
        for game_name in sorted(games):
            if process_game(game_name):
                success_count += 1
        
        print(f"\n📊 Summary: {success_count}/{len(games)} games processed successfully")

if __name__ == "__main__":
    main()

