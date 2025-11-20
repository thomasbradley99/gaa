#!/usr/bin/env python3
"""
Stage 4: Extract JSON
Converts classified events into structured JSON
"""

import json
import google.generativeai as genai


def run(classified_events, game_profile, work_dir, api_key):
    """
    Extract structured JSON from classified events
    
    Args:
        classified_events: Classified events text from stage 3
        game_profile: Calibrated game profile (includes match_times.start)
        work_dir: Working directory
        api_key: Gemini API key
        
    Returns:
        events_json: Structured JSON with events
    """
    print(f"📊 Extracting structured JSON")
    
    team_a = game_profile['team_a']
    team_b = game_profile['team_b']
    match_start = game_profile['match_times']['start']  # Get match start time from calibration
    
    prompt = f"""Convert these GAA match events into structured JSON.

**TEAMS:**
- {team_a['jersey_color']} ({team_a['keeper_color']} keeper)
- {team_b['jersey_color']} ({team_b['keeper_color']} keeper)

**MATCH START TIME:**
The match starts at {match_start} seconds ({match_start//60}m{match_start%60:02d}s) into the video recording.

**CLASSIFIED EVENTS:**

{classified_events}

**OUTPUT FORMAT (JSON only, no markdown):**
{{
  "events": [
    {{
      "id": "event_001",
      "time": {match_start + 65},
      "team": "home",
      "action": "Shot",
      "outcome": "Point",
      "metadata": {{
        "scoreType": "point",
        "from": "play"
      }}
    }},
    {{
      "id": "event_002",
      "time": {match_start + 120},
      "team": "away",
      "action": "Kickout",
      "outcome": "Won"
    }}
  ]
}}

**CRITICAL FIELD NAMES (must match exactly):**
- Use "time" NOT "timestamp"
- Use "action" NOT "type"
- Include "outcome" field

**ACTION VALUES (capitalized):**
Shot, Kickout, Turnover, Throw-up, Foul, Yellow Card, Black Card, Red Card, Kick-in, Half Time Whistle, Full Time Whistle

**OUTCOME VALUES (capitalized):**
Point, Goal, Wide, Saved, Won, Lost, N/A

**RULES:**
- "time" must be ABSOLUTE VIDEO TIME in seconds (from video start at 0:00, NOT from match start)
- For events in classified list: ADD {match_start} seconds to convert from match time to video time
- Example: Event at "1:05" in match → {match_start} + 65 = {match_start + 65} seconds in video
- Map jersey colors to team: "{team_a['jersey_color']}" = home, "{team_b['jersey_color']}" = away
- Generate unique IDs (e.g., "event_001", "event_002")
- Include all events from the classified list

Provide ONLY the JSON object:"""

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        'gemini-2.5-flash',
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        print("🤖 Extracting JSON with Gemini...")
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Remove markdown if present
        if '```' in result_text:
            lines = result_text.split('\n')
            json_lines = [l for l in lines if not l.startswith('```') and 'json' not in l.lower()]
            result_text = '\n'.join(json_lines).strip()
        
        events_json = json.loads(result_text)
        
        # Save JSON
        output_file = work_dir / "events.json"
        with open(output_file, 'w') as f:
            json.dump(events_json, f, indent=2)
        
        print(f"✅ Extracted {len(events_json.get('events', []))} events")
        print(f"💾 Saved to {output_file.name}")
        
        return events_json
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON: {e}")
        print(f"Raw response:\n{result_text}")
        raise
    except Exception as e:
        print(f"❌ Failed to extract JSON: {e}")
        raise

