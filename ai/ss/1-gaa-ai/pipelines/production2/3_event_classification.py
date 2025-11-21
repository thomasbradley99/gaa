#!/usr/bin/env python3
"""
Stage 3: Event Classification - Extract 9 core event types
Usage: python3 3_event_classification.py --game ecnl-2012-vs-op
"""

import os
import json
import argparse
import subprocess
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Parse arguments
parser = argparse.ArgumentParser(description='Extract event narrative from descriptions')
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
ARGS = parser.parse_args()

# Setup paths
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

INPUT_DIR_SOURCE = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Setup API
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Load game profile for team color mapping
GAME_PROFILE = None
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if profile_path.exists():
    with open(profile_path, 'r') as f:
        GAME_PROFILE = json.load(f)
    
    home_assignment = GAME_PROFILE.get('home_team_assignment', 'EDIT_ME')
    if home_assignment != 'EDIT_ME':
        team_a = GAME_PROFILE['team_a']
        team_b = GAME_PROFILE['team_b']
        
        if home_assignment == 'team_a':
            HOME_TEAM = team_a
            AWAY_TEAM = team_b
        else:
            HOME_TEAM = team_b
            AWAY_TEAM = team_a
        
        print(f"✅ Loaded game profile:")
        print(f"   Home = {HOME_TEAM['jersey_color']} ({HOME_TEAM['keeper_color']} keeper)")
        print(f"   Away = {AWAY_TEAM['jersey_color']} ({AWAY_TEAM['keeper_color']} keeper)")
    else:
        print(f"⚠️  Game profile found but home_team_assignment not set - using colors only")
        HOME_TEAM = None
        AWAY_TEAM = None
else:
    print(f"⚠️  No game profile - AI will infer team assignments")
    HOME_TEAM = None
    AWAY_TEAM = None

