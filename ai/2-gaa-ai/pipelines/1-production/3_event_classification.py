#!/usr/bin/env python3
"""
Stage 3: Event Classification - Extract 9 core event types
Usage: python3 3_event_classification.py --game ecnl-2012-vs-op
"""

import os
import json
import re
import argparse
import subprocess
import shutil
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
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
# Load game profile (REQUIRED)
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if not profile_path.exists():
    print("❌ ERROR: game_profile.json not found!")
    print(f"   Expected at: {profile_path}")
    print(f"   Run once: python3 pipelines/1-production/0.5_calibrate_game.py --game {ARGS.game}")
    print(f"   Then manually set 'home_team_assignment' in game_profile.json")
    exit(1)

with open(profile_path, 'r') as f:
    GAME_PROFILE = json.load(f)

home_assignment = GAME_PROFILE.get('home_team_assignment', 'EDIT_ME')
if home_assignment not in {'team_a', 'team_b'}:
    print("")
    print("=" * 70)
    print("❌ FATAL ERROR: home_team_assignment not configured!")
    print("=" * 70)
    print(f"   Current value: '{home_assignment}'")
    print(f"   Expected: 'team_a' or 'team_b'")
    print("")
    print("   HOW TO FIX:")
    print(f"   1. Edit: {profile_path}")
    print("   2. Determine which team is HOME (check ground truth or first kickout)")
    print(f"      - If {GAME_PROFILE['team_a']['jersey_color']} is home → 'home_team_assignment': 'team_a'")
    print(f"      - If {GAME_PROFILE['team_b']['jersey_color']} is home → 'home_team_assignment': 'team_b'")
    print("")
    print("⚠️  DO NOT re-run calibration - just edit the existing file!")
    print("=" * 70)
    exit(1)

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
print(f"   📌 Locked configuration - DO NOT re-run calibration!")

SEGMENT_SECONDS = 10 * 60  # 10-minute windows


def _format_clock(seconds: int) -> str:
    minutes = max(seconds, 0) // 60
    secs = max(seconds, 0) % 60
    return f"{minutes:02d}:{secs:02d}"


def _format_label(seconds: int) -> str:
    minutes = max(seconds, 0) // 60
    secs = max(seconds, 0) % 60
    return f"{minutes:02d}m{secs:02d}s"


def _calc_segment_cost(prompt_tokens: int, output_tokens: int) -> tuple[float, float, float]:
    if prompt_tokens > 200_000:
        input_cost = (prompt_tokens / 1_000_000) * 2.50
        output_cost = (output_tokens / 1_000_000) * 15.00
    else:
        input_cost = (prompt_tokens / 1_000_000) * 1.25
        output_cost = (output_tokens / 1_000_000) * 10.00
    total_cost = input_cost + output_cost
    return input_cost, output_cost, total_cost


