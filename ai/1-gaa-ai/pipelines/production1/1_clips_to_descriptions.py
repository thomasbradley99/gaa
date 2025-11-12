#!/usr/bin/env python3
"""
Stage 1: Analyze video clips WITH AUDIO - Full 41-event detection
Usage: python3 1_clips_to_descriptions.py --game southport-vs-chester
"""

import os
import json
import argparse
import google.generativeai as genai
from pathlib import Path
import time
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Parse arguments
parser = argparse.ArgumentParser(description='Generate descriptions from SILENT video clips')
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--output-suffix', default='', help='Output folder suffix (default: timestamp)')
parser.add_argument('--start-clip', type=int, help='Start clip number (e.g., 11 for clip_011m00s.mp4)')
parser.add_argument('--end-clip', type=int, help='End clip number (e.g., 15 for clip_015m00s.mp4, inclusive)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent  # production1/
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs" / "clips"  # CLIPS WITH AUDIO!

# Create timestamped output folder to prevent overwrites
if ARGS.output_suffix:
    output_folder = f"6-with-audio-{ARGS.output_suffix}"
else:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M")
    output_folder = f"6-with-audio-{timestamp}"

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Save output folder for subsequent stages
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
run_config.write_text(output_folder)

print(f"📁 Output folder: {output_folder}")
print(f"💾 Subsequent stages will use: {output_folder}")
print()

# Setup API
from dotenv import load_dotenv
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')

api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)
model = genai.GenerativeModel(
    'gemini-2.5-pro',
    generation_config={"temperature": 0, "top_p": 0.1}  # Deterministic output
)

# Load game profile (if exists)
GAME_PROFILE = None
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if profile_path.exists():
    with open(profile_path, 'r') as f:
        GAME_PROFILE = json.load(f)
    print(f"✅ Loaded game profile from {profile_path.name}")

    def resolve_assignment(profile: dict) -> str:
        assignment = profile.get('home_team_assignment', 'EDIT_ME')
        if assignment not in {'team_a', 'team_b'}:
            print("⚠️  WARNING: home_team_assignment not set in game_profile.json!")
            print("   Teams will be referenced by color, but assignment is unknown")
            return 'team_a'
        return assignment

    def defending_goal(attack_direction: str) -> str:
        if attack_direction == 'left-to-right':
            return 'left'
        if attack_direction == 'right-to-left':
            return 'right'
        return 'unknown'

    assignment = resolve_assignment(GAME_PROFILE)
    team_a = GAME_PROFILE['team_a']
    team_b = GAME_PROFILE['team_b']

    if assignment == 'team_a':
        HOME_TEAM = team_a
        AWAY_TEAM = team_b
    else:
        HOME_TEAM = team_b
        AWAY_TEAM = team_a

    print(f"   Home: {HOME_TEAM['jersey_color']} ({HOME_TEAM['keeper_color']} keeper)")
    print(f"   Away: {AWAY_TEAM['jersey_color']} ({AWAY_TEAM['keeper_color']} keeper)")
    print()
else:
    print(f"⚠️  No game profile found - using generic team descriptions")
    print(f"   Run: python3 0.5_calibrate_game.py --game {ARGS.game}")
    print()

