# Genetic Prompt Optimization Strategy

## Overview

The GAA AI pipeline is solid - the only variables are the **prompts** at stages 1, 2, and 3. This document describes a genetic algorithm approach to optimize these prompts using isolated stage optimization followed by recombination.

---

## Pipeline API Calls Architecture

```
═══════════════════════════════════════════════════════════════════════════════
                    GAA AI EVENT DETECTION PIPELINE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT: VIDEO FILE                              │
│                            (GAA Match Recording)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 0.5: CALIBRATION (Parallel Processing)                              │
│  ─────────────────────────────────────────────────────────────              │
│  API: Gemini 2.5 Flash (30+ parallel calls)                                │
│  Input: ~20 calibration frames (JPG images)                                │
│  Prompt: "What are team colors? Keeper colors? Game state?"                │
│  Output: Frame descriptions                                                │
│                                                                             │
│  Then:                                                                      │
│  API: Gemini 2.5 Pro (1 call)                                              │
│  Input: All frame descriptions (text)                                      │
│  Prompt: "Synthesize team profile, match times, attack directions"         │
│  Output: game_profile.json                                                 │
│  ├─ team_a: {color, keeper_color, attack_direction_1st_half, ...}         │
│  ├─ team_b: {color, keeper_color, attack_direction_1st_half, ...}         │
│  └─ match_times: {first_half_start, half_time, second_half_start, ...}    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: CLIP DESCRIPTIONS (Parallel Processing, 30 workers)              │
│  ──────────────────────────────────────────────────────────                │
│  API: Gemini 2.5 Pro with Video (83 parallel calls for full game)         │
│  Input: 60-second video clips (MP4 with audio)                             │
│  Prompt: "Watch this GAA clip. Report SHOTS, KICKOUTS, FOULS, TURNOVERS"  │
│         "Include timestamps, who did what, outcomes (Point/Wide/Won/Lost)" │
│  Output: 1_observations.txt                                                │
│  Example:                                                                   │
│    [680s] clip_011m20s.mp4:                                                │
│    11:25 - White shoots from 25m center - POINT scored                     │
│    11:42 - Black keeper kicks out LONG to CENTRE, White WINS              │
│    12:05 - White fouls Black in midfield - free awarded                    │
│                                                                             │
│  Cost: ~$0.026 per clip × 83 clips = ~$2.16                               │
│  Tokens: ~18k prompt + ~300 output per clip                                │
│                                                                             │
│  🔧 OPTIMIZABLE: Prompt template (lines 149-207)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: COHERENT NARRATIVE (Parallel Processing per 10-min segment)      │
│  ──────────────────────────────────────────────────────────                │
│  API: Gemini 2.5 Pro Text (1 call per 10-min segment, up to 6 parallel)   │
│  Input: Raw observations from Stage 1 (text)                               │
│  Prompt: "Validate these observations. Remove hallucinations."             │
│         "Keep real scores with 'ball over bar' language."                  │
│         "Preserve possession changes, turnovers, fouls, kickouts."         │
│         "Use GAA logic: Score → Kickout, Foul → Free kick"                │
│  Output: 2_narrative.txt                                                   │
│  Example:                                                                   │
│    11:25 - White player shoots from 25m center, ball goes over bar (point) │
│    11:42 - Black goalkeeper takes kickout long to centre, White wins ball  │
│    12:05 - White player fouls Black in midfield, referee awards free       │
│                                                                             │
│  Purpose: Filter out AI hallucinations, ensure logical game flow           │
│                                                                             │
│  🔧 OPTIMIZABLE: Prompt template (lines 103-224)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: EVENT CLASSIFICATION (Parallel Processing per 10-min segment)    │
│  ────────────────────────────────────────────────────────                  │
│  API: Gemini 2.5 Pro Text (1 call per segment, up to 6 parallel)          │
│  Input: Validated narrative from Stage 2 (text)                            │
│  Prompt: "Extract GAA event codes: Shot Own/Opp, Kickout Own/Opp,"        │
│         "Turnover Won/lost, Foul Awarded/Conceded"                         │
│         "Convert team colors to Own/Opp using spatial context"             │
│         "Add outcome tags: [Point], [Wide], [Won], [Lost], [From Play]"   │
│  Output: 3_events_classified.txt                                           │
│  Example:                                                                   │
│    11:25 - Shot Own [From Play] [Point]: White scores point                │
│    11:42 - Kickout Opp [Long] [Centre] [Won]: Black restarts               │
│    12:05 - Foul Conceded: White fouls Black                                │
│                                                                             │
│  🔧 OPTIMIZABLE: Prompt template (lines 110-206)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: JSON EXTRACTION (No API - REGEX parsing)                         │
│  ───────────────────────────────────────────                               │
│  No API Call - Pure REGEX parsing                                          │
│  Input: Event codes from Stage 3                                           │
│  Process: Parse "MM:SS - Event Code [Tags]: Description" format            │
│  Output: 4_events.json                                                     │
│  [                                                                          │
│    {                                                                        │
│      "ID": "ai-0001",                                                       │
│      "start_seconds": 685.0,                                               │
│      "code": "Shot Own",                                                    │
│      "tags": ["From Play", "Point"],                                       │
│      "label": "White scores point"                                         │
│    },                                                                       │
│    ...                                                                      │
│  ]                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 5: XML EXPORT (No API - JSON to XML conversion)                     │
│  ────────────────────────────────────────────────                          │
│  No API Call - Pure Python conversion                                      │
│  Input: JSON events from Stage 4                                           │
│  Output: anadi_xml_export.xml (Anadi software format)                      │
│  <ALL_INSTANCES>                                                            │
│    <instance>                                                               │
│      <ID>ai-0001</ID>                                                       │
│      <start>685</start>                                                     │
│      <end>685</end>                                                         │
│      <code>Shot Own</code>                                                  │
│      <label><text>From Play</text></label>                                 │
│      <label><text>Point</text></label>                                     │
│    </instance>                                                              │
│  </ALL_INSTANCES>                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 6/7: EVALUATION (No API - Statistical comparison)                   │
│  ─────────────────────────────────────────────────────                     │
│  No API Call - Compare AI output vs Ground Truth XML                       │
│  Input:                                                                     │
│    - AI output: anadi_xml_export.xml                                       │
│    - Ground truth: ground_truth_detectable_first_10min.xml                 │
│  Output: Metrics (Precision, Recall, F1, TP, FP, FN)                       │
│                                                                             │
│  Target: 20 detectable events in first 10 minutes                          │
│    - 8 Shots (Point/Goal/Wide outcomes)                                    │
│    - 5 Kickouts (Won/Lost outcomes)                                        │
│    - 2 Turnovers                                                            │
│    - 5 Fouls                                                                │
│                                                                             │
│  🎯 FITNESS FUNCTION: F1 Score (or weighted Precision/Recall)              │
└─────────────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                           API CALL SUMMARY
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────┬───────────────────┬─────────────┬──────────────────────┐
│ Stage           │ API Model         │ Input Type  │ What It Does         │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 0.5 Calibration │ Gemini 2.5 Flash  │ Images      │ Describe each frame  │
│   (Step 1)      │ (30+ parallel)    │ (JPG)       │ (team colors, etc)   │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 0.5 Calibration │ Gemini 2.5 Pro    │ Text        │ Synthesize profile   │
│   (Step 2)      │ (1 call)          │             │ from descriptions    │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 1 Descriptions  │ Gemini 2.5 Pro    │ Video (MP4) │ Detect events in     │
│                 │ (30 parallel)     │ with audio  │ each 60s clip        │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 2 Narrative     │ Gemini 2.5 Pro    │ Text        │ Validate & clean     │
│                 │ (6 parallel)      │             │ observations         │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 3 Classification│ Gemini 2.5 Pro    │ Text        │ Extract structured   │
│                 │ (6 parallel)      │             │ event codes + tags   │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 4 JSON Extract  │ None (REGEX)      │ Text        │ Parse to JSON        │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 5 XML Export    │ None (Python)     │ JSON        │ Convert to XML       │
├─────────────────┼───────────────────┼─────────────┼──────────────────────┤
│ 6/7 Evaluation  │ None (Stats)      │ XML         │ Calculate metrics    │
└─────────────────┴───────────────────┴─────────────┴──────────────────────┘

Cost Breakdown (for first 10 minutes = 10 clips):
  Stage 0.5: ~$0.01 (one-time setup)
  Stage 1:   ~$0.26 (10 clips × $0.026 each)
  Stage 2:   ~$0.02 (1 segment)
  Stage 3:   ~$0.02 (1 segment)
  ────────────────────
  Total:     ~$0.31 per 10-minute run
```