def classify_events():
    """Classify events from coherent narrative using football logic"""
    
    # Read from narrative (Stage 2 validated output) to filter out fake goals
    narrative_file = OUTPUT_DIR / "2_narrative.txt"
    observations_file = OUTPUT_DIR / "1_observations.txt"
    
    # Try narrative first (validated), fall back to observations if narrative doesn't exist
    if narrative_file.exists():
        input_file = narrative_file
        print(f"📖 Using validated narrative from Stage 2")
    else:
        input_file = observations_file
        print(f"⚠️  No 2_narrative.txt found - using raw observations (Stage 2 was skipped)")
    
    output_file = OUTPUT_DIR / "3_events_classified.txt"
    constraints_file = SCHEMA_DIR / "constraints.json"
    
    if not input_file.exists():
        raise FileNotFoundError(f"❌ Input file not found: {input_file}")
    
    # Read narrative/observations
    with open(input_file, 'r') as f:
        narrative = f.read()
    
    print(f"📖 Loaded: {len(narrative)} characters")
    
    # Load constraints to guide tag emission
    constraints = {}
    try:
        with open(constraints_file, 'r') as f:
            constraints = json.load(f).get('actions', {})
    except Exception:
        constraints = {}
    
    # Build team mapping for prompt
    if HOME_TEAM and AWAY_TEAM:
        team_mapping = f"""Teams (convert colors to Home/Away):
- Home = {HOME_TEAM['jersey_color']} ({HOME_TEAM['keeper_color']} goalkeeper)
- Away/Opp = {AWAY_TEAM['jersey_color']} ({AWAY_TEAM['keeper_color']} goalkeeper)"""
    else:
        # Fallback - let AI infer
        team_mapping = """Teams (infer from context):
- Identify which team is Home and which is Away based on context"""
    
    # Event Classification from Narrative
    prompt = f"""Hello! You're the final step in our football event detection pipeline.

**WHAT YOU'RE WORKING WITH:**
You have a coherent narrative that's been validated to remove hallucinations (especially fake goals). Your job is to extract specific event types and convert team colors to Home/Away labels for our database.

{team_mapping}

**YOUR TASK:**
Read the narrative and extract events. The timestamps are already in absolute game time (e.g., 11:25, 14:33), so just use them as-is.

**IMPORTANT - ONLY EXTRACT EVENTS THAT ARE EXPLICITLY MENTIONED:**
Don't infer or add events. If the narrative says "11:41 - Blue player intercepts", you extract it. If it doesn't mention an event, don't create it.

Be especially conservative with:
- **Goals:** Only if narrative explicitly says "ball goes into the net" or "scores a goal"
- **Kick offs:** Only if it says "takes the kick-off" (not "prepares for kick-off")
- **Half starts/ends:** Only if explicitly stated ("whistle blows to start", "half ends")

**ALL EVENTS TO EXTRACT:**

**EVENTS WE'RE TRACKING (41 types total):**

**Set Pieces & Restarts:**
- "Home/Opp Throw In" - Player takes throw-in from sideline
- "Home/Opp Corner" - Corner kick from corner arc
- "Home/Opp Goal Kick" - Goalkeeper kicks from penalty box
- "Home/Opp Free Kick" - After a foul (add tag: [Indirect], [On Target], [Off Target], [Save], or [Blocked])
- "Home/Opp Kick Off" - Restart from center circle (RARE - only after goals or half starts)

**Attacking Actions:**
- "Home/Opp Shot at Goal" - ANY strike toward goal (add tag: [Save], [On Target], [Off Target], or [Blocked])
- "Home/Opp Cross" - Ball delivered into penalty area from wide position
- "Home/Opp A3 Entry" - Player enters attacking third (final third of field)
- "Home/Opp Goal" - Ball in net + celebration (VERY RARE)
- "Home/Opp Penalty" - Penalty kick awarded

**Defending & Fouls:**
- "Home/Opp Regain Won" - Team wins possession from opponent (look for: "intercepts", "wins ball", "tackles")
- "Home/Opp Foul" - Team commits foul (referee whistles)
- "Home/Opp Offside" - Offside flag raised

**Discipline:**
- "Home/Opp Yellow Card" - Referee shows yellow card
- "Home/Opp Red Card" - Referee shows red card

**Match Structure:**
- "1st Half Start", "1st Half End", "2nd Half Start", "2nd Half End"

**HOW TO EXTRACT:**
Only extract events that are **explicitly mentioned** in the narrative. Don't infer or add events.

**EXTRACTION EXAMPLES:**

**Regain Won:**
- Narrative: "11:41 - Blue player intercepts in midfield" → YOU: "11:41 - Opp Regain Won: Blue intercepts"
- Narrative: "12:30 - White wins the ball with a tackle" → YOU: "12:30 - Home Regain Won: White tackles"

**A3 Entry (entering final third / attacking area):**
- Narrative: "14:20 - Blue advances into White's final third" → YOU: "14:20 - Opp A3 Entry: Blue enters attacking third"
- Narrative: "14:20 - Blue continues their attack towards the penalty area" → YOU: "14:20 - Opp A3 Entry: Blue attacks toward box"
- Narrative: "14:20 - White runs deep into Blue's half" → YOU: "14:20 - Home A3 Entry: White advances deep"
- Narrative: "14:20 - Blue builds attack in White's defensive third" → YOU: "14:20 - Opp A3 Entry: Blue in attacking area"

**Cross:**
- Narrative: "13:20 - White player crosses from right wing" → YOU: "13:20 - Home Cross: White crosses from right"
- Narrative: "15:30 - Blue delivers ball into penalty area from wide" → YOU: "15:30 - Opp Cross: Blue crosses into box"

**Shot at Goal:**
- Narrative: "15:45 - White player takes a shot, goalkeeper saves" → YOU: "15:45 - Home Shot at Goal [Save]: White shoots, keeper saves"
- Narrative: "16:20 - Blue shoots, goes wide" → YOU: "16:20 - Opp Shot at Goal [Off Target]: Blue shoots wide"

**OUTPUT FORMAT:**
MM:SS - Event Code [Tag if needed]: Brief description

**KEY RULES:**
1. **Timestamps:** Already in absolute game time (11:25, 14:33) - use them as-is
2. **Team colors → Home/Away:** Convert using the mapping above
3. **Only what's mentioned:** Don't add events not in the narrative
4. **Merge shot outcomes:** If narrative says "shot" + "save" in same description → ONE event "Shot at Goal [Save]"
5. **Keep fouls separate:** "Foul" and "Free Kick" are TWO events (don't merge)
6. **De-duplicate:** Same event in overlapping clips? Report once at best timestamp
7. **Required tags:** Shots need [Save/On Target/Off Target/Blocked], Free Kicks need [Indirect/On Target/Off Target/Save/Blocked]

**BE CONSERVATIVE:**
- Goals: VERY RARE - only extract if narrative clearly says "ball goes into net" or "scores"
- Kick offs: RARE - only if "takes kick-off" (not "prepares for")
- Don't invent events to fill gaps

**Here is the validated narrative from Stage 2:**

{narrative}

**Now extract all events you can confidently identify:**
Remember - timestamps are already in absolute time (11:25 format), just use them directly. Convert team colors to Home/Opp. Only extract what's explicitly mentioned. Good luck!"""

    # Generate narrative
    model = genai.GenerativeModel('gemini-2.5-pro')  # Using Pro for better extraction accuracy
    
    try:
        response = model.generate_content(prompt)
        narrative = response.text
        
        # Track token usage
        usage = response.usage_metadata
        prompt_tokens = usage.prompt_token_count
        output_tokens = usage.candidates_token_count
        total_tokens = usage.total_token_count
        
        # Calculate cost (2.5 Pro pricing)
        if prompt_tokens > 200_000:
            input_cost = (prompt_tokens / 1_000_000) * 2.50
            output_cost = (output_tokens / 1_000_000) * 15.00
        else:
            input_cost = (prompt_tokens / 1_000_000) * 1.25
            output_cost = (output_tokens / 1_000_000) * 10.00
        total_cost = input_cost + output_cost
        
        # Save narrative
        with open(output_file, 'w') as f:
            f.write(narrative)
        
        # Save prompt for reference
        prompt_file = OUTPUT_DIR / "prompt_stage3.txt"
        with open(prompt_file, 'w') as f:
            f.write("=" * 100 + "\n")
            f.write("STAGE 3: EVENT CLASSIFICATION - PROMPT USED\n")
            f.write("=" * 100 + "\n\n")
            f.write("MODEL: Gemini 2.5 Flash\n")
            f.write("APPROACH: Conservative event extraction with explicit examples\n\n")
            f.write("=" * 100 + "\n")
            f.write("PROMPT:\n")
            f.write("=" * 100 + "\n\n")
            f.write(prompt)
        
        # Save usage stats
        usage_file = OUTPUT_DIR / 'usage_stats_stage3.json'
        usage_stats = {
            'stage': 'stage_3_classification',
            'model': 'gemini-2.5-pro',
            'api_calls': 1,
            'tokens': {
                'prompt_tokens': prompt_tokens,
                'output_tokens': output_tokens,
                'total_tokens': total_tokens
            },
            'cost': {
                'input': round(input_cost, 6),
                'output': round(output_cost, 6),
                'total': round(total_cost, 6)
            }
        }
        
        with open(usage_file, 'w') as f:
            json.dump(usage_stats, f, indent=2)
        
        print(f"✅ Narrative generated")
        print(f"💾 Saved to: {output_file}")
        print(f"\n💰 TOKEN USAGE:")
        print(f"   Input:  {prompt_tokens:,} tokens (${input_cost:.6f})")
        print(f"   Output: {output_tokens:,} tokens (${output_cost:.6f})")
        print(f"   Total:  ${total_cost:.6f}")
        print(f"💾 Usage stats: {usage_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print(f"🏷️  STAGE 3: EVENT CLASSIFICATION")
    print(f"Game: {ARGS.game}")
    print("=" * 50)
    classify_events()
    
    # Auto-generate JSON and XML
    print("\n🔧 Auto-generating JSON and XML...")
    import subprocess
    subprocess.run(["python3", str(Path(__file__).parent / "4_json_extraction.py"), "--game", ARGS.game], check=True)
    subprocess.run(["python3", str(Path(__file__).parent / "5_export_to_anadi_xml.py"), "--game", ARGS.game], check=True)
    print("✅ JSON and XML generated automatically!")
