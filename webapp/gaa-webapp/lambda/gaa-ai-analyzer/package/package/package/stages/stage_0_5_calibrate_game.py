#!/usr/bin/env python3
"""
Stage 0.5: Calibrate Game
Analyzes frames in parallel to identify teams, colors, halves, and attacking directions
"""

import json
import google.generativeai as genai
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed


def describe_single_frame(frame_path, timestamp_seconds, api_key):
    """Describe a single frame using Gemini Flash"""
    try:
        genai.configure(api_key=api_key)
        
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
            'description': response.text.strip()
        }
    except Exception as e:
        print(f"❌ Error analyzing {frame_path.name}: {e}")
        return {
            'timestamp': timestamp_seconds,
            'frame': frame_path.name,
            'description': f"Error: {str(e)}"
        }


def run(frames_dir, work_dir, api_key):
    """
    Calibrate game profile from extracted frames
    
    Args:
        frames_dir: Directory containing calibration frames
        work_dir: Working directory
        api_key: Gemini API key
        
    Returns:
        game_profile: Dict with team info, match times, attacking directions
    """
    print(f"🎯 Calibrating game from {frames_dir}")
    
    # Get all calibration frames
    frames = sorted(frames_dir.glob('frame_*.jpg'))
    if not frames:
        raise RuntimeError(f"No calibration frames found in {frames_dir}")
    
    print(f"📸 Found {len(frames)} calibration frames")
    print(f"⚡ Analyzing in parallel with Gemini 2.5 Flash...")
    
    # STEP 1: Parallel frame descriptions
    frame_descriptions = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_frame = {}
        for frame_path in frames:
            # Extract timestamp from filename (frame_00m30s.jpg → 30 seconds)
            parts = frame_path.stem.split('_')
            if len(parts) >= 2:
                time_str = parts[1]  # e.g., "00m30s" or "05m00s"
                # Parse minutes and seconds
                if 'm' in time_str and 's' in time_str:
                    minutes = int(time_str.split('m')[0])
                    seconds = int(time_str.split('m')[1].replace('s', ''))
                    timestamp_seconds = minutes * 60 + seconds
                else:
                    timestamp_seconds = 0
            else:
                timestamp_seconds = 0
            
            future_to_frame[executor.submit(describe_single_frame, frame_path, timestamp_seconds, api_key)] = frame_path
        
        # Collect results
        for future in as_completed(future_to_frame):
            result = future.result()
            frame_descriptions.append(result)
            print(f"   ✅ Analyzed {result['frame']}")
    
    # Sort by timestamp
    frame_descriptions.sort(key=lambda x: x['timestamp'])
    
    print(f"✅ Analyzed {len(frame_descriptions)} frames")
    
    # STEP 2: Synthesize profile from descriptions
    print("🤖 Synthesizing game profile...")
    
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
   
2. **MATCH TIMES:**
   - Match START: Find the FIRST timestamp with "THROW-UP" or "IN-PLAY" state
   - Estimate when first half ends (around 30-35 minutes typically)
   
3. **ATTACKING DIRECTIONS:**
   - In 1st half: Which team attacks left-to-right? Which attacks right-to-left?

**RULES:**
- Use the timestamps from the descriptions
- Be specific about colors (exact shades like "Light blue", "Dark blue", "White")
- Times should be in SECONDS (integer)
- For first 10 minutes analysis, we need accurate start time

**OUTPUT FORMAT (JSON only, no markdown, no code blocks):**
{{
  "team_a": {{
    "jersey_color": "Exact color description",
    "keeper_color": "Exact color description",
    "attack_direction_1st_half": "left-to-right" or "right-to-left"
  }},
  "team_b": {{
    "jersey_color": "Exact color description",
    "keeper_color": "Exact color description",
    "attack_direction_1st_half": "right-to-left" or "left-to-right"
  }},
  "match_times": {{
    "start": integer,
    "first_half_end_estimate": integer
  }},
  "notes": "Any additional observations"
}}

Provide ONLY the JSON object:"""

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        'gemini-2.5-flash',
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        response = model.generate_content(synthesis_prompt)
        result_text = response.text.strip()
        
        # Remove markdown if present
        if '```' in result_text:
            lines = result_text.split('\n')
            json_lines = [l for l in lines if not l.startswith('```') and 'json' not in l.lower()]
            result_text = '\n'.join(json_lines).strip()
        
        game_profile = json.loads(result_text)
        
        # Save profile
        profile_path = work_dir / "game_profile.json"
        with open(profile_path, 'w') as f:
            json.dump(game_profile, f, indent=2)
        
        print(f"✅ Profile calibrated:")
        print(f"   Team A: {game_profile['team_a']['jersey_color']}")
        print(f"   Team B: {game_profile['team_b']['jersey_color']}")
        print(f"   Match starts at: {game_profile['match_times']['start']}s")
        
        return game_profile
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON response: {e}")
        print(f"\nRaw response:\n{result_text}")
        raise
    except Exception as e:
        print(f"❌ Calibration failed: {e}")
        raise