---

## Isolated Stage Optimization Strategy

### Why Optimize Stages Separately?

**Problem:** Optimizing all 3 prompts together = 5³ = 125 combinations to test

**Solution:** Optimize one stage at a time while keeping others frozen = 5 variants per stage = 15 tests total

**Benefit:** Clear attribution - you know exactly which stage improvement came from

```
═══════════════════════════════════════════════════════════════════════════════
                    ISOLATED STAGE OPTIMIZATION STRATEGY
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: OPTIMIZE STAGE 1 ONLY (Observations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Stage 1          Stage 2          Stage 3          Eval
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │ VARIANT A│────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  └──────────┘     └──────────┘     └──────────┘     └──────┘
  
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │ VARIANT B│────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  └──────────┘     └──────────┘     └──────────┘     └──────┘
  
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │ VARIANT C│────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  └──────────┘     └──────────┘     └──────────┘     └──────┘
  
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │ VARIANT D│────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  └──────────┘     └──────────┘     └──────────┘     └──────┘
  
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │ VARIANT E│────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  └──────────┘     └──────────┘     └──────────┘     └──────┘
  
  Result: Pick WINNER from A,B,C,D,E → becomes new baseline for Stage 1


PHASE 2: OPTIMIZE STAGE 2 ONLY (Narrative Validation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Stage 1          Stage 2          Stage 3          Eval
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│ VARIANT A│────▶│  FIXED   │────▶│ F1=? │
  │ (winner) │     └──────────┘     └──────────┘     └──────┘
  └──────────┘
                   ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│ VARIANT B│────▶│  FIXED   │────▶│ F1=? │
  │ (winner) │     └──────────┘     └──────────┘     └──────┘
  └──────────┘
                   ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│  FIXED   │────▶│ F1=? │
  │ (winner) │     │ (baseline)│    └──────────┘     └──────┘
  └──────────┘     └──────────┘
                   ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│ VARIANT D│────▶│  FIXED   │────▶│ F1=? │
  │ (winner) │     └──────────┘     └──────────┘     └──────┘
  └──────────┘
                   ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│ VARIANT E│────▶│  FIXED   │────▶│ F1=? │
  │ (winner) │     └──────────┘     └──────────┘     └──────┘
  └──────────┘
  
  Result: Pick WINNER from A,B,C,D,E → becomes new baseline for Stage 2


PHASE 3: OPTIMIZE STAGE 3 ONLY (Event Classification)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Stage 1          Stage 2          Stage 3          Eval
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│ VARIANT A│────▶│ F1=? │
  │ (winner) │     │ (winner) │     └──────────┘     └──────┘
  └──────────┘     └──────────┘
                                    ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│ VARIANT B│────▶│ F1=? │
  │ (winner) │     │ (winner) │     └──────────┘     └──────┘
  └──────────┘     └──────────┘
                                    ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│ VARIANT C│────▶│ F1=? │
  │ (winner) │     │ (winner) │     └──────────┘     └──────┘
  └──────────┘     └──────────┘
                                    ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│ VARIANT D│────▶│ F1=? │
  │ (winner) │     │ (winner) │     └──────────┘     └──────┘
  └──────────┘     └──────────┘
                                    ┌──────────┐     ┌──────┐
  │  FIXED   │────▶│  FIXED   │────▶│ VARIANT E│────▶│ F1=? │
  │ (winner) │     │ (winner) │     └──────────┘     └──────┘
  └──────────┘     └──────────┘
  
  Result: Pick WINNER from A,B,C,D,E → becomes new baseline for Stage 3
```

