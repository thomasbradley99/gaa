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
    output_folder = "2-gemini3"
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
You have a coherent narrative describing a GAA match. Your job is to extract DETECTABLE EVENTS ONLY.

{team_mapping}

**DETECTABLE EVENTS (these can be seen on video):**
1. **Shot Home/Away** - Any shot at goal → Add tags: [From Play/From Free/From 45m/From Penalty] + [Point/Wide/Goal/Saved]
2. **Kickout Home/Away** - Goalkeeper restart → Add tags: [Long/Mid/Short] + [Left/Right/Centre] + [Won/Lost]
3. **Turnover Won/Lost Home** - Possession change → Add tags: [Forced/Unforced] + [D1/D2/D3/M1/M2/M3/A1/A2/A3]
4. **Foul Awarded/Conceded Home** - Free kick → Add tag: [Scoreable] if applicable
5. **Throw-up** - Referee restarts play → Add tag: [Won Home/Won Away]

**NON-DETECTABLE (don't extract these):**
- Possession phases
- Attack phases  
- Ball in Play / Stoppage states
- Highlights, Hot Ball
- Generic "Referee" events

**TEAM LABELING:**
- Use "Home" for home team, "Away" for away/opponent team
- Convert colors using the mapping above

**CRITICAL PERSPECTIVE RULES:**

**Turnover Perspective:**
- "Turnover Won Home" = Home team GAINS possession (good for home)
- "Turnover Lost Home" = Home team LOSES possession (bad for home)
- If narrative says "{AWAY_TEAM['jersey_color']} forces turnover" → "Turnover Lost Home"

**Foul Perspective:**
- "Foul Awarded Home" = Free TO home (opponent fouled them)
- "Foul Conceded Home" = Free BY home (home fouled opponent)

**OUTPUT FORMAT:**
MM:SS - Event Code [Tag1] [Tag2]: Brief description

**EXTRACTION EXAMPLES:**
- Narrative: "11:41 - Blue intercepts in midfield" = YOU: "11:41 - Turnover Won Away [Forced] [M2]: Blue intercepts"
- Narrative: "17:15 - Blue shoots, scores a point" = YOU: "17:15 - Shot Away [From Play] [Point]: Blue scores"
- Narrative: "14:20 - Blue keeper takes long kickout toward center, lost" = YOU: "14:20 - Kickout Away [Long] [Centre] [Lost]: Blue restarts"
- Narrative: "18:45 - White commits foul in scoreable area" = YOU: "18:45 - Foul Conceded Home [Scoreable]: White fouls"
- Narrative: "16:30 - Referee throws up ball, White wins" = YOU: "16:30 - Throw-up [Won Home]: Referee restart"

**KEY RULES:**
1. **Timestamps:** Use MM:SS format from narrative
2. **Team colors → Home/Away:** Convert using mapping above
3. **Only what's mentioned:** Don't invent events
4. **Merge shot outcomes:** If "shot" + "point" → ONE event with both tags
5. **Required tags:** 
   - Shots: [From X] + [Outcome]
   - Kickouts: [Length] + [Direction] + [Won/Lost]
   - Turnovers: [Forced/Unforced] + [Zone]
   - Fouls: [Scoreable] if applicable

**Here is the validated narrative segment:**

{narrative_block}

**Now extract all detectable events:**
Output one event per line in format: MM:SS - Event Code [Tags]: Description"""

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
- {HOME_TEAM['jersey_color']} (Home): Attacks {home_attacks}, Shoots toward {home_attacks_toward} goal, Defends {home_defends} goal
- {AWAY_TEAM['jersey_color']} (Away): Attacks {away_attacks}, Shoots toward {away_attacks_toward} goal, Defends {away_defends} goal

USE THIS TO UNDERSTAND:
- "Turnover Won" = Home team GAINS possession (good for Home)
- "Turnover lost" = Home team LOSES possession (bad for Home)
- If Home wins ball in their defensive area ({home_defends} side) = likely a defensive turnover
- If Away shoots toward {away_attacks_toward} goal = "Shot Away"
- If Home shoots toward {home_attacks_toward} goal = "Shot Home" """
    
    model = genai.GenerativeModel('gemini-3-pro-preview', generation_config={"temperature": 0, "top_p": 0.1})
    
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
            thread_model = genai.GenerativeModel('gemini-3-pro-preview', generation_config={"temperature": 0, "top_p": 0.1})
            
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
        
        # Write combined events as text (one per line)
        with open(output_file, 'w') as f:
            f.write("\n".join(all_events))
        
        print(f"✅ Extracted {len(all_events)} events from {len(segment_files)} segment(s)")
        print(f"   Output format: Text (MM:SS - Event Code [Tags]: Description)")
        
    else:
        # No segmented narratives found
        raise FileNotFoundError(f"❌ No narrative segments found. Please run Stage 2 first.")
    
    total_elapsed = time.time() - stage_start_time
    
    # Save usage stats
    usage_file = OUTPUT_DIR / 'usage_stats_stage3.json'
    usage_stats = {
        'stage': 'stage_3_classification',
        'model': 'gemini-3-pro-preview',
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