def analyze_single_clip(clip_path: Path) -> dict:
    """Analyze a single clip (with audio) and return timestamp + description + usage stats"""
    try:
        # Extract timestamp from filename
        match = re.search(r'clip_(\d+)m(\d{2})s\.mp4', clip_path.name)
        if match:
            minutes = int(match.group(1))
            seconds = int(match.group(2))
            timestamp = minutes * 60 + seconds
        else:
            timestamp = 0
            
            
        print(f"🎬 Analyzing {timestamp}s: {clip_path.name} (WITH AUDIO)")
        
        # Build team context from profile
        if GAME_PROFILE:
            home_color = HOME_TEAM['jersey_color']
            home_keeper = HOME_TEAM['keeper_color']
            away_color = AWAY_TEAM['jersey_color']
            away_keeper = AWAY_TEAM['keeper_color']

            match_times = GAME_PROFILE['match_times']
            if timestamp < match_times['half_time']:
                current_half = "1st half"
                home_attacks = HOME_TEAM['attack_direction_1st_half']
                away_attacks = AWAY_TEAM['attack_direction_1st_half']
            else:
                current_half = "2nd half"
                home_attacks = HOME_TEAM['attack_direction_2nd_half']
                away_attacks = AWAY_TEAM['attack_direction_2nd_half']

            home_goal_side = defending_goal(home_attacks)
            away_goal_side = defending_goal(away_attacks)

            team_context = f"""CONTEXT: {current_half}.

TEAMS (refer to them ONLY by jersey color):
- {home_color} ({home_keeper} keeper) - attacking {home_attacks}, defend {home_goal_side} side goal
- {away_color} ({away_keeper} keeper) - attacking {away_attacks}, defend {away_goal_side} side goal"""
        else:
            team_context = "TEAMS: Identify teams by jersey colors"

        clip_start_time = f"{timestamp//60}:{timestamp%60:02d}"
        clip_end_ts = timestamp + 60
        clip_end_time = f"{clip_end_ts//60}:{clip_end_ts%60:02d}"
        example_mid_time = f"{(timestamp + 30)//60}:{(timestamp + 30)%60:02d}"

        prompt = f"""You are analyzing a GAA (Gaelic Athletic Association) match clip.

{team_context}

**CLIP TIMING:**
This clip shows {clip_start_time} to {clip_end_time}.

**YOUR TASK:**
Describe what happens using absolute game time (e.g., {clip_start_time}, {example_mid_time}).

What to describe:
- Possession changes (tackles, interceptions, who wins the ball)
- Shots at goal (points, goals, wides)
- Attacks and build-up play
- Kickouts (restarts after scores)
- Throw-ups (restarts from referee)
- Fouls and referee decisions
- Turnovers (possession changes)
- Scores: Points (over the bar) and Goals (into net) - BE VERY CAREFUL - only if you see ball clearly score AND celebrations/restart

**Important:**
- Use absolute timestamps like {clip_start_time} (NOT 0:05)
- Only describe what you're confident about
- Refer to teams ONLY by jersey color
- GAA scoring: Points (over crossbar) and Goals (into net)

**Example:**
{clip_start_time} - Blue goalkeeper takes kickout from goal area
{clip_start_time} - White player wins possession in midfield
{example_mid_time} - Blue intercepts pass and attacks
{clip_end_time} - Blue player scores a point over the bar

Just describe what happens:"""

        # Read video data
        with open(clip_path, 'rb') as f:
            video_data = f.read()
        
        # Send to Gemini
        response = model.generate_content([
            {"mime_type": "video/mp4", "data": video_data},
            prompt
        ])
        
        description = response.text.strip()
        
        # Extract usage metadata from response
        usage = {
            'prompt_tokens': response.usage_metadata.prompt_token_count,
            'output_tokens': response.usage_metadata.candidates_token_count,
            'total_tokens': response.usage_metadata.total_token_count,
        }
        
        print(f"✅ {timestamp}s: {description[:60]}...")
        print(f"   📊 Tokens: {usage['prompt_tokens']:,} in / {usage['output_tokens']:,} out / {usage['total_tokens']:,} total")
        
        return {
            'timestamp': timestamp,
            'clip_name': clip_path.name,
            'description': description,
            'usage': usage
        }
        
    except Exception as e:
        print(f"❌ Error analyzing {clip_path.name}: {str(e)}")
        return {
            'timestamp': timestamp,
            'clip_name': clip_path.name,
            'description': f"Error: {str(e)}",
            'usage': {'prompt_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}
        }

def analyze_clips():
    """Analyze clips WITH AUDIO for full 41-event detection"""
    output_file = OUTPUT_DIR / "1_observations.txt"  # Stage 1 outputs observations
    usage_file = OUTPUT_DIR / "usage_stats_stage1.json"
    
    # Get all clips with audio
    all_clips = sorted(INPUT_DIR.glob("*.mp4"))
    
    # Filter to only the canonical 60-second clip names (clip_XXXm00s.mp4)
    sixty_second_pattern = re.compile(r'^clip_\d{3}m00s\.mp4$')
    sixty_second_clips = [c for c in all_clips if sixty_second_pattern.match(c.name)]

    if len(sixty_second_clips) < len(all_clips):
        ignored = len(all_clips) - len(sixty_second_clips)
        print(f"⚠️  Ignoring {ignored} non-60-second clip(s); move them out of inputs/clips if needed")

    all_clips = sixty_second_clips
    
    # Filter by clip range if specified (for chunked processing)
    if ARGS.start_clip is not None and ARGS.end_clip is not None:
        clip_names = [f'clip_{i:03d}m00s.mp4' for i in range(ARGS.start_clip, ARGS.end_clip + 1)]
        all_clips = [c for c in all_clips if c.name in clip_names]
        print(f"🎯 Processing clips {ARGS.start_clip}-{ARGS.end_clip} ({len(all_clips)} clips)")
    
    if not all_clips:
        print(f"❌ No clips found in {INPUT_DIR}")
        print(f"Run 0_strip_audio.py first!")
        return
    
    print(f"📊 Found {len(all_clips)} clips (with audio)")
    print(f"🚀 Processing in parallel with 30 workers...")
    print(f"⏱️  Estimated time: 2-3 minutes")
    print(f"💰 Estimated cost: ~${len(all_clips) * 0.026:.2f} (Gemini 2.5 Pro)")
    print()
    
    results = []
    completed = 0
    total_usage = {
        'prompt_tokens': 0,
        'output_tokens': 0,
        'total_tokens': 0,
        'api_calls': 0
    }
    
    # Process all clips in parallel
    with ThreadPoolExecutor(max_workers=30) as executor:
        future_to_clip = {executor.submit(analyze_single_clip, clip): clip for clip in all_clips}
        
        for future in as_completed(future_to_clip):
            clip_path = future_to_clip[future]
            try:
                result = future.result()
                results.append(result)
                completed += 1
                
                # Aggregate usage
                total_usage['prompt_tokens'] += result['usage']['prompt_tokens']
                total_usage['output_tokens'] += result['usage']['output_tokens']
                total_usage['total_tokens'] += result['usage']['total_tokens']
                total_usage['api_calls'] += 1
                
                # Write progress file immediately
                with open(output_file, 'a') as f:
                    f.write(f"[{result['timestamp']}s] {result['clip_name']}: {result['description']}\n")
                
                if completed % 5 == 0:
                    print(f"📊 Progress: {completed}/{len(all_clips)} clips ({completed*100//len(all_clips)}%)")
                    
            except Exception as e:
                print(f"❌ Failed to process {clip_path.name}: {str(e)}")
    
    # Sort by timestamp and rewrite
    results.sort(key=lambda x: x['timestamp'])
    
    with open(output_file, 'w') as f:
        for result in results:
            f.write(f"[{result['timestamp']}s] {result['clip_name']}: {result['description']}\n")
    
    # Calculate costs with Gemini 2.5 Pro pricing (Paid Tier 1)
    # 200k threshold is PER API CALL, not total
    # Each clip is separate call with ~18k tokens, so always use lower tier
    # Input: $1.25/1M, Output: $10.00/1M
    input_cost = (total_usage['prompt_tokens'] / 1_000_000) * 1.25
    output_cost = (total_usage['output_tokens'] / 1_000_000) * 10.00
    total_cost = input_cost + output_cost
    
    # Save usage stats
    usage_stats = {
        'stage': 'stage_1_clip_descriptions',
        'model': 'gemini-2.5-pro',
        'test_type': 'audio_and_visual',
        'clips_analyzed': len(results),
        'api_calls': total_usage['api_calls'],
        'tokens': total_usage,
        'cost': {
            'input': round(input_cost, 4),
            'output': round(output_cost, 4),
            'total': round(total_cost, 4)
        },
        'per_clip_avg': {
            'prompt_tokens': total_usage['prompt_tokens'] // len(results) if results else 0,
            'output_tokens': total_usage['output_tokens'] // len(results) if results else 0,
            'total_tokens': total_usage['total_tokens'] // len(results) if results else 0,
            'cost': round(total_cost / len(results), 4) if results else 0
        }
    }
    
    with open(usage_file, 'w') as f:
        json.dump(usage_stats, f, indent=2)
    
    # Print summary
    print(f"\n{'='*70}")
    print(f"✅ AUDIO + VISUAL ANALYSIS COMPLETE!")
    print(f"{'='*70}")
    print(f"📊 Analyzed: {len(results)} clips (with audio)")
    print(f"💾 Saved to: {output_file}")
    print()
    print(f"📈 TOKEN USAGE:")
    print(f"   Input:  {total_usage['prompt_tokens']:,} tokens")
    print(f"   Output: {total_usage['output_tokens']:,} tokens")
    print(f"   Total:  {total_usage['total_tokens']:,} tokens")
    print(f"   API Calls: {total_usage['api_calls']}")
    print()
    print(f"💰 COST (Gemini 2.5 Pro):")
    print(f"   Input:  ${input_cost:.4f}")
    print(f"   Output: ${output_cost:.4f}")
    print(f"   Total:  ${total_cost:.4f}")
    print()
    print(f"📊 PER CLIP AVERAGE:")
    print(f"   {usage_stats['per_clip_avg']['prompt_tokens']:,} prompt tokens")
    print(f"   {usage_stats['per_clip_avg']['output_tokens']:,} output tokens")
    print(f"   ${usage_stats['per_clip_avg']['cost']:.4f} per clip")
    print()
    print(f"💾 Stage 1 costs: {usage_file.name}")
    print(f"\nNext: python3 2_create_coherent_narrative.py --game {ARGS.game}")

if __name__ == "__main__":
    print(f"🎬 STAGE 1: AUDIO + VISUAL OBSERVATIONS (41 Event Types)")
    print(f"Game: {ARGS.game}")
    print(f"Model: Gemini 2.5 Pro")
    print(f"Input: clips/ (WITH AUDIO)")
    print(f"Time Range: All available clips (CALIBRATION MODE)")
    print("=" * 70)
    analyze_clips()