---

## Recombination Strategy

Every 5 isolation cycles, breed the top performers together to create hybrid prompts.

```
═══════════════════════════════════════════════════════════════════════════════
                    EVERY 5 CYCLES: RECOMBINATION
═══════════════════════════════════════════════════════════════════════════════

After 5 isolation cycles, you have:
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  Stage 1    │     │  Stage 2    │     │  Stage 3    │
  │  Top 3      │     │  Top 3      │     │  Top 3      │
  │  Winners    │     │  Winners    │     │  Winners    │
  │             │     │             │     │             │
  │  S1-A (0.72)│     │  S2-X (0.68)│     │  S3-M (0.75)│
  │  S1-B (0.70)│     │  S2-Y (0.65)│     │  S3-N (0.73)│
  │  S1-C (0.69)│     │  S2-Z (0.64)│     │  S3-P (0.71)│
  └─────────────┘     └─────────────┘     └─────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │   BREED TOGETHER    │
                  │   (LLM Crossover)   │
                  │                     │
                  │ "Combine the best   │
                  │  elements from      │
                  │  these 3 prompts    │
                  │  into a unified     │
                  │  optimized set"     │
                  └─────────────────────┘
                            │
                            ▼
         ┌──────────────────┴──────────────────┐
         │                                      │
         ▼                                      ▼
  ┌─────────────┐                       ┌─────────────┐
  │  HYBRID 1   │                       │  HYBRID 2   │
  │             │                       │             │
  │ S1-A + S2-X │                       │ S1-B + S2-X │
  │   + S3-M    │                       │   + S3-N    │
  │             │                       │             │
  │ (Combined   │                       │ (Combined   │
  │  synergy)   │                       │  synergy)   │
  └─────────────┘                       └─────────────┘
         │                                      │
         └──────────────────┬───────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  Run Full Pipeline  │
                  │  Test Both Hybrids  │
                  └─────────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  Pick Best Hybrid   │
                  │  → New Baseline     │
                  └─────────────────────┘
                            │
                            ▼
                  Start isolation cycles again
```

