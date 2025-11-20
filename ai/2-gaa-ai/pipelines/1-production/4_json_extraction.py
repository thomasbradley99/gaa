#!/usr/bin/env python3
"""
Stage 3: Extract JSON events from narrative
Usage: python3 3_json_extraction.py --game {game-name}
"""

import os
import json
import re
import argparse
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True)
ARGS = parser.parse_args()

# Paths
PROD_ROOT = Path(__file__).parent.parent.parent  # production1/
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
SCHEMA_DIR = PROD_ROOT / "schemas"

# Auto-detect output folder from Stage 1
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
    print(f"📁 Using output folder: {output_folder}")
else:
    output_folder = "6-with-audio"
    print(f"📁 Using default folder: {output_folder}")

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder

# Setup
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

def _load_constraints(constraints_path: Path):
    try:
        with constraints_path.open('r', encoding='utf-8') as f:
            return json.load(f).get('actions', {})
    except Exception:
        return {}


def _normalize_tag(tag: str) -> str:
    t = tag.strip()
    mapping = {
        "on target": "On Target",
        "off target": "Off Target",
        "save": "Save",
        "blocked": "Blocked",
        "successful": "Successful",
        "unsuccessful": "Unsuccessful",
        "center": "centre",
        "Center": "centre",
        "CENTER": "centre",
    }
    low = t.lower()
    return mapping.get(low, t)

