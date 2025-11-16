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
    """Describe a single frame using Flash - extract simple facts"""
    try:
        prompt = f"""Frame at {timestamp_seconds}s. Extract these facts:

1. Team colors: [color] jerseys vs [color] jerseys
   - GAA jerseys typically have TWO colors (e.g., "Blue/White", "Red/Orange", "Green/Yellow")
   - Report BOTH colors if you see them (use "/" or "&" to separate: "Blue/White", "Red & Orange")
   - If you see orange/reddish, say "Orange" or "Red/Orange" not just "Red"
   - If you see blue and white together, say "Blue/White" or "Blue & White" not just "Blue" or "White"
   - Be specific: distinguish "Orange" from "Red", "Light Blue" from "Dark Blue"
2. Keeper colors (if visible): [color] keeper at LEFT goal, [color] keeper at RIGHT goal
   - Be specific: "Dark", "Black", "Dark Blue", etc. - not just "Dark" if you can see the actual color
3. Attack direction: 
   - Which team is attacking left-to-right? (their goal/defense is on LEFT, attacking towards RIGHT)
   - Which team is attacking right-to-left? (their goal/defense is on RIGHT, attacking towards LEFT)
   - IMPORTANT: Players typically face the direction they are attacking towards
   - "Left-to-right" = team's goal is on left side, players face/move right (attacking right)
   - "Right-to-left" = team's goal is on right side, players face/move left (attacking left)
   - Look at player body orientation and movement direction to determine which goal they're defending and which direction they're attacking
   - Only report if this is ACTIVE match play (both teams competing on full pitch)
   - If WARMUP/PRACTICE, attack direction is not applicable
4. Match status: 
   - "ACTIVE" = ONLY if full pitch is occupied by TWO COMPETING TEAMS in organized match play (both teams visible, competitive action, ball in play, match structure)
   - "WARMUP/PRACTICE" = Everything else: drills, warmup, practice, empty pitch, players walking off/on, halftime break, partial field activity, or any non-competitive activity
   - If you see drills, practice, warmup, empty pitch, players walking, or anything that's NOT full competitive match play → WARMUP/PRACTICE

Format example: "Orange vs Blue/White. Dark LEFT, Dark RIGHT. Orange attacks left-to-right, Blue/White attacks right-to-left. ACTIVE"

Be concise (2-3 lines). Only report what you can see clearly. GAA jerseys often have two colors - report both.

CRITICAL RULES:
- ACTIVE = Full pitch, two competing teams, organized match play ONLY
- Everything else (drills, warmup, practice, empty pitch, walking, halftime) = WARMUP/PRACTICE
- Attack directions only matter for ACTIVE match play"""

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
    
    # Check frames exist
    frames = sorted(FRAMES_DIR.glob('frame_*.jpg'))
    if not frames:
        print(f"❌ No calibration frames found in: {FRAMES_DIR}")
        print(f"Run: python 0.2_generate_clips_and_frames.py --game {ARGS.game}")
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
    
    synthesis_prompt = f"""You are analyzing frame descriptions from a GAA (Gaelic Athletic Association) match video to create a game profile.

**FRAME DESCRIPTIONS WITH TIMESTAMPS:**

{descriptions_text}

**UNDERSTANDING GAA MATCH STRUCTURE:**
- GAA matches have two halves, each typically 30-35 minutes long
- Teams switch ends at halftime (so attack directions reverse)
- Match starts after warmup period
- There's a halftime break between halves

**YOUR TASK - REASON THROUGH THE TIMELINE:**

Read through ALL frame descriptions chronologically and identify:

1. **TEAM IDENTIFICATION:**
   - What are the two jersey colors? 
   - IMPORTANT: GAA jerseys typically have TWO colors (e.g., "Blue/White", "Red/Orange", "Green/Yellow")
   - Look at ACTIVE match frames - those are most reliable for team colors
   - Report BOTH colors if you see them (use "/" or "&" to separate: "Blue/White", "Red & Orange")
   - Be VERY specific: distinguish "Orange" from "Red", "Blue/White" from "White", "Light Blue" from "Dark Blue"
   - If you see orange/reddish in ACTIVE frames, it's likely "Orange" or "Red/Orange" not just "Red"
   - If you see blue and white together, it's "Blue/White" or "Blue & White" not just "Blue" or "White"
   - What are the goalkeeper colors for each team? (be specific: "Dark", "Black", "Dark Blue", etc.)
   - Look for consistent keeper colors across ACTIVE frames
   - If keepers are rarely visible or colors are inconsistent, use "Dark" as a default (most common when keepers are visible)
   - Only assign specific colors if you see them consistently mentioned
   - Call them Team A and Team B (don't assign home/away)

2. **MATCH TIMES - INFER FROM PATTERNS:**
   
   Look at the pattern of ACTIVE vs WARMUP states across the timeline:
   
   **Match START:**
   - Find where WARMUP transitions to sustained ACTIVE match play
   - Early ACTIVE states (before 5 minutes) are likely practice - ignore them
   - The REAL match start is when you see sustained ACTIVE states after a clear warmup period
   - Typically 8-12 minutes into video
   - Choose the timestamp where organized match clearly begins
   
   **Half Time:**
   - GAA halves are ~30 minutes long
   - Look for a gap in ACTIVE play that:
     * Comes AFTER match start
     * Is approximately 30-35 minutes after match start
     * Shows pattern: ACTIVE → (break/gap with mostly WARMUP/PRACTICE) → ACTIVE resumes
   - The halftime is the END of the first sustained ACTIVE period (before the break)
   - During halftime break, you should see mostly WARMUP/PRACTICE frames (empty pitch, players walking, etc.)
   - Ignore scattered ACTIVE frames during what should be halftime break - those are likely false positives
   - The REAL halftime break should have a clear pattern: sustained ACTIVE → mostly WARMUP/PRACTICE → sustained ACTIVE resumes
   
   **2nd Half START:**
   - Should come after a proper halftime break (5-15 minutes after halftime)
   - GAA halftime breaks are typically 5-15 minutes - ignore any ACTIVE resuming too quickly (less than 5 minutes)
   - Look for where ACTIVE match play resumes after a substantial break
   - Should see sustained ACTIVE states resuming (not just a brief pause)
   - If you see ACTIVE at 2-3 minutes after halftime, that's likely still 1st half play - ignore it
   
   **Match END:**
   - Should be at least 25-30 minutes after 2nd half start
   - Find where ACTIVE match play ends (last sustained ACTIVE state)
   
3. **ATTACKING DIRECTIONS:**
   - For 1st half: Analyze ALL ACTIVE frame descriptions during the 1st half period
     * Which team attacks left-to-right? Which attacks right-to-left?
     * Look at the actual attack directions reported in the descriptions
   - For 2nd half: Analyze ALL ACTIVE frame descriptions during the 2nd half period
     * Which team attacks left-to-right? Which attacks right-to-left?
     * Look at the actual attack directions reported in the descriptions
   - Use the frame descriptions directly - don't assume or reverse
   - If descriptions are inconsistent, use the most common pattern for each half
   - This system must work for ANY game - infer from what's actually described

**CRITICAL THINKING:**
- Use the full timeline pattern, not individual frames
- Match start = transition from WARMUP to sustained ACTIVE
- Halftime = end of first ~30 min ACTIVE period
- 2nd half start = ACTIVE play resumes after break
- Think about what makes sense temporally - a gap at 5 minutes is NOT halftime

**OUTPUT:**
- Times in SECONDS (integer)
- Include 30-60 second buffer before match start (better to start early than miss events)
- Be specific about colors

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
        
        # Ensure home_team_assignment field exists (AI sometimes omits it)
        if 'home_team_assignment' not in game_profile:
            game_profile['home_team_assignment'] = 'EDIT_ME'
        
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
        print(f"   Half Time: {mt['half_time']}s ({mt['half_time']//60}m{mt['half_time']%60:02d}s) - 1st half duration: {(mt['half_time']-mt['start'])//60}m{(mt['half_time']-mt['start'])%60:02d}s")
        print(f"   2nd Half: {mt['second_half_start']}s ({mt['second_half_start']//60}m{mt['second_half_start']%60:02d}s)")
        print(f"   End: {mt['end']}s ({mt['end']//60}m{mt['end']%60:02d}s) - 2nd half duration: {(mt['end']-mt['second_half_start'])//60}m{(mt['end']-mt['second_half_start'])%60:02d}s")
        
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
        print(f"\n⚠️  ACTION REQUIRED - Set Home Team:")
        print(f"   1. Watch S3 website or check ground truth for 'Home Goal Kick'")
        print(f"   2. See which keeper takes it:")
        print(f"      - {game_profile['team_a']['keeper_color']} keeper → set 'home_team_assignment': 'team_a'")
        print(f"      - {game_profile['team_b']['keeper_color']} keeper → set 'home_team_assignment': 'team_b'")
        print(f"   3. Edit {OUTPUT_FILE.name} and change 'EDIT_ME' to the correct team")
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