---

## Full Evolution Timeline

```
═══════════════════════════════════════════════════════════════════════════════
                    GENETIC ALGORITHM STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

Generation 0-4:   Optimize Stage 1 only (keep 2,3 frozen)
                  ├─ Test 5 variants per generation
                  ├─ Keep best performer
                  └─ Mutate for next generation

Generation 5-9:   Optimize Stage 2 only (keep 1,3 frozen)
                  ├─ Test 5 variants per generation
                  ├─ Keep best performer
                  └─ Mutate for next generation

Generation 10-14: Optimize Stage 3 only (keep 1,2 frozen)
                  ├─ Test 5 variants per generation
                  ├─ Keep best performer
                  └─ Mutate for next generation

Generation 15:    🧬 RECOMBINATION EVENT
                  ├─ Collect top 3 from each stage (9 total prompts)
                  ├─ Use LLM to crossover best elements
                  ├─ Generate 3-5 hybrid combinations
                  ├─ Test all hybrids
                  └─ Best hybrid becomes new baseline
                  ↓
Generation 16-20: Optimize Stage 1 only (new baseline from hybrid)
                  └─ Repeat cycle

Generation 21-25: Optimize Stage 2 only (new baseline)
                  └─ Repeat cycle

Generation 26-30: Optimize Stage 3 only (new baseline)
                  └─ Repeat cycle

Generation 31:    🧬 RECOMBINATION EVENT
                  └─ Breed again
                  ↓
                 ... repeat until convergence

CONVERGENCE CRITERIA:
  - F1 Score > 0.70 (great performance)
  - OR: No improvement for 3 consecutive recombination cycles
  - OR: Max generations reached (e.g., 100)
```

---

## Implementation Structure

### Three Optimization Scripts

