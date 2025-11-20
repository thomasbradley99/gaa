#!/usr/bin/env python3
"""
Stage 0.5: Calibrate Game Profile
Analyzes frames in parallel to identify teams, colors, halves, and attacking directions
"""

import os
import json
import argparse
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

# Parse arguments
parser = argparse.ArgumentParser(description='Calibrate game profile using frame analysis')
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
FRAMES_DIR = GAME_ROOT / "inputs" / "calibration_frames"
OUTPUT_FILE = GAME_ROOT / "inputs" / "game_profile.json"

# Setup API
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

def describe_single_frame(frame_path: Path, timestamp_seconds: int) -> dict:
    """Describe a single frame using Flash"""
    try:
        prompt = f"""Frame at {timestamp_seconds}s. Report:

1. Teams: [color] jerseys vs [color] jerseys
2. Keepers (if visible): [color] keeper LEFT goal, [color] keeper RIGHT goal
3. Game state - choose ONE:
   - "THROW-UP" - referee throws up ball, players contesting
   - "IN-PLAY" - active match, players in motion
   - "HALFTIME" - players walking off field, leaving pitch
   - "WARMUP" - players standing around, no organized play
   - "END" - players shaking hands, celebrating, leaving field
4. Ball location: where is it? (center, penalty area, midfield, sideline, etc.)
5. Activity level: active play / slow / stopped / players resting

Format example: "Blue vs White. Pink LEFT, Green RIGHT. THROW-UP - referee throws up ball, teams contesting. Active."

Be concise (2-3 lines)."""

        with open(frame_path, 'rb') as f:
            frame_data = f.read()
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": frame_data},
            prompt
        ])
        
        return {
            'timestamp': timestamp_seconds,
            'frame': frame_path.name,
            'description': response.text.strip(),
            'tokens_in': response.usage_metadata.prompt_token_count,
            'tokens_out': response.usage_metadata.candidates_token_count
        }
    except Exception as e:
        print(f"❌ Error analyzing {frame_path.name}: {e}")
        return {
            'timestamp': timestamp_seconds,
            'frame': frame_path.name,
            'description': f"Error: {str(e)}",
            'tokens_in': 0,
            'tokens_out': 0
        }

