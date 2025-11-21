#!/usr/bin/env python3
"""
Stage 1: Analyze Overlapping Clips (30s content + 5s overlap)

NEW: Clips are 40s long with 5s before/after for context
Focus on describing the MIDDLE 30 seconds
"""

import os
import json
import re
import time
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import google.generativeai as genai
from dotenv import load_dotenv

# Load environment
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--start-clip', type=int, help='Start clip minute (e.g., 11 for 11:00-11:30)')
parser.add_argument('--end-clip', type=int, help='End clip minute (inclusive)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs" / "clips-v2"  # 30s clips with 5s overlap
SCHEMA_DIR = PROD_ROOT / "schemas"

# Clip configuration (matches Stage 0 settings)
OVERLAP = 5  # 5 seconds of overlap on each side

# Create timestamped output folder
timestamp = datetime.now().strftime("%Y%m%d-%H%M")
output_folder = f"6-with-audio-{timestamp}"
OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Save output folder name for subsequent stages
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
run_config.write_text(output_folder)

print(f"📁 Output folder: {output_folder}")
print(f"💾 Subsequent stages will use: {output_folder}\n")

# Configure Gemini
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Deterministic model
model = genai.GenerativeModel(
    'gemini-2.5-pro',
    generation_config={"temperature": 0, "top_p": 0.1}
)

# Load game profile (if exists)
GAME_PROFILE = None
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if profile_path.exists():
    with open(profile_path, 'r') as f:
        GAME_PROFILE = json.load(f)
    print(f"✅ Loaded game profile from {profile_path.name}")
    
    # Extract team info
    home_assignment = GAME_PROFILE.get('home_team_assignment', 'EDIT_ME')
    if home_assignment == 'EDIT_ME':
        print(f"⚠️  WARNING: home_team_assignment not set!")
    
    team_a = GAME_PROFILE['team_a']
    team_b = GAME_PROFILE['team_b']
    
    if home_assignment == 'team_a':
        HOME_TEAM = team_a
        AWAY_TEAM = team_b
    else:
        HOME_TEAM = team_b
        AWAY_TEAM = team_a
    
    print(f"   Home: {HOME_TEAM['jersey_color']} ({HOME_TEAM['keeper_color']} keeper)")
    print(f"   Away: {AWAY_TEAM['jersey_color']} ({AWAY_TEAM['keeper_color']} keeper)")
    print()
else:
    print(f"⚠️  No game profile - using generic descriptions")
    print(f"   Run: python3 0.5_calibrate_game.py --game {ARGS.game}\n")
    HOME_TEAM = None
    AWAY_TEAM = None

def parse_clip_name(clip_name):
    """
    Parse new clip format: clip_011m00s-011m30s.mp4
    Returns: (focus_start_seconds, focus_end_seconds)
    """
    match = re.search(r'clip_(\d+)m(\d+)s-(\d+)m(\d+)s\.mp4', clip_name)
    if match:
        start_min = int(match.group(1))
        start_sec = int(match.group(2))
        end_min = int(match.group(3))
        end_sec = int(match.group(4))
        
        focus_start = start_min * 60 + start_sec
        focus_end = end_min * 60 + end_sec
        
        return focus_start, focus_end
    return None, None

def analyze_clip(clip_path):
    """Analyze a single clip with AI"""
    try:
        focus_start, focus_end = parse_clip_name(clip_path.name)
        if focus_start is None:
            return {
                'clip_name': clip_path.name,
                'description': "Error: Could not parse clip name",
                'usage': {'prompt_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}
            }
        
        # Build team context from profile
        if GAME_PROFILE:
            home_color = HOME_TEAM['jersey_color']
            home_keeper = HOME_TEAM['keeper_color']
            away_color = AWAY_TEAM['jersey_color']
            away_keeper = AWAY_TEAM['keeper_color']
            
            # Determine which half
            match_times = GAME_PROFILE['match_times']
            if focus_start < match_times['half_time']:
                current_half = "1st half"
                home_attacks = HOME_TEAM['attack_direction_1st_half']
                away_attacks = AWAY_TEAM['attack_direction_1st_half']
            else:
                current_half = "2nd half"
                home_attacks = HOME_TEAM['attack_direction_2nd_half']
                away_attacks = AWAY_TEAM['attack_direction_2nd_half']
            
            # Generate minimal spatial context
            if home_attacks == "right-to-left":
                home_goal_side = "left"
                away_goal_side = "right"
            else:  # left-to-right
                home_goal_side = "right"
                away_goal_side = "left"
            
            # Minimal team context with spatial awareness
            team_context = f"""CONTEXT: {current_half}.

TEAMS (refer to them ONLY by jersey color):
- {home_color} jerseys ({home_keeper} keeper) - attacking {home_attacks}, defend {home_goal_side} side goal
- {away_color} jerseys ({away_keeper} keeper) - attacking {away_attacks}, defend {away_goal_side} side goal"""
        else:
            team_context = "TEAMS: Identify teams by jersey colors"
        
        # Calculate absolute times for this clip
        clip_start_abs = focus_start - OVERLAP  # Actual clip start (5s before focus)
        clip_end_abs = focus_end + OVERLAP      # Actual clip end (5s after focus)
        
        # Format example times for prompt
        focus_start_time = f"{focus_start//60}:{focus_start%60:02d}"
        focus_end_time = f"{focus_end//60}:{focus_end%60:02d}"
        clip_start_time = f"{clip_start_abs//60}:{clip_start_abs%60:02d}"
        clip_end_time = f"{clip_end_abs//60}:{clip_end_abs%60:02d}"
        example_mid_time = f"{(focus_start+15)//60}:{(focus_start+15)%60:02d}"
        
        # Optimized descriptive prompt (45.7% F1 proven)
        prompt = f"""You are analyzing a football match clip.

{team_context}

**CLIP TIMING:**
This clip shows {clip_start_time} to {clip_end_time}.

**YOUR TASK:**
Describe what happens using absolute game time (e.g., {focus_start_time}, {example_mid_time}).

What to describe:
- Possession changes (tackles, interceptions, who wins the ball)
- Shots, crosses, dangerous passes
- Set pieces (throw-ins, corners, free kicks, goal kicks)
- Referee whistles, fouls, cards
- Goals and celebrations (BE VERY CAREFUL - only if you see ball clearly cross goal line AND celebrations/restart)

**Important:**
- Use absolute timestamps like {focus_start_time} (NOT 0:05)
- Only describe what you're confident about
- Refer to teams ONLY by jersey color

**Example:**
{clip_start_time} - Blue goalkeeper kicks ball long downfield
{focus_start_time} - White player wins header in midfield
{example_mid_time} - Blue intercepts pass near right side goal
{focus_end_time} - Ball goes out for throw-in

Just describe what happens:"""

        # Read video
        with open(clip_path, 'rb') as f:
            video_data = f.read()
        
        # Send to Gemini
        response = model.generate_content([
            {"mime_type": "video/mp4", "data": video_data},
            prompt
        ])
        
        description = response.text.strip()
        
        # Extract usage
        usage = {
            'prompt_tokens': response.usage_metadata.prompt_token_count,
            'output_tokens': response.usage_metadata.candidates_token_count,
            'total_tokens': response.usage_metadata.total_token_count,
        }
        
        # Calculate actual clip times (with overlap)
        clip_start_abs = focus_start - OVERLAP
        clip_end_abs = focus_end + OVERLAP
        
        print(f"✅ {clip_start_abs}s-{clip_end_abs}s: {description[:60]}...")
        print(f"   📊 Tokens: {usage['prompt_tokens']:,} in / {usage['output_tokens']:,} out")
        
        return {
            'clip_start': clip_start_abs,
            'clip_end': clip_end_abs,
            'focus_start': focus_start,
            'focus_end': focus_end,
            'clip_name': clip_path.name,
            'description': description,
            'usage': usage
        }
        
    except Exception as e:
        print(f"❌ Error analyzing {clip_path.name}: {str(e)}")
        clip_start_abs = (focus_start - OVERLAP) if focus_start else 0
        clip_end_abs = (focus_end + OVERLAP) if focus_end else 0
        return {
            'clip_start': clip_start_abs,
            'clip_end': clip_end_abs,
            'focus_start': focus_start if focus_start else 0,
            'focus_end': focus_end if focus_end else 0,
            'clip_name': clip_path.name,
            'description': f"Error: {str(e)}",
            'usage': {'prompt_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}
        }

def analyze_clips():
    """Analyze all clips"""
    output_file = OUTPUT_DIR / "1_observations.txt"
    usage_file = OUTPUT_DIR / "usage_stats_stage1.json"
    
    # Get clips (new format)
    all_clips = sorted(INPUT_DIR.glob("clip_*m*s-*m*s.mp4"))
    
    # Filter by range if specified
    if ARGS.start_clip is not None and ARGS.end_clip is not None:
        filtered = []
        for clip in all_clips:
            focus_start, _ = parse_clip_name(clip.name)
            clip_minute = focus_start // 60 if focus_start else 0
            if ARGS.start_clip <= clip_minute <= ARGS.end_clip:
                filtered.append(clip)
        all_clips = filtered
        print(f"🎯 Processing clips {ARGS.start_clip}:00-{ARGS.end_clip}:30 ({len(all_clips)} clips)")
    
    if not all_clips:
        print(f"❌ No clips found in {INPUT_DIR}")
        return
    
    print(f"📊 Found {len(all_clips)} clips (30s content + 10s overlap)")
    print(f"🚀 Processing in parallel with 30 workers...")
    print(f"⏱️  Estimated time: 2-3 minutes")
    print(f"💰 Estimated cost: ~${len(all_clips) * 0.026:.2f} (Gemini 2.5 Pro)")
    print()
    
    # Process in parallel
    results = []
    with ThreadPoolExecutor(max_workers=30) as executor:
        futures = [executor.submit(analyze_clip, clip) for clip in all_clips]
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            if i % 5 == 0:
                print(f"📊 Progress: {i}/{len(all_clips)} clips ({i*100//len(all_clips)}%)")
    
    # Sort by timestamp
    results.sort(key=lambda x: x['focus_start'])
    
    # Save observations
    with open(output_file, 'w') as f:
        for result in results:
            f.write(f"[{result['clip_start']}s-{result['clip_end']}s] {result['clip_name']}: {result['description']}\n")
    
    # Save sample prompt for reference (using first clip as example)
    if results:
        prompt_file = OUTPUT_DIR / "prompt_stage1.txt"
        first_result = results[0]
        with open(prompt_file, 'w') as f:
            f.write("=" * 100 + "\n")
            f.write("STAGE 1: CLIP DESCRIPTIONS - PROMPT USED\n")
            f.write("=" * 100 + "\n\n")
            f.write("MODEL: Gemini 2.5 Pro\n")
            f.write("APPROACH: Flow-based descriptive observations\n")
            f.write(f"CLIP FORMAT: 30s content + 5s overlap (40s total)\n\n")
            f.write("=" * 100 + "\n")
            f.write("PROMPT TEMPLATE:\n")
            f.write("=" * 100 + "\n\n")
            f.write("[Note: This is an example using the first clip's context]\n\n")
            # Reconstruct the prompt (simplified - just show the structure)
            f.write("You are observing a football match clip. Your descriptions will be synthesized with other clips into a coherent narrative by another AI.\n\n")
            if HOME_TEAM:
                home_color = HOME_TEAM['jersey_color']
                away_color = AWAY_TEAM['jersey_color']
                home_keeper = HOME_TEAM['keeper_color']
                away_keeper = AWAY_TEAM['keeper_color']
                home_attacks = HOME_TEAM['attack_direction_1st_half']
                away_attacks = AWAY_TEAM['attack_direction_1st_half']
                
                f.write(f"CONTEXT: 1st Half\n\n")
                f.write(f"TEAMS (refer to them ONLY by jersey color):\n")
                f.write(f"- {home_color} ({home_keeper} keeper) - attacking {home_attacks}\n")
                f.write(f"- {away_color} ({away_keeper} keeper) - attacking {away_attacks}\n\n")
                f.write(f"SPATIAL REASONING & FIELD POSITION included...\n\n")
            
            f.write("**CLIP TIMING:**\n")
            f.write("This clip covers: [start_time] to [end_time]\n\n")
            f.write("**YOUR TASK:**\n")
            f.write("Describe the flow of play - who has the ball, where are they, what are they doing with it.\n\n")
            f.write("**Focus on:**\n")
            f.write("- Who has possession and where on the pitch\n")
            f.write("- What they do with the ball (pass, dribble, shoot, cross)\n")
            f.write("- When possession changes and how (tackle, interception, save)\n")
            f.write("- The flow of attack and defense\n")
            f.write("- Any notable actions (shots, dangerous passes, clearances)\n\n")
            f.write("**Keep it simple:**\n")
            f.write("- One line per observation\n")
            f.write("- Only describe what you're certain about\n")
            f.write("- Use team jersey colors (not names)\n")
            f.write("- Use absolute timestamps\n\n")
            f.write("**CRITICAL - Goals are extremely rare:**\n")
            f.write("Only describe a goal if you see ALL THREE:\n")
            f.write("1. Ball clearly crosses goal line\n")
            f.write("2. Celebrations\n")
            f.write("3. Teams return to center for kickoff\n\n")
            f.write("See full implementation in pipelines/production2/1_clips_to_descriptions.py\n")
    
    # Calculate totals
    total_prompt = sum(r['usage']['prompt_tokens'] for r in results)
    total_output = sum(r['usage']['output_tokens'] for r in results)
    total_tokens = sum(r['usage']['total_tokens'] for r in results)
    
    # Calculate cost (Gemini 2.5 Pro pricing)
    input_cost = 0.0
    output_cost = 0.0
    
    for r in results:
        prompt_tokens = r['usage']['prompt_tokens']
        output_tokens = r['usage']['output_tokens']
        
        if prompt_tokens > 200_000:
            input_cost += (prompt_tokens / 1_000_000) * 2.50
            output_cost += (output_tokens / 1_000_000) * 15.00
        else:
            input_cost += (prompt_tokens / 1_000_000) * 1.25
            output_cost += (output_tokens / 1_000_000) * 10.00
    
    total_cost = input_cost + output_cost
    
    # Save usage stats
    usage_stats = {
        'stage': 'stage_1_clip_descriptions',
        'model': 'gemini-2.5-pro',
        'test_type': 'audio_and_visual',
        'clip_format': '30s_content_with_5s_overlap',
        'clips_analyzed': len(results),
        'api_calls': len(results),
        'tokens': {
            'prompt_tokens': total_prompt,
            'output_tokens': total_output,
            'total_tokens': total_tokens,
            'api_calls': len(results)
        },
        'cost': {
            'input': round(input_cost, 4),
            'output': round(output_cost, 4),
            'total': round(total_cost, 4)
        },
        'per_clip_avg': {
            'prompt_tokens': total_prompt // len(results) if results else 0,
            'output_tokens': total_output // len(results) if results else 0,
            'total_tokens': total_tokens // len(results) if results else 0,
            'cost': round(total_cost / len(results), 4) if results else 0
        }
    }
    
    with open(usage_file, 'w') as f:
        json.dump(usage_stats, f, indent=2)
    
    print("=" * 70)
    print("✅ AUDIO + VISUAL ANALYSIS COMPLETE!")
    print("=" * 70)
    print(f"📊 Analyzed: {len(results)} clips (30s content + 5s overlap)")
    print(f"💾 Saved to: {output_file}")
    print(f"\n📈 TOKEN USAGE:")
    print(f"   Input:  {total_prompt:,} tokens")
    print(f"   Output: {total_output:,} tokens")
    print(f"   Total:  {total_tokens:,} tokens")
    print(f"   API Calls: {len(results)}")
    print(f"\n💰 COST (Gemini 2.5 Pro):")
    print(f"   Input:  ${input_cost:.4f}")
    print(f"   Output: ${output_cost:.4f}")
    print(f"   Total:  ${total_cost:.4f}")
    print(f"\n📊 PER CLIP AVERAGE:")
    print(f"   {usage_stats['per_clip_avg']['prompt_tokens']:,} prompt tokens")
    print(f"   {usage_stats['per_clip_avg']['output_tokens']:,} output tokens")
    print(f"   ${usage_stats['per_clip_avg']['cost']:.4f} per clip")
    print(f"\n💾 Stage 1 costs: usage_stats_stage1.json")
    print(f"\nNext: python3 2_create_coherent_narrative.py --game {ARGS.game}")

if __name__ == "__main__":
    print(f"🎬 STAGE 1: AUDIO + VISUAL OBSERVATIONS (30s clips with overlap)")
    print(f"Game: {ARGS.game}")
    print(f"Model: Gemini 2.5 Pro")
    print(f"Input: clips/ (WITH AUDIO)")
    print(f"Clip Format: 30s content + 5s overlap (40s total per clip)")
    print("=" * 70)
    analyze_clips()

