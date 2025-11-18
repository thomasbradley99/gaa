#!/usr/bin/env python3
"""
Stage 2: Create Coherent Narrative
Stitches clip descriptions into a coherent narrative
"""

import json
import google.generativeai as genai


def run(descriptions, game_profile, work_dir, api_key):
    """
    Create coherent narrative from clip descriptions
    
    Args:
        descriptions: List of clip descriptions from stage 1
        game_profile: Calibrated game profile
        work_dir: Working directory
        api_key: Gemini API key
        
    Returns:
        narrative: Coherent narrative text
    """
    print(f"📝 Creating coherent narrative from {len(descriptions)} clips")
    
    # Build observations block
    observations = "\n\n".join([
        f"**CLIP {d['clip_number']} ({d['timestamp']//60}:{d['timestamp']%60:02d}):**\n{d['description']}"
        for d in descriptions
    ])
    
    team_a = game_profile['team_a']
    team_b = game_profile['team_b']
    
    prompt = f"""You are creating a coherent narrative from GAA match observations.

**TEAMS:**
- {team_a['jersey_color']} ({team_a['keeper_color']} keeper)
- {team_b['jersey_color']} ({team_b['keeper_color']} keeper)

**TIME RANGE:** 0:00 to 10:00 (first 10 minutes)

**OBSERVATIONS FROM VIDEO CLIPS:**

{observations}

**YOUR TASK:**
Create a coherent play-by-play narrative of the first 10 minutes.

**Guidelines:**
1. Maintain absolute timestamps (MM:SS format)
2. Refer to teams ONLY by jersey color
3. Fix any logic errors or contradictions in observations
4. Include all significant events: kickouts, attacks, turnovers, fouls, scores
5. Be concise but complete
6. Focus on possession changes and scoring opportunities

**Example format:**
0:00 - Blue goalkeeper takes kickout from goal area
0:15 - White player wins possession in midfield
0:32 - Blue intercepts pass and attacks down left side
1:05 - White defender tackles, turnover
...

Provide the narrative:"""

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        'gemini-2.5-pro',
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        print("🤖 Generating narrative with Gemini...")
        response = model.generate_content(prompt)
        narrative = response.text.strip()
        
        # Save narrative
        output_file = work_dir / "narrative.txt"
        with open(output_file, 'w') as f:
            f.write(narrative)
        
        print(f"✅ Narrative created ({len(narrative)} characters)")
        print(f"💾 Saved to {output_file.name}")
        
        return narrative
        
    except Exception as e:
        print(f"❌ Failed to create narrative: {e}")
        raise