def calibrate_game():
    """Analyze frames in parallel, then synthesize profile"""
    
    print(f"🎯 STAGE 0.5: GAME CALIBRATION (PARALLEL)")
    print(f"Game: {ARGS.game}")
    print("=" * 70)
    
    # Check if profile already exists - WARNING if it does
    if OUTPUT_FILE.exists():
        print("")
        print("⚠️  WARNING: game_profile.json already exists!")
        print(f"   Location: {OUTPUT_FILE}")
        print("")
        print("   This script should only be run ONCE per game.")
        print("   Running it again will OVERWRITE your existing configuration,")
        print("   which could cause team assignment inconsistencies across AI runs!")
        print("")
        response = input("   Type 'OVERWRITE' to continue, or anything else to abort: ")
        print("")
        if response.strip() != 'OVERWRITE':
            print("✅ Aborted - existing profile preserved")
            return False
        print("⚠️  Proceeding with OVERWRITE...")
        print("=" * 70)
        print()
    
    # Check frames exist
    frames = sorted(FRAMES_DIR.glob('frame_*.jpg'))
    if not frames:
        print(f"❌ No calibration frames found in: {FRAMES_DIR}")
        print(f"Run: python 0.1_generate_clips_and_frames.py --game {ARGS.game}")
        return False
    
    print(f"📸 Found {len(frames)} calibration frames")
    print(f"⚡ Analyzing in parallel with Gemini 2.5 Flash...")
    print(f"💰 Estimated cost: ~${len(frames) * 300 * 0.30 / 1_000_000:.4f} (step 1) + $0.01 (step 2)")
    print()
    
    # STEP 1: Parallel frame descriptions
    print("=" * 70)
    print("STEP 1: PARALLEL FRAME ANALYSIS")
    print("=" * 70)
    
    frame_descriptions = []
    total_tokens_in = 0
    total_tokens_out = 0
    completed = 0
    
    with ThreadPoolExecutor(max_workers=30) as executor:
        # Submit all frames for analysis
        future_to_frame = {}
        for frame_path in frames:
            # Extract timestamp from filename (frame_00120s.jpg → 120)
            timestamp_seconds = int(frame_path.stem.split('_')[1].replace('s', ''))
            future_to_frame[executor.submit(describe_single_frame, frame_path, timestamp_seconds)] = frame_path
        
        # Process results as they complete
        for future in as_completed(future_to_frame):
            result = future.result()
            frame_descriptions.append(result)
            completed += 1
            
            total_tokens_in += result.get('tokens_in', 0)
            total_tokens_out += result.get('tokens_out', 0)
            
            if completed % 20 == 0:
                print(f"📊 Progress: {completed}/{len(frames)} frames")
    
    # Sort by timestamp
    frame_descriptions.sort(key=lambda x: x['timestamp'])
    
    # Save frame descriptions for review
    descriptions_file = GAME_ROOT / "inputs" / "frame_descriptions.txt"
    with open(descriptions_file, 'w') as f:
        for d in frame_descriptions:
            f.write(f"{d['timestamp']:05d}s ({d['timestamp']//60:02d}m{d['timestamp']%60:02d}s): {d['description']}\n")
    
    step1_cost = (total_tokens_in / 1_000_000) * 0.30 + (total_tokens_out / 1_000_000) * 2.50
    
    print(f"✅ Analyzed {len(frame_descriptions)} frames")
    print(f"   Tokens: {total_tokens_in:,} in / {total_tokens_out:,} out")
    print(f"   Cost: ${step1_cost:.4f}")
    print(f"💾 Descriptions saved: frame_descriptions.txt")
    
    # STEP 2: Synthesize profile from descriptions
    print("\n" + "=" * 70)
    print("STEP 2: SYNTHESIZE GAME PROFILE")
    print("=" * 70)
    
    # Build text summary of all frame descriptions
    descriptions_text = "\n".join([
        f"{d['timestamp']}s ({d['timestamp']//60}m{d['timestamp']%60:02d}s): {d['description']}"
        for d in frame_descriptions
    ])
    
    synthesis_prompt = f"""Based on these frame descriptions from a GAA (Gaelic Athletic Association) match, create a game profile.

**FRAME DESCRIPTIONS WITH TIMESTAMPS:**

{descriptions_text}

**YOUR TASK:**
Extract the following information:

1. **TEAM IDENTIFICATION:**
   - Identify Team A: What jersey color? What goalkeeper color?
   - Identify Team B: What jersey color? What goalkeeper color?
   - DO NOT assign "home" or "away" - just call them Team A and Team B
   
2. **MATCH TIMES:**
   - Match START: Find the FIRST timestamp with "THROW-UP" or "IN-PLAY" state
     IMPORTANT: If this is within the first 60 seconds, set start to 0 (sampling may have missed earlier action)
   - Half Time: Find first timestamp with "HALFTIME" state (players walking off)
   - 2nd Half START: Find the SECOND "THROW-UP" or "IN-PLAY" state (after halftime)
   - Match END: Find the last timestamp with "IN-PLAY" or first "END" state
   
3. **ATTACKING DIRECTIONS:**
   - In 1st half: Which team attacks left-to-right? Which attacks right-to-left?
   - In 2nd half: Do they switch directions?

**RULES:**
- Use the timestamps from the descriptions
- Be specific about colors (exact shades like "Light blue", "Dark blue", "White")
- Times should be in SECONDS (integer)
- Be conservative with start times - if game is active early, assume it started at 0
- DO NOT try to determine home/away - that will be set manually

**OUTPUT FORMAT (JSON only, no markdown, no code blocks):**
{{
  "team_a": {{
    "jersey_color": "Exact color description",
    "keeper_color": "Exact color description",
    "attack_direction_1st_half": "left-to-right" or "right-to-left",
    "attack_direction_2nd_half": "left-to-right" or "right-to-left"
  }},
  "team_b": {{
    "jersey_color": "Exact color description",
    "keeper_color": "Exact color description",
    "attack_direction_1st_half": "right-to-left" or "left-to-right",
    "attack_direction_2nd_half": "right-to-left" or "left-to-right"
  }},
  "match_times": {{
    "start": integer,
    "half_time": integer,
    "second_half_start": integer,
    "end": integer
  }},
  "notes": "Any additional observations",
  "home_team_assignment": "EDIT_ME"
}}

Provide ONLY the JSON object:"""

    model = genai.GenerativeModel(
        'gemini-2.5-flash',
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        print("🤖 Synthesizing game profile from descriptions...")
        response = model.generate_content(synthesis_prompt)
        
        # Extract JSON from response
        result_text = response.text.strip()
        
        # Remove markdown if present
        if '```' in result_text:
            lines = result_text.split('\n')
            json_lines = [l for l in lines if not l.startswith('```') and 'json' not in l.lower()]
            result_text = '\n'.join(json_lines).strip()
        
        game_profile = json.loads(result_text)
        
        # Post-process match times: if start is within first 60s, set to 0
        # (sampling interval may have missed the actual start)
        if 'match_times' in game_profile:
            mt = game_profile['match_times']
            if mt.get('start', 0) > 0 and mt.get('start', 0) <= 60:
                print(f"⚠️  Start time {mt['start']}s detected - adjusting to 0s to account for sampling interval")
                mt['start'] = 0
        
        # Add human-readable time formats
        def seconds_to_readable(seconds: int) -> str:
            """Convert seconds to mm:ss or hh:mm:ss format"""
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            if hours > 0:
                return f"{hours}h{minutes:02d}m{secs:02d}s"
            else:
                return f"{minutes}m{secs:02d}s"
        
        if 'match_times' in game_profile:
            mt = game_profile['match_times']
            game_profile['match_times_readable'] = {
                'start': seconds_to_readable(mt['start']),
                'half_time': seconds_to_readable(mt['half_time']),
                'second_half_start': seconds_to_readable(mt['second_half_start']),
                'end': seconds_to_readable(mt['end'])
            }
        
        # Add video URL from video_source.json if available
        video_source_path = GAME_ROOT / "inputs" / "video_source.json"
        if video_source_path.exists():
            try:
                with open(video_source_path, 'r') as f:
                    video_source = json.load(f)
                    if video_source.get('downloads') and len(video_source['downloads']) > 0:
                        video_url = video_source['downloads'][0]['url']
                        game_profile['video_url'] = video_url
                        print(f"✅ Added video URL from video_source.json")
            except Exception as e:
                print(f"⚠️  Could not read video_source.json: {e}")
        
        # Get token usage
        usage = response.usage_metadata
        input_tokens = usage.prompt_token_count
        output_tokens = usage.candidates_token_count
        
        # Calculate cost (Flash pricing)
        input_cost = (input_tokens / 1_000_000) * 0.30
        output_cost = (output_tokens / 1_000_000) * 2.50
        step2_cost = input_cost + output_cost
        
        total_cost = step1_cost + step2_cost
        
        # Save profile
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(game_profile, f, indent=2)
        
        # Display results
        print(f"✅ Profile synthesized")
        print(f"   Tokens: {input_tokens:,} in / {output_tokens:,} out")
        print(f"   Cost: ${step2_cost:.4f}")
        
        print("\n" + "=" * 70)
        print("✅ GAME PROFILE CREATED")
        print("=" * 70)
        
        print(f"\n📊 TEAM INFORMATION:")
        print(f"   Team A: {game_profile['team_a']['jersey_color']} " +
              f"(Keeper: {game_profile['team_a']['keeper_color']})")
        print(f"   Team B: {game_profile['team_b']['jersey_color']} " +
              f"(Keeper: {game_profile['team_b']['keeper_color']})")
        
        print(f"\n⏱️  MATCH TIMES:")
        mt = game_profile['match_times']
        print(f"   Start: {mt['start']}s ({mt['start']//60}m{mt['start']%60:02d}s)")
        print(f"   Half Time: {mt['half_time']}s ({mt['half_time']//60}m{mt['half_time']%60:02d}s)")
        print(f"   2nd Half: {mt['second_half_start']}s ({mt['second_half_start']//60}m{mt['second_half_start']%60:02d}s)")
        print(f"   End: {mt['end']}s ({mt['end']//60}m{mt['end']%60:02d}s)")
        
        print(f"\n🎯 ATTACKING DIRECTIONS:")
        print(f"   1st Half - Team A: {game_profile['team_a']['attack_direction_1st_half']}, " +
              f"Team B: {game_profile['team_b']['attack_direction_1st_half']}")
        print(f"   2nd Half - Team A: {game_profile['team_a']['attack_direction_2nd_half']}, " +
              f"Team B: {game_profile['team_b']['attack_direction_2nd_half']}")
        
        if 'notes' in game_profile and game_profile['notes']:
            print(f"\n📝 Notes: {game_profile['notes']}")
        
        print(f"\n💰 TOTAL COST:")
        print(f"   Step 1 (Frame descriptions): ${step1_cost:.4f}")
        print(f"   Step 2 (Profile synthesis): ${step2_cost:.4f}")
        print(f"   TOTAL: ${total_cost:.4f}")
        
        print(f"\n💾 Saved to: {OUTPUT_FILE}")
        
        if 'video_url' in game_profile:
            print(f"\n🎥 VIDEO URL (for home team verification):")
            print(f"   {game_profile['video_url']}")
        
        print(f"\n⚠️  ACTION REQUIRED - Set Home Team:")
        print(f"   1. Watch video or check ground truth for 'Home Goal Kick'")
        print(f"   2. See which keeper takes it:")
        print(f"      - {game_profile['team_a']['keeper_color']} keeper → set 'home_team_assignment': 'team_a'")
        print(f"      - {game_profile['team_b']['keeper_color']} keeper → set 'home_team_assignment': 'team_b'")
        print(f"   3. Edit {OUTPUT_FILE.name} and change 'EDIT_ME' to the correct team")
        print(f"\n   💡 TIP: Video URL is included in {OUTPUT_FILE.name} for easy access")
        print(f"\nNext step: python3 1_clips_to_descriptions.py --game {ARGS.game} --start-clip X --end-clip Y")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON response: {e}")
        print(f"\nRaw response:\n{result_text}")
        return False
    except Exception as e:
        print(f"❌ Calibration failed: {str(e)}")
        return False

if __name__ == "__main__":
    import sys
    success = calibrate_game()
    sys.exit(0 if success else 1)
