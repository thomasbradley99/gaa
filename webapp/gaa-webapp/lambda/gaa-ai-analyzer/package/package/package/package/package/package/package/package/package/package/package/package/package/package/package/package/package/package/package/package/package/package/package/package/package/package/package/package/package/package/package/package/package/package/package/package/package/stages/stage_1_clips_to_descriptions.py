#!/usr/bin/env python3
"""
Stage 1: Clips to Descriptions
Analyzes video clips in PARALLEL using Gemini AI
"""

import json
import google.generativeai as genai
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed


def analyze_single_clip(clip_path, game_profile, api_key):
    """Analyze a single 60s clip and return description"""
    try:
        genai.configure(api_key=api_key)
        
        # Extract clip number from filename (clip_000.mp4 -> 0)
        clip_num = int(clip_path.stem.split('_')[1])
        timestamp = clip_num * 60  # Each clip is 60 seconds
        
        # Build team context
        team_a = game_profile['team_a']
        team_b = game_profile['team_b']
        
        home_color = team_a['jersey_color']
        away_color = team_b['jersey_color']
        home_attacks = team_a['attack_direction_1st_half']
        away_attacks = team_b['attack_direction_1st_half']
        
        # Defending goal sides
        home_goal_side = 'left' if home_attacks == 'left-to-right' else 'right'
        away_goal_side = 'right' if home_attacks == 'left-to-right' else 'left'
        
        team_context = f"""CONTEXT: 1st half (first 10 minutes).

TEAMS (refer to them ONLY by jersey color):
- {home_color} ({team_a['keeper_color']} keeper) - attacking {home_attacks}, defend {home_goal_side} side goal
- {away_color} ({team_b['keeper_color']} keeper) - attacking {away_attacks}, defend {away_goal_side} side goal"""

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
        
        print(f"   🎬 Analyzing clip {clip_num:02d} at {clip_start_time}...")
        
        # Send to Gemini Pro
        model = genai.GenerativeModel(
            'gemini-2.5-pro',
            generation_config={"temperature": 0, "top_p": 0.1}
        )
        
        response = model.generate_content([
            {"mime_type": "video/mp4", "data": video_data},
            prompt
        ])
        
        description = response.text.strip()
        
        return {
            'clip_number': clip_num,
            'timestamp': timestamp,
            'clip_name': clip_path.name,
            'description': description
        }
        
    except Exception as e:
        print(f"   ❌ Error analyzing {clip_path.name}: {e}")
        return {
            'clip_number': clip_num,
            'timestamp': timestamp,
            'clip_name': clip_path.name,
            'description': f"Error: {str(e)}"
        }


def run(clips_dir, game_profile, work_dir, api_key):
    """
    Analyze all clips in PARALLEL using Gemini
    
    Args:
        clips_dir: Directory containing video clips
        game_profile: Calibrated game profile
        work_dir: Working directory
        api_key: Gemini API key
        
    Returns:
        descriptions: List of clip descriptions
    """
    clips = sorted(clips_dir.glob('clip_*.mp4'))
    
    if not clips:
        raise RuntimeError(f"No clips found in {clips_dir}")
    
    print(f"🎬 Analyzing {len(clips)} clips in PARALLEL with Gemini 2.5 Pro")
    
    descriptions = []
    
    # Use ThreadPoolExecutor for parallel API calls
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all clips for analysis
        future_to_clip = {
            executor.submit(analyze_single_clip, clip, game_profile, api_key): clip
            for clip in clips
        }
        
        # Collect results as they complete
        completed = 0
        for future in as_completed(future_to_clip):
            result = future.result()
            descriptions.append(result)
            completed += 1
            print(f"   ✅ Completed {completed}/{len(clips)} clips")
    
    # Sort by clip number
    descriptions.sort(key=lambda x: x['clip_number'])
    
    # Save descriptions
    output_file = work_dir / "clip_descriptions.json"
    with open(output_file, 'w') as f:
        json.dump(descriptions, f, indent=2)
    
    print(f"✅ Analyzed {len(descriptions)} clips")
    print(f"💾 Saved to {output_file.name}")
    
    return descriptions