def _build_stage3_prompt(narrative_block: str, team_mapping: str, start_seconds: int, end_seconds: int) -> str:
    duration_minutes = max(end_seconds - start_seconds, 60) / 60
    segment_context = (
        f"SEGMENT: {_format_clock(start_seconds)} to {_format_clock(end_seconds)} (~{duration_minutes:.0f} minutes)"
    )

    return f"""Hello! You're the final step in our GAA (Gaelic Athletic Association) event detection pipeline.

{segment_context}

**WHAT YOU'RE WORKING WITH:**
You have a coherent narrative that's already been sanity-checked. Now extract the real events and convert team colors to Own/Opp labels for our database.

{team_mapping}

**YOUR TASK:**
Read the narrative and extract events. The timestamps are already in absolute game time (e.g., 11:25, 14:33), so just use them as-is.

**IMPORTANT - ONLY EXTRACT EVENTS THAT ARE EXPLICITLY MENTIONED:**
Don't invent events, but when the narrative clearly says the ball goes over the bar (point) or into the net (goal), extract it as a score even if there are multiple in the segment.

Handle structured restarts carefully:
- **Scores (Points/Goals):** Any explicit "ball goes over the bar", "ball goes into the net", "scores", or obvious celebration cue → extract as "Shot Own/Opp" with appropriate tag ([Point], [Goal], [Wide]).
- **Kickouts:** Only if it says "takes the kickout" or equivalent restart action (not just "prepares").
- **Throw-ups:** Only if it says "throw-up" or referee restarts play.
- **Half starts/ends:** Only if explicitly stated ("whistle blows to start", "half ends").

**ALL EVENTS TO EXTRACT:**

**GAA EVENTS WE'RE TRACKING:**

**Restarts:**
- "Kickout Own/Opp" - Goalkeeper restarts after a score (add tags: [Long/Mid/Short], [Left/Centre/Right], [Won/Lost])
- "Throw Up" - Referee restarts play from contested ball (add tag: [Won] if team wins possession)

**Possession & Attacks:**
- "Possession Own/Opp" - Team has possession (add tags: [Won/Lost/Turnover/Attack])
- "Pos Own Att/Pos Opp ATT" - Team in possession attacking (add tags: [Turnover/Kickout Own/KIckout Opp])
- "Attack Own/Attack OPP" - Team actively attacking toward goal
- "Turnover Won/Turnover lost" - Possession changes (add tags: [Forced/Unforced], [A1/A2/A3/M1/M2/M3/D1/D2/D3], [attack third/middle third/defensive])

**Shots:**
- "Shot Own/Opp" - ANY strike toward goal (add tags: [From Play/From Free], [Point/Goal/Wide/45m/Short Keeper/Pass / Other/Rebound Post/Save])

**Fouls:**
- "Foul Awarded/Foul Conceded" - Foul committed (team perspective)
- "Scoreable Foul Awarded/Scoreable Foul Conceded" - Foul that results in a scoreable opportunity

**Other:**
- "Ball in Play" - Active play ongoing
- "Stoppage" - Play stopped (add tags: [Point/Goal/Wide])
- "Highlight" - Notable moment (add tags: [Point/Goal])
- "Hot Ball" - Contested ball situation (add tag: [Won])
- "Referee" - Referee decision/whistle

**Match Structure:**
- "1st Half Start", "1st Half End", "2nd Half Start", "2nd Half End"

**HOW TO EXTRACT:**
Only extract events that are **explicitly mentioned** in the narrative. Don't infer or add events.

**EXTRACTION EXAMPLES:**
- Narrative: "11:41 - Blue player intercepts in midfield" → YOU: "11:41 - Turnover Won: Blue intercepts"
- Narrative: "13:20 - White player attacks down the right" → YOU: "13:20 - Attack Own: White attacks"
- Narrative: "17:15 - Blue player takes a shot, scores a point" → YOU: "17:15 - Shot Opp [From Play] [Point]: Blue scores point"
- Narrative: "15:45 - White player takes a shot, goalkeeper saves" → YOU: "15:45 - Shot Own [From Play] [Save]: White shoots, keeper saves"
- Narrative: "14:20 - Blue goalkeeper takes kickout after point" → YOU: "14:20 - Kickout Opp [Long] [Centre] [Lost]: Blue restarts"
- Narrative: "16:30 - Referee throws up ball" → YOU: "16:30 - Throw Up [Won]: Referee restart"
- Narrative: "18:45 - White player scores a goal" → YOU: "18:45 - Shot Own [From Play] [Goal]: White scores goal"
- Narrative: "20:10 - Blue player shoots wide" → YOU: "20:10 - Shot Opp [From Play] [Wide]: Blue shoots wide"
- Narrative: "18:45 - White commits foul, referee awards free" → YOU: "18:45 - Foul Conceded: White fouls"
- Narrative: "20:23 - Blue wins possession in defensive third" → YOU: "20:23 - Turnover Won [Unforced] [D3] [defensive]: Blue wins ball"

**OUTPUT FORMAT:**
MM:SS - Event Code [Tag if needed]: Brief description

**KEY RULES:**
1. **Timestamps:** Already in absolute game time (11:25, 14:33) - use them as-is
2. **Team colors → Own/Opp:** Convert using the mapping and spatial context above
3. **TURNOVER PERSPECTIVE** (CRITICAL - use spatial context!):
   - "Turnover Won" = HOME team GAINS possession from opponent
   - "Turnover lost" = HOME team LOSES possession to opponent
   - If narrative says "White forces turnover" and White=Away → "Turnover lost" for Home
4. **FOUL PERSPECTIVE** (use context!):
   - "Foul Awarded" = Free TO home (opponent fouled us)
   - "Foul Conceded" = Free BY home (we fouled opponent)
5. **Only what's mentioned:** Don't add events not in the narrative
6. **Merge shot outcomes:** If narrative says "shot" + "point/goal/wide" → ONE event with both tags
7. **Keep fouls separate:** "Foul" and resulting "Shot" are separate events
8. **Avoid duplicates:** If same event described twice, report clearest instance once
9. **Required tags:** Shots need [From Play/From Free] + outcome, Kickouts need distance + direction + Won/Lost

**QUALITY BAR:**
- Extract every event that is clearly described, including multiple scores when the language supports it.
- Kickouts should follow scores - verify the sequence makes sense.
- Don't invent events to fill gaps.

**Here is the validated narrative segment:**

{narrative_block}

**Now extract all events you can confidently identify:**
Remember - timestamps are already in absolute time (11:25 format), just use them directly. Convert team colors to Own/Opp. Only extract what's explicitly mentioned. Good luck!"""
def _parse_segment_narrative(narrative_text: str) -> str:
    """Extract actual narrative content, skipping segment headers."""
    lines = []
    in_segment = False
    for line in narrative_text.splitlines():
        if line.startswith("===== SEGMENT"):
            in_segment = True
            continue
        if in_segment and line.strip():
            lines.append(line)
        if line.strip() == "" and in_segment:
            # End of segment marker
            pass
    return "\n".join(lines).strip()