def extract_json():
    """Extract structured JSON events from narrative using REGEX (no AI)"""
    
    input_file = OUTPUT_DIR / "3_events_classified.txt"
    output_file = OUTPUT_DIR / "4_events.json"
    constraints_file = SCHEMA_DIR / "constraints.json"
    
    if not input_file.exists():
        raise FileNotFoundError(f"❌ Input file not found: {input_file}")
    
    # Read classified events
    with open(input_file, 'r') as f:
        narrative_text = f.read()
    
    print(f"📖 Loaded narrative: {len(narrative_text)} characters")
    
    # REGEX PARSING (no AI needed!)
    # Pattern: MM:SS - Event Code [Tag1] [Tag2] [Tag3]: Description
    # Examples:
    #   04:28 - Foul Conceded
    #   04:33 - Shot Own [From Play] [Point]: Description here
    #   05:45 - Kickout Opp [Long] [Centre] [Won]: Keeper takes kickout
    
    # First extract timestamp and event code
    basic_pattern = r'(\d+):(\d+)\s*-\s*(.+)$'
    
    events = []
    for line in narrative_text.split('\n'):
        line = line.strip()
        if not line or line.startswith('Here are') or line.startswith('**'):
            continue
            
        match = re.match(basic_pattern, line)
        if match:
            minutes, seconds, rest = match.groups()
            start_seconds = int(minutes) * 60 + int(seconds)
            
            # Extract event code (everything before first [ or :)
            code_match = re.match(r'([^\[\:]+)', rest)
            if not code_match:
                continue
            code = code_match.group(1).strip()
            
            # Extract all tags [tag1] [tag2] [tag3]
            tags = re.findall(r'\[([^\]]+)\]', rest)
            
            # Extract description (everything after last ] and :)
            desc_match = re.search(r'(?:\]\s*)?:\s*(.+)$', rest)
            label = desc_match.group(1).strip() if desc_match else code
            
            event = {
                'ID': f'ai-{len(events)+1:04d}',
                'start_seconds': float(start_seconds),
                'end_seconds': float(start_seconds),
                'start_raw': str(start_seconds),
                'end_raw': str(start_seconds),
                'code': code,
                'label': label
            }
            
            # Store tags as array if multiple, or single normalized tag
            if len(tags) > 1:
                event['tags'] = [_normalize_tag(t) for t in tags]
            elif len(tags) == 1:
                event['tag'] = _normalize_tag(tags[0])
            
            events.append(event)
    
    # Save JSON
    with open(output_file, 'w') as f:
        json.dump(events, f, indent=2)
    
    print(f"✅ Extracted {len(events)} events (regex parsing)")
    print(f"💾 Saved to: {output_file}")
    return

    # OLD AI-BASED APPROACH (kept as fallback)
    prompt = f"""Convert this event narrative into structured JSON format.

**YOUR TASK:** Extract ALL events from the narrative below and convert them to JSON format.

**IMPORTANT RULES:**
1. Extract EVERY event mentioned in the narrative
2. Use the EXACT event codes from the narrative (before the colon)
3. Convert MM:SS timestamps to seconds (e.g., "05:19" → 319.0 seconds)
4. Extract tags from [brackets] when present (e.g., "[M3 centre]" → tag: "M3 centre")
5. The label should be the description text AFTER the colon (without the tag)
6. DO NOT filter or skip any events - extract them all

**NARRATIVE FORMAT:**
Each line follows: MM:SS - Event Code [Tag]: Description
Example: "05:25 - Home Regain Won [M3 centre]: Home team player heads the ball..."
         → start_seconds: 325.0, code: "Home Regain Won", tag: "M3 centre", label: "Home team player heads the ball..."

NARRATIVE:
{narrative_text}

OUTPUT FORMAT (JSON array only, no markdown, no code blocks):
[
  {{
    "start_seconds": 319.0,
    "end_seconds": 319.0,
    "code": "Home Goal Kick",
    "label": "Goalkeeper launches the ball high and long towards the center of the pitch."
  }},
  {{
    "start_seconds": 325.0,
    "end_seconds": 325.0,
    "code": "Home Regain Won",
    "label": "Home team player heads the ball and secures possession after an aerial duel.",
    "tag": "M3 centre"
  }},
  {{
    "start_seconds": 422.0,
    "end_seconds": 422.0,
    "code": "Opp Shot at Goal",
    "label": "Away team shot is saved by the home team's goalkeeper.",
    "tag": "Save"
  }}
]

**CRITICAL:** 
- If there is a [Tag] in brackets, you MUST extract it to the "tag" field
- Only include the "tag" field when a tag is present in the narrative
- Extract ALL events, maintaining the exact order from the narrative

Convert ALL events from the narrative to JSON:"""

    # Configure model for parsing (lower temperature for precision)
    model = genai.GenerativeModel(
        'gemini-2.5-flash',  # Using Flash for cost-effectiveness
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Try to extract JSON from response
        json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
        if json_match:
            json_text = json_match.group(0)
            events = json.loads(json_text)
            
            # Add IDs to events and normalize/validate tag
            constraints = _load_constraints(constraints_file)
            formatted_events = []
            for i, event in enumerate(events, 1):
                event['ID'] = f"ai-{i:04d}"
                if 'end_seconds' not in event or event['end_seconds'] is None:
                    event['end_seconds'] = event['start_seconds']
                
                # Add start_raw and end_raw to match professional format
                event['start_raw'] = str(int(event['start_seconds']))
                event['end_raw'] = str(int(event['end_seconds']))
                
                # Validate and normalize tags
                tag = event.get('tag')
                code = event.get('code')
                if tag:
                    norm = _normalize_tag(str(tag))
                    allowed = constraints.get(code)
                    if allowed and norm not in allowed:
                        event.pop('tag', None)
                    else:
                        event['tag'] = norm
                
                # Reorder fields to match professional format exactly
                ordered_event = {
                    'ID': event['ID'],
                    'start_seconds': event['start_seconds'],
                    'end_seconds': event['end_seconds'],
                    'start_raw': event['start_raw'],
                    'end_raw': event['end_raw'],
                    'code': event['code']
                }
                if 'label' in event:
                    ordered_event['label'] = event['label']
                if 'tag' in event:
                    ordered_event['tag'] = event['tag']
                
                formatted_events.append(ordered_event)
            
            events = formatted_events
            
            # Save events
            with open(output_file, 'w') as f:
                json.dump(events, f, indent=2)
            
            print(f"✅ Extracted {len(events)} events")
            print(f"💾 Saved to: {output_file}")
            
        else:
            print("⚠️  No JSON found in response")
            print(f"Response: {result_text[:200]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print(f"🔧 STAGE 3: JSON EXTRACTION")
    print(f"Game: {ARGS.game}")
    print("=" * 50)
    extract_json()
