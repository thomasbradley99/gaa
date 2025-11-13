#!/usr/bin/env python3
"""
Stage 2: Create Coherent Narrative from Visual Observations

Reads raw observations from Stage 1, validates sequences, fixes logic errors,
creates a coherent narrative of what happened.
"""

import os
import json
import re
import shutil
import argparse
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment
load_dotenv('/home/ubuntu/clann/CLANNAI/.env')

# Paths
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
ARGS = parser.parse_args()

PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game

# Auto-detect output folder from Stage 1
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
    print(f"📁 Using output folder from Stage 1: {output_folder}")
else:
    output_folder = "6-with-audio"
    print(f"⚠️  No .current_run.txt found, using default: {output_folder}")

INPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder

# Configure Gemini
api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Load game profile
GAME_PROFILE = None
profile_path = GAME_ROOT / "inputs" / "game_profile.json"
if profile_path.exists():
    with open(profile_path, 'r') as f:
        GAME_PROFILE = json.load(f)
    print(f"✅ Game profile loaded")

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


def _build_stage2_prompt(observations_block: str, start_seconds: int, end_seconds: int) -> str:
    duration_minutes = max(end_seconds - start_seconds, 60) / 60
    time_context = (
        f"TIME RANGE: You are analyzing {_format_clock(start_seconds)} to {_format_clock(end_seconds)} "
        f"(~{duration_minutes:.0f} minutes)"
    )

    # Build team context from profile if available
    if GAME_PROFILE:
        team_a = GAME_PROFILE['team_a']
        team_b = GAME_PROFILE['team_b']
        team_info = f"""TEAMS (refer to them ONLY by jersey color):
- {team_a['jersey_color']} ({team_a['keeper_color']} keeper)
- {team_b['jersey_color']} ({team_b['keeper_color']} keeper)

{time_context}"""
    else:
        team_info = (
            "Teams are referred to by their jersey colors in the observations.\n\n"
            f"{time_context}"
        )

    return f"""Hello! I need your help creating a coherent narrative from GAA (Gaelic Athletic Association) match observations.

{team_info}

**THE CHALLENGE:**
We're using an AI system to analyze a GAA match. Stage 1 produces observations from continuous 60-second clips (one per minute, no overlap). Even with full context, the video+audio model still hallucinates around scoring action, so we rely on you to clean it up.

However, the AI still sometimes "sees" things that didn't happen - especially scores. It might see:
- A shot near the goal → incorrectly assumes it scored
- Players walking to restart position → assumes it's post-score restart
- Any celebration → assumes a score was made

**YOUR CRITICAL TASK:**
You're the validation layer. Read these clip observations chronologically and create a COHERENT, LOGICAL narrative of what actually happened. Your job is to:

1. Confirm and KEEP real events that have clear evidence (especially scores with "ball goes over bar" or "ball goes into net" language)
2. Remove obvious hallucinations that contradict the flow of play
3. Use GAA logic to validate sequences
4. Preserve all real, important details
5. Infer missing events from outcomes (e.g., kickout = score before) only when the observation already hints at it
6. Create a clean, chronological timeline of actual events

**WHAT EVENTS ARE WE TRYING TO DETECT?**

The next stage will try to identify GAA event types from your narrative:

**Match Flow:** Half starts/ends, Throw-ups
**Restarts:** Kickouts (after scores), Throw-ups (from referee)
**Attacking:** Possession Own/Opp, Attacks, Shots (Points/Goals/Wides)
**Defending:** Turnovers (Won/Lost), Fouls (Awarded/Conceded)
**Other:** Ball in Play, Stoppages, Highlights, Referee decisions

**CRITICAL - PRESERVE AND INFER POSSESSION:**
Your narrative feeds into the next stage, so you MUST preserve and infer:

- **POSSESSION START/END INFERENCE:**
  * Stage 1 mentions "has possession", "is in possession", "gains possession" - these are possession START points
  * You need to INFER when possession ENDS by looking for:
    - Turnovers: "intercepts", "wins the ball", "tackles", "loses possession" → Previous possession ends, new one starts
    - Shots: When a team shoots, their possession ends (shot is the end of that possession)
    - Kickouts: When a kickout happens, the team taking it gains possession (previous possession ended)
    - Throw-ups: When a throw-up happens, possession changes
  * Mark possession periods explicitly: "X:XX - [Team] has possession" and "Y:YY - [Team] possession ends" or "Y:YY - [Other team] gains possession"
  * Possession can last 30 seconds to 2+ minutes - infer the duration from when it starts to when it ends

- **Other events to preserve:**
- **Possession changes:** "intercepts", "wins the ball", "gains possession", "regains possession", "tackles" → These become "Turnover Won" events
- **Attacks:** "attacks", "builds attack", "advances forward" → "Attack Own/Opp" events
- **Shots:** any mention of shooting, striking toward goal → "Shot Own/Opp" events (with Point/Goal/Wide outcomes)
- **Kickouts:** goalkeeper restarts after scores → "Kickout Own/Opp" events
- **Throw-ups:** referee restarts → "Throw Up" events
- **Fouls:** referee whistles, fouls, challenges → "Foul Awarded/Conceded" events

DO NOT oversimplify or remove these - they're essential for the next stage to detect events!

**HOW TO HANDLE SCORES:**

Scores (Points and Goals) can appear multiple times in a short span, so focus on the strength of the evidence rather than an arbitrary cap:

- KEEP the score if the observations clearly mention the ball going over the bar (point) or into the net (goal) **and** there is any supporting sign (celebration, scoreboard change, kickout restart, etc.).
- REMOVE a score only if the narrative contradicts itself (e.g., immediate restart with a throw-up in the same spot) or if there is zero mention of the ball scoring.
- Multiple kickouts in one segment are acceptable when they follow legitimate scores. Use kickouts as supporting evidence, not as a hard limit.

Common false patterns to watch for:
- "Players walking to restart position" without a prior score description.
- Shots that never actually score (wide, saved, blocked).

**YOUR VALIDATION TOOLKIT:**

Use these GAA logic patterns to validate what you read:

**Forward validation (cause must lead to effect):**
- **Score (Point/Goal) → Kickout or celebration:** Real scores are usually followed by a kickout restart or clear celebratory language. If the score description is strong but the restart is missing, keep the score and simply note the restart is implied.
- **Foul → Free kick/Scoreable foul:** Usually (but not always) follows within 5-30s. Keep both if you see them.

**Backward validation (effect reveals cause):**
- **Kickout → Score:** If you see a kickout, look 5-20s before. Did the observations mention a shot or score? If yes, connect them ("Shot at goal, scores a point"). If not mentioned, don't infer it.
- **Throw-up → Stoppage:** Look 5-15s before. Was there a contested ball or stoppage? Connect them if explicitly mentioned.
- **Free kick → Foul:** Look 5-30s before. Was a whistle/foul mentioned? Connect them if found.

**Conservative inference principle:**
Only infer missing events if there's explicit evidence in the observations. Don't add events that weren't mentioned - that's just more hallucination!

**What to remove:**
- Sequences that are chronologically impossible (e.g., kickout before game starts)
- Scores that never mention the ball scoring and have no supporting cues
- Duplicate descriptions of the same event when only one actually happened

**OUTPUT FORMAT:**
Keep the same format as the input observations - organized by clip with timestamps:

[XXXs] clip_name: Brief summary of what happened.
11:25 - [Team color] player [ACTION DESCRIPTION]
11:33 - [Next event]

Keep it detailed for important events:
✅ GOOD: "11:25 - White player intercepts the pass in midfield"
❌ BAD: "11:25 - Play continues in midfield" (too vague - we lose the interception!)

**FINAL CHECKLIST BEFORE YOU FINISH:**
1. Did you keep every score (point/goal) that had clear "ball over bar" or "ball into net" language?
2. For any score you removed, did you document the reason in the validation notes?
3. Did you infer possession START and END points? (When team gains possession → START, when they lose it → END)
4. Did you preserve possession changes? (intercepts, tackles, turnovers)
5. Did you preserve restarts? (kickouts, throw-ups)
6. Did you preserve attacks and shots?

Remember: You're helping us filter out hallucinations, not add more. When in doubt, be skeptical of dramatic claims (especially scores).

**Here are the observations from the video AI:**

{observations_block}

**Now create your coherent narrative:**

**FORMAT YOUR RESPONSE:**
1. Start immediately with the coherent narrative (same format as observations)
2. At the very END, add a brief validation note explaining any goals/kickoffs you removed

Example structure:
```
[680s] clip_name: Description
11:20 - Event description
11:25 - Event description
...
[rest of narrative]
...

---
VALIDATION NOTES:
- Removed score at XX:XX (no kickout after)
- Kept 1 throw-up total (at start of period)
```

Remember - count those kickouts! If you have many kickouts, verify they follow legitimate scores. Good luck!"""
def _segment_observations(observations_text: str) -> list[dict]:
    segments: dict[int, dict] = {}
    order: list[int] = []
    current_index = None
    current_timestamp = 0

    for line in observations_text.splitlines():
        timestamp_match = re.match(r"\[(\d+)s\]", line)
        if timestamp_match:
            current_timestamp = int(timestamp_match.group(1))
            current_index = current_timestamp // SEGMENT_SECONDS
        if current_index is None:
            current_index = 0
        if current_index not in segments:
            segments[current_index] = {
                'lines': [],
                'start_seconds': None,
                'end_seconds': None
            }
            order.append(current_index)
        segment = segments[current_index]
        if timestamp_match:
            clip_start = int(timestamp_match.group(1))
            clip_end = clip_start + 60
            if segment['start_seconds'] is None or clip_start < segment['start_seconds']:
                segment['start_seconds'] = clip_start
            if segment['end_seconds'] is None or clip_end > segment['end_seconds']:
                segment['end_seconds'] = clip_end
        segment['lines'].append(line)

    structured_segments = []
    last_end = 0
    for idx in order:
        segment = segments[idx]
        start_seconds = segment['start_seconds'] if segment['start_seconds'] is not None else last_end
        end_seconds = segment['end_seconds'] if segment['end_seconds'] is not None else start_seconds + SEGMENT_SECONDS
        last_end = max(last_end, end_seconds)
        structured_segments.append({
            'index': idx,
            'start_seconds': start_seconds,
            'end_seconds': end_seconds,
            'lines': segment['lines']
        })

    return structured_segments

