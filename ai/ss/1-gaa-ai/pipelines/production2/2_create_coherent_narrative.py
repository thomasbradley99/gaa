#!/usr/bin/env python3
"""
Stage 2: Create Coherent Narrative from Visual Observations

Reads raw observations from Stage 1, validates sequences, fixes logic errors,
creates a coherent narrative of what happened.
"""

import os
import json
import re
import argparse
from pathlib import Path
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

def create_narrative():
    """Create coherent narrative from visual observations"""
    
    input_file = INPUT_DIR / "1_observations.txt"
    output_file = OUTPUT_DIR / "2_narrative.txt"
    
    if not input_file.exists():
        raise FileNotFoundError(f"❌ Input file not found: {input_file}")
    
    # Read observations
    with open(input_file, 'r') as f:
        observations = f.read()
    
    print(f"📖 Loaded observations: {len(observations)} characters")
    
    # Extract time range from observations to give context to AI
    import re
    time_matches = re.findall(r'\[(\d+)s-(\d+)s\]', observations)
    if time_matches:
        start_time = int(time_matches[0][0])
        end_time = int(time_matches[-1][1])
        duration_mins = (end_time - start_time) / 60
        time_context = f"TIME RANGE: You are analyzing {start_time//60}:{start_time%60:02d} to {end_time//60}:{end_time%60:02d} ({duration_mins:.0f} minutes)"
    else:
        time_context = "TIME RANGE: Unknown"
    
    # Build team info for prompt (narrative doesn't assign Home/Away yet, just works with colors)
    team_info = f"Teams are referred to by their jersey colors in the observations.\n\n{time_context}"
    
    # Coherence prompt with bidirectional validation
    prompt = f"""Hello! I need your help creating a coherent narrative from football match observations.

{team_info}

**THE CHALLENGE:**
We're using an AI system to analyze video clips of a football match. The clips are 40 seconds long, taken every 30 seconds with 5-second overlap on each side. We designed it this way because video AI is very prone to hallucination - shorter clips with overlap help reduce errors.

However, the AI still sometimes "sees" things that didn't happen - especially goals. It might see:
- A free kick near the goal → incorrectly assumes it went in
- Players walking to center circle → assumes it's post-goal restart
- Any celebration → assumes a goal was scored

**YOUR CRITICAL TASK:**
You're the validation layer. Read these clip observations chronologically and create a COHERENT, LOGICAL narrative of what actually happened. Your job is to:

1. Identify and REMOVE hallucinated events (especially fake goals)
2. Use football logic to validate sequences
3. Preserve all real, important details
4. Infer missing events from outcomes (e.g., goal kick = shot before)
5. Remove duplicates from overlapping clips
6. Create a clean timeline of actual events

**WHAT EVENTS ARE WE TRYING TO DETECT?**

The next stage will try to identify these 41 event types from your narrative:

**Match Flow:** Half starts/ends, Kick offs
**Set Pieces:** Throw-ins, Corners, Free Kicks, Goal Kicks, Penalties
**Attacking:** A3 Entry (entering attacking third), Crosses, Shots at Goal, Goals
**Defending:** Regain Won (winning possession), Fouls, Offsides
**Discipline:** Yellow/Red Cards

**CRITICAL - PRESERVE THESE DETAILS:**
Your narrative feeds into the next stage, so you MUST preserve:

- **Possession changes:** "intercepts", "wins the ball", "gains possession", "regains possession", "tackles" → These become "Regain Won" events

- **A3 Entry (IMPORTANT - don't summarize away!):** When a team enters the attacking third (final third of field), PRESERVE the movement detail:
  ✅ GOOD: "14:20 - Blue advances into White's defensive third"
  ✅ GOOD: "14:20 - Blue builds attack towards the penalty area"  
  ✅ GOOD: "14:20 - White runs deep into Blue's half"
  ❌ BAD: "14:20 - Blue attacks" (too vague - next stage can't extract A3 Entry from this!)
  ❌ BAD: "Blue creates dangerous attack, takes shot" (where was the attack? Preserve location!)

- **Crosses:** "crosses into the box", "delivers from wide", "crosses from right/left" → "Cross" events

- **Set pieces:** Preserve throw-ins, corners, free kicks, goal kicks → Direct event types

- **Fouls:** Preserve referee whistles, fouls, challenges → "Foul" events

- **Shots:** Preserve any mention of shooting, striking toward goal → "Shot at Goal" events

DO NOT collapse sequences into vague summaries - the next stage needs spatial details!

**HOW TO SPOT HALLUCINATED GOALS:**

Here's the key insight: **Kickoffs are rare.**

In football, kickoffs ONLY happen:
1. Start of 1st half (once)
2. Start of 2nd half (once)
3. After a goal (rare - typically 0-2 per entire half)

So in a 15-20 minute segment, you should see 1-2 kickoffs MAXIMUM.

**If you count 3+ kickoffs in the observations → the video AI hallucinated multiple goals!**

When you see a "goal" claim, verify it with these three requirements:
1. Does it explicitly describe the ball crossing the goal line into the net?
2. Is there immediate celebration described?
3. Is there a center circle kickoff 10-60 seconds later?

If ANY of these are missing → it's not a real goal, remove it.

Common false patterns:
- "Players walking to center circle" ≠ post-goal (could be any restart, halftime, injury)
- "Celebration" ≠ goal (could be excited about a corner, free kick chance, or near-miss)
- "Free kick near goal" ≠ goal (most free kicks DON'T score)

**Your validation process:**
1. Count all kickoffs in the observations
2. If you see 3+ kickoffs → you have 2+ fake goals
3. Review each "goal" claim critically - remove the weakest/least detailed ones until you have ≤2 kickoffs total

**YOUR VALIDATION TOOLKIT:**

Use these football logic patterns to validate what you read:

**Forward validation (cause must lead to effect):**
- **Goal → Kickoff:** Every goal MUST have a kickoff 10-60s later. If there's no kickoff, it wasn't a real goal - delete it.
- **Foul → Free kick:** Usually (but not always) follows within 5-30s. Keep both if you see them.

**Backward validation (effect reveals cause):**
- **Goal kick → Shot:** If you see a goal kick, look 5-20s before. Did the observations mention a shot or strike? If yes, connect them ("Shot at goal, went wide"). If not mentioned, don't infer it.
- **Corner kick → Cross/Shot:** Look 5-15s before the corner. Was there a cross or shot that was blocked? Connect them if explicitly mentioned.
- **Free kick → Foul:** Look 5-30s before. Was a whistle/foul mentioned? Connect them if found.

**Conservative inference principle:**
Only infer missing events if there's explicit evidence in the observations. Don't add events that weren't mentioned - that's just more hallucination!

**What to remove:**
- Goals with no kickoff after them
- Duplicate events from overlapping clips (keep the most detailed one)
- Impossible sequences (e.g., kickoff before game starts)
- When you count 3+ kickoffs in your narrative → you have fake goals. Review each goal claim and remove the least convincing ones until you're down to 1-2 kickoffs maximum

**OUTPUT FORMAT:**
Keep the same format as the input observations - organized by clip with timestamps:

[XXXs-YYYs] clip_name: Brief summary of what happened.
11:25 - [Team color] player [ACTION DESCRIPTION]
11:33 - [Next event]

Keep it detailed for important events:
✅ GOOD: "11:25 - White player intercepts the pass in midfield"
❌ BAD: "11:25 - Play continues in midfield" (too vague - we lose the interception!)

**FINAL CHECKLIST BEFORE YOU FINISH:**
1. Count kickoffs in your narrative. How many do you have?
   - 0-2 kickoffs → Good, proceed
   - 3+ kickoffs → You kept fake goals! Go back and remove the weakest goal claims
2. Did you preserve possession changes? (intercepts, tackles, regains)
3. Did you preserve set pieces? (throw-ins, corners, free kicks)
4. Did you preserve crosses and shots?
5. Did you remove obvious duplicates from the overlapping clips?

Remember: You're helping us filter out hallucinations, not add more. When in doubt, be skeptical of dramatic claims (especially goals).

**Here are the observations from the video AI:**

{observations}

**Now create your coherent narrative:**

**FORMAT YOUR RESPONSE:**
1. Start immediately with the coherent narrative (same format as observations)
2. At the very END, add a brief validation note explaining any goals/kickoffs you removed

Example structure:
```
[680s-730s] clip_name: Description
11:20 - Event description
11:25 - Event description
...
[rest of narrative]
...

---
VALIDATION NOTES:
- Removed goal at XX:XX (no kickoff after)
- Kept 1 kickoff total (at start of period)
```

Remember - count those kickoffs! If you have 3+, you need to remove fake goals. Good luck!"""

    model = genai.GenerativeModel(
        'gemini-2.5-pro',  # Using Pro for better logical reasoning
        generation_config={"temperature": 0, "top_p": 0.1}
    )
    
    try:
        response = model.generate_content(prompt)
        narrative = response.text.strip()
        
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
        prompt_file = OUTPUT_DIR / "prompt_stage2.txt"
        with open(prompt_file, 'w') as f:
            f.write("=" * 100 + "\n")
            f.write("STAGE 2: COHERENT NARRATIVE - PROMPT USED\n")
            f.write("=" * 100 + "\n\n")
            f.write("MODEL: Gemini 2.5 Flash\n")
            f.write("APPROACH: Conversational validation and synthesis\n\n")
            f.write("=" * 100 + "\n")
            f.write("PROMPT:\n")
            f.write("=" * 100 + "\n\n")
            f.write(prompt)
        
        # Save usage stats
        usage_file = OUTPUT_DIR / 'usage_stats_stage2.json'
        usage_stats = {
            'stage': 'stage_2_narrative',
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
        
        print(f"✅ Coherent narrative created")
        print(f"💾 Saved to: {output_file}")
        print(f"\n💰 TOKEN USAGE:")
        print(f"   Input:  {prompt_tokens:,} tokens (${input_cost:.6f})")
        print(f"   Output: {output_tokens:,} tokens (${output_cost:.6f})")
        print(f"   Total:  ${total_cost:.6f}")
        print(f"💾 Usage stats: {usage_file}")
        
    except Exception as e:
        print(f"❌ Error creating narrative: {str(e)}")
        raise

if __name__ == "__main__":
    print(f"🧠 STAGE 2: CREATE COHERENT NARRATIVE")
    print(f"Game: {ARGS.game}")
    print("=" * 50)
    create_narrative()
    print(f"\nNext: python3 3_event_classification.py --game {ARGS.game}")

