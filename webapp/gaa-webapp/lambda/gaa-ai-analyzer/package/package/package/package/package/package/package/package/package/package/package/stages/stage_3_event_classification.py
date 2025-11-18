#!/usr/bin/env python3
"""
Stage 3: Event Classification
Classifies GAA events from narrative
"""

import json
import google.generativeai as genai


def run(narrative, game_profile, work_dir, api_key):
    """
    Classify GAA events from narrative
    
    Args:
        narrative: Coherent narrative from stage 2
        game_profile: Calibrated game profile
        work_dir: Working directory
        api_key: Gemini API key
        
    Returns:
        classified_events: Text with classified events
    """
    print(f"🏉 Classifying GAA events from narrative")
    
    team_a = game_profile['team_a']
    team_b = game_profile['team_b']
    
    prompt = f"""You are a GAA (Gaelic Athletic Association) expert classifying match events.

**TEAMS:**
- {team_a['jersey_color']} ({team_a['keeper_color']} keeper)
- {team_b['jersey_color']} ({team_b['keeper_color']} keeper)

**NARRATIVE:**

{narrative}

**YOUR TASK:**
Classify each event in the narrative into GAA event types.

**GAA EVENT TYPES:**
- KICKOUT: Goalkeeper restarts play from goal area (after point/goal/wide)
- SHOT - POINT: Ball goes over the crossbar (1 point)
- SHOT - GOAL: Ball goes into the net (3 points)
- SHOT - WIDE: Shot misses target
- SHOT - SAVED: Goalkeeper saves shot
- TURNOVER: Possession changes (tackle, interception, loose ball)
- FOUL: Referee calls foul
- THROW-UP: Referee throws ball between players (restart)
- MARK: Player catches clean ball from kick 
- FREE: Free kick awarded
- 45: 45-meter free kick awarded
- PENALTY: Penalty awarded

**OUTPUT FORMAT:**
For each event, provide:
- Timestamp (MM:SS)
- Event Type
- Team (by jersey color)
- Description (1 line)

Example:
0:00 - KICKOUT - Blue - Goalkeeper takes kickout from goal area
0:15 - TURNOVER - White - White player intercepts pass
1:05 - SHOT - POINT - Blue - Blue scores point over the bar
...

Classify all events:"""

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        'gemini-2.5-pro',
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        print("🤖 Classifying events with Gemini...")
        response = model.generate_content(prompt)
        classified = response.text.strip()
        
        # Save classified events
        output_file = work_dir / "classified_events.txt"
        with open(output_file, 'w') as f:
            f.write(classified)
        
        print(f"✅ Events classified")
        print(f"💾 Saved to {output_file.name}")
        
        return classified
        
    except Exception as e:
        print(f"❌ Failed to classify events: {e}")
        raise