```python
# optimize_stage1.py
"""
Optimize Stage 1 prompts only (video clip descriptions)
Keeps Stage 2 & 3 frozen
"""

# optimize_stage2.py
"""
Optimize Stage 2 prompts only (narrative validation)
Keeps Stage 1 & 3 frozen
"""

# optimize_stage3.py
"""
Optimize Stage 3 prompts only (event classification)
Keeps Stage 1 & 2 frozen
"""
```

### Master Orchestrator

```python
# orchestrator.py
"""
Runs the full genetic optimization cycle:
1. Run optimize_stage1.py (5 generations)
2. Run optimize_stage2.py (5 generations)
3. Run optimize_stage3.py (5 generations)
4. Run recombine_winners.py (breed top 3 from each)
5. Repeat until convergence
"""
```

### Shared Components

```python
# mutation_engine.py
"""
Uses LLM to intelligently mutate prompts:
- Add/remove examples
- Change emphasis (SHOTS vs KICKOUTS)
- Adjust selectivity
- Modify validation logic
"""

# fitness_evaluator.py
"""
Runs full pipeline and extracts metrics:
- Precision, Recall, F1
- Per-event-type breakdown
- Cost tracking
"""

# prompt_manager.py
"""
Handles prompt templates and variants:
- Load current prompts
- Save new prompts
- Track genealogy
"""
```

---

## Why This Works

### 1. Smaller Search Space
- Optimizing 1 prompt at a time = 5 variants to test
- Optimizing 3 prompts together = 5³ = 125 combinations!
- **Your approach: 15 tests per cycle vs 125**

### 2. Clear Attribution
- You know EXACTLY which stage improvement came from
- Stage 1 winner = better event detection in video
- Stage 2 winner = better hallucination filtering
- Stage 3 winner = better event code extraction

### 3. Recombination Prevents Local Maxima
- Each stage optimizes independently (might overfit to compensate for other stages)
- Recombination creates new synergies
- Top performers might work even better together

### 4. Coordinate Descent with Genetic Escape
This is essentially **coordinate descent** (optimize one dimension at a time) but with genetic recombination to escape local optima.

---

## Cost Analysis

### Per Test Run (10 clips, first 10 minutes):
- Stage 0.5: $0.01 (one-time, reused)
- Stage 1: $0.26
- Stage 2: $0.02
- Stage 3: $0.02
- **Total: ~$0.31 per variant**

### Per Isolation Cycle (5 variants):
- 5 variants × $0.31 = **$1.55 per stage**

### Per Full Cycle (3 stages + recombination):
- Stage 1: $1.55
- Stage 2: $1.55
- Stage 3: $1.55
- Recombination: $1.55 (test 5 hybrids)
- **Total: $6.20 per full cycle**

### For 10 Full Cycles:
- 10 cycles × $6.20 = **$62 total**
- Expected result: F1 score improvement from ~0.40 to >0.70

---

## Success Metrics

### Fitness Function
```python
def fitness(precision, recall, cost_factor):
    f1 = 2 * (precision * recall) / (precision + recall)
    return f1  # Primary metric
    
    # OR weighted:
    # return 0.3 * precision + 0.5 * recall + 0.2 * (1 - cost_factor)
```

### Target Performance
- **Good:** F1 > 0.50 (Precision > 60%, Recall > 40%)
- **Great:** F1 > 0.70 (Precision > 80%, Recall > 60%)

### Per-Event Breakdown
Track performance by event type:
- Shots: Precision/Recall for Point/Goal/Wide detection
- Kickouts: Precision/Recall for Won/Lost outcomes
- Turnovers: Precision/Recall for possession changes
- Fouls: Precision/Recall for foul detection

---

## Next Steps

1. **Extract prompts into templates** - Make them parameterized
2. **Build mutation engine** - LLM-powered intelligent mutations
3. **Create fitness evaluator** - Automated pipeline runner
4. **Implement orchestrator** - Coordinates full optimization cycle
5. **Set up experiment tracking** - Log all variants + scores
6. **Run first cycle** - Test the system end-to-end
7. **Iterate** - Let it run until convergence

The system is designed to be fully automated once set up. You can start it and let it optimize overnight.