def _find_segment_files() -> list[Path]:
    """Find all segment narrative files from Stage 2."""
    segments_dir = OUTPUT_DIR / "2_narrative_segments"
    if not segments_dir.exists():
        return []
    
    segment_files = sorted(segments_dir.glob("segment_*.txt"))
    return segment_files


def classify_events():
    """Classify events from coherent narrative using GAA logic - processes 20-minute segments."""
    
    # Check for segmented narratives first
    segment_files = _find_segment_files()
    narrative_file = OUTPUT_DIR / "2_narrative.txt"
    observations_file = OUTPUT_DIR / "1_observations.txt"
    
    output_file = OUTPUT_DIR / "3_events_classified.txt"
    constraints_file = SCHEMA_DIR / "constraints.json"
    
    # Load constraints to guide tag emission
    constraints = {}
    try:
        with open(constraints_file, 'r') as f:
            constraints = json.load(f).get('actions', {})
    except Exception:
        constraints = {}
    
    # Build team mapping for prompt with spatial context
    # Determine which half we're in for attack directions
    match_times = GAME_PROFILE.get('match_times', {})
    half_time = match_times.get('half_time', 1800)
    
    # Get attack directions based on segment start time
    if OUTPUT_DIR.name.startswith('segment_'):
        # Parse segment number to estimate time
        segment_start = 0
    else:
        segment_start = 0
    
    # Use 1st half directions by default (most segments)
    current_half = "1st half"
    home_attacks = HOME_TEAM['attack_direction_1st_half']
    away_attacks = AWAY_TEAM['attack_direction_1st_half']
    
    # Determine defending sides
    if home_attacks == "right-to-left":
        home_defends = "LEFT side"
        home_attacks_toward = "RIGHT side"
    else:
        home_defends = "RIGHT side"
        home_attacks_toward = "LEFT side"
        
    if away_attacks == "left-to-right":
        away_defends = "LEFT side"
        away_attacks_toward = "RIGHT side"
    else:
        away_defends = "RIGHT side"
        away_attacks_toward = "LEFT side"
    
    team_mapping = f"""Teams (convert colors to Home/Away):
- Home = {HOME_TEAM['jersey_color']} ({HOME_TEAM['keeper_color']} goalkeeper)
- Away/Opp = {AWAY_TEAM['jersey_color']} ({AWAY_TEAM['keeper_color']} goalkeeper)

SPATIAL CONTEXT ({current_half}):
- {HOME_TEAM['jersey_color']} (Home): Attacks {home_attacks} → Shoots toward {home_attacks_toward} goal, Defends {home_defends} goal
- {AWAY_TEAM['jersey_color']} (Away): Attacks {away_attacks} → Shoots toward {away_attacks_toward} goal, Defends {away_defends} goal

USE THIS TO UNDERSTAND:
- "Turnover Won" = Home team GAINS possession (good for Home)
- "Turnover lost" = Home team LOSES possession (bad for Home)
- If Home wins ball in their defensive area ({home_defends} side) → likely a defensive turnover
- If Away shoots toward {away_attacks_toward} goal → "Shot Opp"
- If Home shoots toward {home_attacks_toward} goal → "Shot Own" """
    
    model = genai.GenerativeModel('gemini-2.5-pro', generation_config={"temperature": 0, "top_p": 0.1})
    
    all_events: list[str] = []
    totals = {
        'prompt_tokens': 0,
        'output_tokens': 0,
        'total_tokens': 0,
        'input_cost': 0.0,
        'output_cost': 0.0,
        'total_cost': 0.0,
        'api_calls': 0
    }
    segment_stats = []
    
    stage_start_time = time.time()
    
    # Process segmented narratives if available
    if segment_files:
        print(f"📖 Found {len(segment_files)} narrative segment(s) - processing in parallel")
        
        def process_segment_file(args):
            """Process a single segment file - designed for parallel execution"""
            seg_idx, seg_file = args
            
            with open(seg_file, 'r') as f:
                segment_narrative = f.read().strip()
            
            # Extract time range from filename (e.g., segment_01_11m00s-31m00s.txt)
            match = re.search(r'(\d+)m(\d+)s-(\d+)m(\d+)s', seg_file.name)
            if match:
                start_min = int(match.group(1))
                start_sec = int(match.group(2))
                end_min = int(match.group(3))
                end_sec = int(match.group(4))
                start_seconds = start_min * 60 + start_sec
                end_seconds = end_min * 60 + end_sec
            else:
                start_seconds = (seg_idx - 1) * SEGMENT_SECONDS
                end_seconds = start_seconds + SEGMENT_SECONDS
            
            print(f"   ⏱️  Processing segment {seg_idx}/{len(segment_files)}: {_format_clock(start_seconds)}-{_format_clock(end_seconds)}...", end="", flush=True)
            
            prompt_text = _build_stage3_prompt(segment_narrative, team_mapping, start_seconds, end_seconds)
            
            # Create model instance per thread (thread-safe)
            thread_model = genai.GenerativeModel('gemini-2.5-pro', generation_config={"temperature": 0, "top_p": 0.1})
            
            try:
                seg_start_time = time.time()
                response = thread_model.generate_content(prompt_text)
                seg_elapsed = time.time() - seg_start_time
                print(f" {seg_elapsed:.1f}s")
                events_text = response.text.strip()
                
                # Extract event lines (skip any header/footer text)
                event_lines = []
                for line in events_text.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    # Look for timestamp pattern (MM:SS)
                    if re.match(r'\d{1,2}:\d{2}', line):
                        event_lines.append(line)
                
                # Track usage
                usage = response.usage_metadata
                prompt_tokens = usage.prompt_token_count
                output_tokens = usage.candidates_token_count
                total_tokens = usage.total_token_count
                input_cost, output_cost, total_cost = _calc_segment_cost(prompt_tokens, output_tokens)
                
                return {
                    'seg_idx': seg_idx,
                    'event_lines': event_lines,
                    'start_seconds': start_seconds,
                    'end_seconds': end_seconds,
                    'prompt_tokens': prompt_tokens,
                    'output_tokens': output_tokens,
                    'total_tokens': total_tokens,
                    'input_cost': input_cost,
                    'output_cost': output_cost,
                    'total_cost': total_cost,
                    'time_seconds': seg_elapsed
                }
                
            except Exception as e:
                print(f"\n❌ Error processing segment {seg_idx}: {e}")
                return None
        
        # Process segments in parallel
        segment_args = [(idx, seg_file) for idx, seg_file in enumerate(segment_files, 1)]
        results = []
        
        with ThreadPoolExecutor(max_workers=min(6, len(segment_args))) as executor:
            future_to_segment = {executor.submit(process_segment_file, args): args[0] for args in segment_args}
            
            for future in as_completed(future_to_segment):
                seg_idx = future_to_segment[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                except Exception as e:
                    print(f"\n❌ Error processing segment {seg_idx}: {e}")
        
        # Sort results by seg_idx to maintain chronological order
        results.sort(key=lambda x: x['seg_idx'])
        
        # Aggregate results
        for result in results:
            all_events.extend(result['event_lines'])
            
            totals['prompt_tokens'] += result['prompt_tokens']
            totals['output_tokens'] += result['output_tokens']
            totals['total_tokens'] += result['total_tokens']
            totals['input_cost'] += result['input_cost']
            totals['output_cost'] += result['output_cost']
            totals['total_cost'] += result['total_cost']
            totals['api_calls'] += 1
            
            segment_stats.append({
                'segment': result['seg_idx'],
                'start_seconds': result['start_seconds'],
                'end_seconds': result['end_seconds'],
                'events_extracted': len(result['event_lines']),
                'prompt_tokens': result['prompt_tokens'],
                'output_tokens': result['output_tokens'],
                'total_tokens': result['total_tokens'],
                'input_cost': round(result['input_cost'], 6),
                'output_cost': round(result['output_cost'], 6),
                'total_cost': round(result['total_cost'], 6),
                'time_seconds': round(result['time_seconds'], 2)
            })
        
        # Write combined events
        with open(output_file, 'w') as f:
            f.write("\n".join(all_events))
        
        print(f"✅ Extracted {len(all_events)} events from {len(segment_files)} segment(s)")
        
    else:
        # Fallback: process full narrative (backward compatibility)
        if narrative_file.exists():
            input_file = narrative_file
            print(f"📖 Using full validated narrative from Stage 2")
        elif observations_file.exists():
            input_file = observations_file
            print(f"⚠️  No 2_narrative.txt found - using raw observations (Stage 2 was skipped)")
        else:
            raise FileNotFoundError(f"❌ No input files found")
        
        with open(input_file, 'r') as f:
            narrative = f.read()
        
        print(f"📖 Loaded: {len(narrative)} characters")
        
        # Use the old prompt format for backward compatibility
        prompt_text = f"""Hello! You're the final step in our GAA (Gaelic Athletic Association) event detection pipeline.

**WHAT YOU'RE WORKING WITH:**
You have a coherent narrative that's already been sanity-checked. Now extract the real events and convert team colors to Own/Opp labels for our database.

{team_mapping}

**YOUR TASK:**
Read the narrative and extract events. The timestamps are already in absolute game time (e.g., 11:25, 14:33), so just use them as-is.

**IMPORTANT - ONLY EXTRACT EVENTS THAT ARE EXPLICITLY MENTIONED:**
Don't invent events, but when the narrative clearly says the ball goes over the bar (point) or into the net (goal), extract it as a score even if there are multiple in the segment.

Handle structured restarts carefully:
- **Scores (Points/Goals):** Any explicit "ball goes over the bar", "ball goes into the net", "scores", or obvious celebration cue → extract as "Shot Own/Opp" with appropriate tag ([Point], [Goal], [Wide]).
- **Kickouts:** Only if it says "takes the kickout" or equivalent restart action (not just "prepares").
- **Throw-ups:** Only if it says "throw-up" or referee restarts play.
- **Half starts/ends:** Only if explicitly stated ("whistle blows to start", "half ends").

**ALL EVENTS TO EXTRACT:**

**GAA EVENTS WE'RE TRACKING:**

**Restarts:**
- "Kickout Own/Opp" - Goalkeeper restarts after a score (add tags: [Long/Mid/Short], [Left/Centre/Right], [Won/Lost])
- "Throw Up" - Referee restarts play from contested ball (add tag: [Won] if team wins possession)

**Possession & Attacks:**
- "Possession Own/Opp" - Team has possession (add tags: [Won/Lost/Turnover/Attack])
- "Pos Own Att/Pos Opp ATT" - Team in possession attacking (add tags: [Turnover/Kickout Own/KIckout Opp])
- "Attack Own/Attack OPP" - Team actively attacking toward goal
- "Turnover Won/Turnover lost" - Possession changes (add tags: [Forced/Unforced], [A1/A2/A3/M1/M2/M3/D1/D2/D3], [attack third/middle third/defensive])

**Shots:**
- "Shot Own/Opp" - ANY strike toward goal (add tags: [From Play/From Free], [Point/Goal/Wide/45m/Short Keeper/Pass / Other/Rebound Post/Save])

**Fouls:**
- "Foul Awarded/Foul Conceded" - Foul committed (team perspective)
- "Scoreable Foul Awarded/Scoreable Foul Conceded" - Foul that results in a scoreable opportunity

**Other:**
- "Ball in Play" - Active play ongoing
- "Stoppage" - Play stopped (add tags: [Point/Goal/Wide])
- "Highlight" - Notable moment (add tags: [Point/Goal])
- "Hot Ball" - Contested ball situation (add tag: [Won])
- "Referee" - Referee decision/whistle

**Match Structure:**
- "1st Half Start", "1st Half End", "2nd Half Start", "2nd Half End"

**HOW TO EXTRACT:**
Only extract events that are **explicitly mentioned** in the narrative. Don't infer or add events.

**EXTRACTION EXAMPLES:**
- Narrative: "11:41 - Blue player intercepts in midfield" → YOU: "11:41 - Turnover Won: Blue intercepts"
- Narrative: "13:20 - White player attacks down the right" → YOU: "13:20 - Attack Own: White attacks"
- Narrative: "17:15 - Blue player takes a shot, scores a point" → YOU: "17:15 - Shot Opp [From Play] [Point]: Blue scores point"
- Narrative: "15:45 - White player takes a shot, goalkeeper saves" → YOU: "15:45 - Shot Own [From Play] [Save]: White shoots, keeper saves"
- Narrative: "14:20 - Blue goalkeeper takes kickout after point" → YOU: "14:20 - Kickout Opp [Long] [Centre] [Lost]: Blue restarts"
- Narrative: "16:30 - Referee throws up ball" → YOU: "16:30 - Throw Up [Won]: Referee restart"
- Narrative: "18:45 - White player scores a goal" → YOU: "18:45 - Shot Own [From Play] [Goal]: White scores goal"
- Narrative: "20:10 - Blue player shoots wide" → YOU: "20:10 - Shot Opp [From Play] [Wide]: Blue shoots wide"
- Narrative: "18:45 - White commits foul, referee awards free" → YOU: "18:45 - Foul Conceded: White fouls"
- Narrative: "20:23 - Blue wins possession in defensive third" → YOU: "20:23 - Turnover Won [Unforced] [D3] [defensive]: Blue wins ball"

**OUTPUT FORMAT:**
MM:SS - Event Code [Tag if needed]: Brief description

**KEY RULES:**
1. **Timestamps:** Already in absolute game time (11:25, 14:33) - use them as-is
2. **Team colors → Own/Opp:** Convert using the mapping and spatial context above
3. **TURNOVER PERSPECTIVE** (CRITICAL - use spatial context!):
   - "Turnover Won" = HOME team GAINS possession from opponent
   - "Turnover lost" = HOME team LOSES possession to opponent
   - If narrative says "White forces turnover" and White=Away → "Turnover lost" for Home
4. **FOUL PERSPECTIVE** (use context!):
   - "Foul Awarded" = Free TO home (opponent fouled us)
   - "Foul Conceded" = Free BY home (we fouled opponent)
5. **Only what's mentioned:** Don't add events not in the narrative
6. **Merge shot outcomes:** If narrative says "shot" + "point/goal/wide" → ONE event with both tags
7. **Keep fouls separate:** "Foul" and resulting "Shot" are separate events
8. **Avoid duplicates:** If same event described twice, report clearest instance once
9. **Required tags:** Shots need [From Play/From Free] + outcome, Kickouts need distance + direction + Won/Lost

**QUALITY BAR:**
- Extract every event that is clearly described, including multiple scores when the language supports it.
- Kickouts should follow scores - verify the sequence makes sense.
- Don't invent events to fill gaps.

**Here is the validated narrative from Stage 2:**

{narrative}

**Now extract all events you can confidently identify:**
Remember - timestamps are already in absolute time (11:25 format), just use them directly. Convert team colors to Own/Opp. Only extract what's explicitly mentioned. Good luck!"""
        
        try:
            response = model.generate_content(prompt_text)
            events_text = response.text.strip()
            
            with open(output_file, 'w') as f:
                f.write(events_text)
            
            # Track usage
            usage = response.usage_metadata
            prompt_tokens = usage.prompt_token_count
            output_tokens = usage.candidates_token_count
            total_tokens = usage.total_token_count
            input_cost, output_cost, total_cost = _calc_segment_cost(prompt_tokens, output_tokens)
            
            totals['prompt_tokens'] = prompt_tokens
            totals['output_tokens'] = output_tokens
            totals['total_tokens'] = total_tokens
            totals['input_cost'] = input_cost
            totals['output_cost'] = output_cost
            totals['total_cost'] = total_cost
            totals['api_calls'] = 1
            
            print(f"✅ Events extracted")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise
    
    total_elapsed = time.time() - stage_start_time
    
    # Save usage stats
    usage_file = OUTPUT_DIR / 'usage_stats_stage3.json'
    usage_stats = {
        'stage': 'stage_3_classification',
        'model': 'gemini-2.5-pro',
        'segments_processed': len(segment_files) if segment_files else 1,
        'total_time_seconds': round(total_elapsed, 2),
        'segments': segment_stats if segment_stats else None,
        'api_calls': totals['api_calls'],
        'tokens': {
            'prompt_tokens': totals['prompt_tokens'],
            'output_tokens': totals['output_tokens'],
            'total_tokens': totals['total_tokens']
        },
        'cost': {
            'input': round(totals['input_cost'], 6),
            'output': round(totals['output_cost'], 6),
            'total': round(totals['total_cost'], 6)
        }
    }
    
    with open(usage_file, 'w') as f:
        json.dump(usage_stats, f, indent=2)
    
    print(f"💾 Saved to: {output_file}")
    print(f"⏱️  Total time: {total_elapsed:.1f}s ({total_elapsed/60:.1f} minutes)")
    print(f"\n💰 TOKEN USAGE:")
    print(f"   Input:  {totals['prompt_tokens']:,} tokens (${totals['input_cost']:.6f})")
    print(f"   Output: {totals['output_tokens']:,} tokens (${totals['output_cost']:.6f})")
    print(f"   Total:  ${totals['total_cost']:.6f}")
    print(f"💾 Usage stats: {usage_file}")

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