def create_narrative():
    """Create coherent narrative from visual observations in 20-minute segments."""

    input_file = OUTPUT_DIR / "1_observations.txt"
    output_file = OUTPUT_DIR / "2_narrative.txt"
    segments_dir = OUTPUT_DIR / "2_narrative_segments"
    prompt_dir = OUTPUT_DIR / "2_prompt_segments"

    if not input_file.exists():
        raise FileNotFoundError(f"❌ Input file not found: {input_file}")

    for path in (segments_dir, prompt_dir):
        if path.exists():
            shutil.rmtree(path)
        path.mkdir(parents=True, exist_ok=True)

    observations = input_file.read_text()
    print(f"📖 Loaded observations: {len(observations)} characters")

    segments = _segment_observations(observations)
    if not segments:
        raise ValueError("❌ Unable to segment observations into 10-minute windows")

    print(f"📊 Segmented into {len(segments)} segment(s) (~10 minutes each)")
    
    model = genai.GenerativeModel(
        'gemini-2.5-pro',
        generation_config={"temperature": 0, "top_p": 0.1}
    )

    combined_lines: list[str] = []
    segments_meta: list[dict] = []
    usage_segments: list[dict] = []

    totals = {
        'prompt_tokens': 0,
        'output_tokens': 0,
        'total_tokens': 0,
        'input_cost': 0.0,
        'output_cost': 0.0,
        'total_cost': 0.0,
        'count': 0,
        'total_time_seconds': 0.0
    }

    stage_start_time = time.time()
    
    def process_segment(args):
        """Process a single segment - designed for parallel execution"""
        order_idx, segment = args
        segment_text = "\n".join(segment['lines']).strip()
        if not segment_text:
            return None

        start_seconds = segment['start_seconds'] or (segment['index'] * SEGMENT_SECONDS)
        end_seconds = segment['end_seconds'] or (start_seconds + SEGMENT_SECONDS)
        label = f"{_format_label(start_seconds)}-{_format_label(end_seconds)}"

        prompt_text = _build_stage2_prompt(segment_text, start_seconds, end_seconds)
        prompt_file = prompt_dir / f"2_prompt_segment_{order_idx:02d}_{label}.txt"
        prompt_file.write_text(prompt_text)

        # Create model instance per thread (thread-safe)
        thread_model = genai.GenerativeModel(
            'gemini-2.5-pro',
            generation_config={"temperature": 0, "top_p": 0.1}
        )

        seg_start_time = time.time()
        print(f"   ⏱️  Processing segment {order_idx}/{len(segments)}...", end="", flush=True)
        response = thread_model.generate_content(prompt_text)
        seg_elapsed = time.time() - seg_start_time
        print(f" {seg_elapsed:.1f}s")
        narrative_text = response.text.strip()

        segment_file = segments_dir / f"segment_{order_idx:02d}_{label}.txt"
        segment_file.write_text(narrative_text + "\n")

        usage = response.usage_metadata
        prompt_tokens = usage.prompt_token_count
        output_tokens = usage.candidates_token_count
        total_tokens = usage.total_token_count
        input_cost, output_cost, total_cost = _calc_segment_cost(prompt_tokens, output_tokens)

        return {
            'order_idx': order_idx,
            'narrative_text': narrative_text,
            'start_seconds': start_seconds,
            'end_seconds': end_seconds,
            'label': label,
            'prompt_file': prompt_file.name,
            'segment_file': segment_file.name,
            'index': segment['index'],
            'prompt_tokens': prompt_tokens,
            'output_tokens': output_tokens,
            'total_tokens': total_tokens,
            'input_cost': input_cost,
            'output_cost': output_cost,
            'total_cost': total_cost,
            'time_seconds': seg_elapsed
        }
    
    # Process segments in parallel
    print(f"🚀 Processing {len(segments)} segment(s) in parallel...")
    segment_args = [(idx, seg) for idx, seg in enumerate(segments, start=1) if "\n".join(seg['lines']).strip()]
    
    results = []
    with ThreadPoolExecutor(max_workers=min(6, len(segment_args))) as executor:
        future_to_segment = {executor.submit(process_segment, args): args[0] for args in segment_args}
        
        for future in as_completed(future_to_segment):
            order_idx = future_to_segment[future]
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception as e:
                print(f"\n❌ Error processing segment {order_idx}: {e}")
    
    # Sort results by order_idx to maintain chronological order
    results.sort(key=lambda x: x['order_idx'])
    
    # Aggregate results
    for result in results:
        combined_lines.append(
            f"===== SEGMENT {result['order_idx']:02d} ({_format_clock(result['start_seconds'])}-{_format_clock(result['end_seconds'])}) ====="
        )
        combined_lines.append(result['narrative_text'])
        combined_lines.append("")

        totals['prompt_tokens'] += result['prompt_tokens']
        totals['output_tokens'] += result['output_tokens']
        totals['total_tokens'] += result['total_tokens']
        totals['input_cost'] += result['input_cost']
        totals['output_cost'] += result['output_cost']
        totals['total_cost'] += result['total_cost']
        totals['count'] += 1
        totals['total_time_seconds'] += result['time_seconds']
        
        usage_segments.append({
            'segment_order': result['order_idx'],
            'start_seconds': result['start_seconds'],
            'end_seconds': result['end_seconds'],
            'prompt_tokens': result['prompt_tokens'],
            'output_tokens': result['output_tokens'],
            'total_tokens': result['total_tokens'],
            'input_cost': round(result['input_cost'], 6),
            'output_cost': round(result['output_cost'], 6),
            'total_cost': round(result['total_cost'], 6),
            'time_seconds': round(result['time_seconds'], 2)
        })

        segments_meta.append({
            'segment_order': result['order_idx'],
            'index': result['index'],
            'start_seconds': result['start_seconds'],
            'end_seconds': result['end_seconds'],
            'prompt_file': result['prompt_file'],
            'file': result['segment_file']
        })

    if not usage_segments:
        raise ValueError("❌ No narrative segments were generated")

    output_file.write_text("\n".join(combined_lines).strip() + "\n")

    with (segments_dir / "segments_metadata.json").open('w') as meta_fp:
        json.dump(segments_meta, meta_fp, indent=2)

    summary_text = "\n".join([
        "Stage 2 prompts are saved per segment in 2_prompt_segments/",
        "Segment narratives are saved in 2_narrative_segments/",
        "Segments metadata stored in 2_narrative_segments/segments_metadata.json"
    ]) + "\n"
    (OUTPUT_DIR / "2_prompt.txt").write_text(summary_text)

    avg_prompt_tokens = totals['prompt_tokens'] // totals['count']
    avg_output_tokens = totals['output_tokens'] // totals['count']
    avg_total_tokens = totals['total_tokens'] // totals['count']
    avg_cost = totals['total_cost'] / totals['count']

    total_elapsed = time.time() - stage_start_time
    
    usage_stats = {
        'stage': 'stage_2_narrative',
        'model': 'gemini-2.5-pro',
        'segments_processed': totals['count'],
        'total_time_seconds': round(total_elapsed, 2),
        'segments': usage_segments,
        'tokens': {
            'prompt_tokens': totals['prompt_tokens'],
            'output_tokens': totals['output_tokens'],
            'total_tokens': totals['total_tokens']
        },
        'cost': {
            'input': round(totals['input_cost'], 6),
            'output': round(totals['output_cost'], 6),
            'total': round(totals['total_cost'], 6)
        },
        'per_segment_avg': {
            'prompt_tokens': avg_prompt_tokens,
            'output_tokens': avg_output_tokens,
            'total_tokens': avg_total_tokens,
            'cost': round(avg_cost, 6),
            'time_seconds': round(totals['total_time_seconds'] / totals['count'], 2) if totals['count'] > 0 else 0
        }
    }

    usage_file = OUTPUT_DIR / '2_usage_stats.json'
    usage_file.write_text(json.dumps(usage_stats, indent=2) + "\n")

    print(f"✅ Coherent narrative created across {totals['count']} segment(s)")
    print(f"⏱️  Total time: {total_elapsed:.1f}s ({total_elapsed/60:.1f} minutes)")
    print(f"💾 Combined narrative: {output_file}")
    print(f"📁 Segment narratives: {segments_dir}")
    print(f"📁 Segment prompts: {prompt_dir}")
    print("\n💰 TOKEN USAGE (aggregated):")
    print(f"   Input:  {totals['prompt_tokens']:,} tokens (${totals['input_cost']:.6f})")
    print(f"   Output: {totals['output_tokens']:,} tokens (${totals['output_cost']:.6f})")
    print(f"   Total:  ${totals['total_cost']:.6f}")
    print(f"💾 Usage stats: {usage_file}")

if __name__ == "__main__":
    print(f"🧠 STAGE 2: CREATE COHERENT NARRATIVE")
    print(f"Game: {ARGS.game}")
    print("=" * 50)
    create_narrative()
    print(f"\nNext: python3 3_event_classification.py --game {ARGS.game}")

