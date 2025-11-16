#!/usr/bin/env python3
"""
Evaluate Stage 1 description quality
Checks if descriptions are capturing possession, location, and key events correctly

Usage: python3 1_evaluate_descriptions.py --game {game-name}
"""

import json
import argparse
import re
from pathlib import Path
from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True)
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game

# Auto-detect output folder
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
else:
    output_folder = "production2"

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OBSERVATIONS_FILE = OUTPUT_DIR / "1_observations.txt"

if not OBSERVATIONS_FILE.exists():
    print(f"❌ Observations file not found: {OBSERVATIONS_FILE}")
    exit(1)

# Load game profile for team colors
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if profile_path.exists():
    with open(profile_path, 'r') as f:
        GAME_PROFILE = json.load(f)
    team_a = GAME_PROFILE['team_a']
    team_b = GAME_PROFILE['team_b']
    assignment = GAME_PROFILE.get('home_team_assignment', 'team_a')
    HOME_TEAM = team_a if assignment == 'team_a' else team_b
    AWAY_TEAM = team_b if assignment == 'team_a' else team_a
    home_color = HOME_TEAM['jersey_color']
    away_color = AWAY_TEAM['jersey_color']
else:
    home_color = "White/Blue"
    away_color = "Red/White"

print("=" * 70)
print("STAGE 1 DESCRIPTION QUALITY EVALUATION")
print("=" * 70)
print(f"Game: {ARGS.game}")
print(f"Observations file: {OBSERVATIONS_FILE.name}")
print()

# Read observations
with open(OBSERVATIONS_FILE, 'r') as f:
    content = f.read()

# Parse clips
clip_pattern = re.compile(r'\[(\d+)s\]\s+clip_(\d+)m00s\.mp4:\s*(.*?)(?=\[\d+s\]|$)', re.DOTALL)
clips = []
for match in clip_pattern.finditer(content):
    timestamp = int(match.group(1))
    clip_num = int(match.group(2))
    description = match.group(3).strip()
    clips.append({
        'timestamp': timestamp,
        'clip_num': clip_num,
        'description': description
    })

print(f"📊 Found {len(clips)} clips")
print()

# Evaluate each clip
metrics = {
    'total_clips': len(clips),
    'has_possession': 0,
    'has_location': 0,
    'has_team_colors': 0,
    'has_kickouts': 0,
    'has_timestamps': 0,
    'mentions_both_teams': 0,
    'has_possession_changes': 0,
}

for clip in clips:
    desc = clip['description'].lower()
    
    # Check for possession mentions
    if any(word in desc for word in ['possession', 'has the ball', 'gains possession', 'wins the ball', 'catches the ball']):
        metrics['has_possession'] += 1
    
    # Check for location mentions
    if any(word in desc for word in ['left', 'right', 'midfield', 'attacking', 'defensive', 'third', 'side']):
        metrics['has_location'] += 1
    
    # Check for team color mentions
    if home_color.lower() in desc or away_color.lower() in desc:
        metrics['has_team_colors'] += 1
    
    # Check for kickout mentions
    if 'kickout' in desc:
        metrics['has_kickouts'] += 1
    
    # Check for timestamps
    if re.search(r'\d+:\d+', clip['description']):
        metrics['has_timestamps'] += 1
    
    # Check if both teams mentioned
    if home_color.lower() in desc and away_color.lower() in desc:
        metrics['mentions_both_teams'] += 1
    
    # Check for possession changes
    if any(word in desc for word in ['intercept', 'tackle', 'gains possession', 'wins the ball', 'possession changes']):
        metrics['has_possession_changes'] += 1

# Calculate percentages
print("=" * 70)
print("DESCRIPTION QUALITY METRICS")
print("=" * 70)
print(f"Total clips analyzed: {metrics['total_clips']}")
print()
print(f"Possession tracking:     {metrics['has_possession']:3d}/{metrics['total_clips']} ({metrics['has_possession']/metrics['total_clips']*100:.1f}%)")
print(f"Location mentions:      {metrics['has_location']:3d}/{metrics['total_clips']} ({metrics['has_location']/metrics['total_clips']*100:.1f}%)")
print(f"Team color usage:       {metrics['has_team_colors']:3d}/{metrics['total_clips']} ({metrics['has_team_colors']/metrics['total_clips']*100:.1f}%)")
print(f"Kickout detection:      {metrics['has_kickouts']:3d}/{metrics['total_clips']} ({metrics['has_kickouts']/metrics['total_clips']*100:.1f}%)")
print(f"Timestamp usage:         {metrics['has_timestamps']:3d}/{metrics['total_clips']} ({metrics['has_timestamps']/metrics['total_clips']*100:.1f}%)")
print(f"Both teams mentioned:   {metrics['mentions_both_teams']:3d}/{metrics['total_clips']} ({metrics['mentions_both_teams']/metrics['total_clips']*100:.1f}%)")
print(f"Possession changes:     {metrics['has_possession_changes']:3d}/{metrics['total_clips']} ({metrics['has_possession_changes']/metrics['total_clips']*100:.1f}%)")

# Sample clips with issues
print("\n" + "=" * 70)
print("SAMPLE DESCRIPTIONS")
print("=" * 70)

# Show first 3 clips
for i, clip in enumerate(clips[:3], 1):
    print(f"\n--- Clip {i} ({clip['timestamp']}s) ---")
    desc = clip['description']
    # Truncate if too long
    if len(desc) > 300:
        desc = desc[:300] + "..."
    print(desc)

# Find clips missing key elements
missing_possession = [c for c in clips if 'possession' not in c['description'].lower() and 'ball' not in c['description'].lower()]
missing_location = [c for c in clips if not any(w in c['description'].lower() for w in ['left', 'right', 'midfield', 'attacking', 'defensive'])]

if missing_possession:
    print(f"\n⚠️  {len(missing_possession)} clips missing possession mentions")
if missing_location:
    print(f"⚠️  {len(missing_location)} clips missing location mentions")

print("\n" + "=" * 70)
print("RECOMMENDATIONS")
print("=" * 70)

if metrics['has_possession'] / metrics['total_clips'] < 0.9:
    print("⚠️  Low possession tracking - consider emphasizing possession in prompt")
if metrics['has_location'] / metrics['total_clips'] < 0.9:
    print("⚠️  Low location mentions - consider emphasizing location tracking")
if metrics['has_team_colors'] / metrics['total_clips'] < 0.9:
    print("⚠️  Low team color usage - check if colors are being mentioned correctly")
if metrics['has_kickouts'] < 5:
    print("⚠️  Few kickout mentions - may need to emphasize kickout detection")

print("\n✅ Description quality evaluation complete!")

