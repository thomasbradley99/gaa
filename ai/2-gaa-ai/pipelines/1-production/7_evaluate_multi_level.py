#!/usr/bin/env python3
"""
Stage 7: Multi-Level Evaluation - Test different matching strictness

Level 1 (Strictest): Time + Action + Team + Outcome
Level 2 (Medium):    Time + Action + Outcome (ignore team)
Level 3 (Loose):     Time + Action (ignore team and outcome)

This helps diagnose where the AI is failing:
- Good L3, Bad L2 = outcome detection problem
- Good L2, Bad L1 = team assignment problem
- Bad L3 = fundamental action detection problem
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name')
parser.add_argument('--time-limit', type=float, help='Time limit in seconds (e.g., 600)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs"

# Auto-detect output folder
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
else:
    output_folder = "6-with-audio"

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder

# File paths
AI_JSON_FILE = OUTPUT_DIR / "4_events.json"
GT_JSON_FIRST_10MIN = INPUT_DIR / "web_schema_first_10min.json"
GT_JSON_FULL = INPUT_DIR / "web_schema.json"

# Determine GT file
if ARGS.time_limit and ARGS.time_limit <= 600:
    if GT_JSON_FIRST_10MIN.exists():
        GT_JSON_FILE = GT_JSON_FIRST_10MIN
    elif GT_JSON_FULL.exists():
        GT_JSON_FILE = GT_JSON_FULL
    else:
        raise FileNotFoundError(f"❌ No ground truth found")
else:
    if GT_JSON_FULL.exists():
        GT_JSON_FILE = GT_JSON_FULL
    elif GT_JSON_FIRST_10MIN.exists():
        GT_JSON_FILE = GT_JSON_FIRST_10MIN
    else:
        raise FileNotFoundError(f"❌ No ground truth found")

TOLERANCE = 20.0  # seconds


def load_events(json_path: Path, time_limit: float = None) -> List[Dict]:
    """Load events from JSON"""
    with open(json_path, 'r') as f:
        events = json.load(f)
    
    if time_limit:
        events = [e for e in events if e['time'] <= time_limit]
    
    return events


def events_match_level1(ai: Dict, gt: Dict) -> bool:
    """Level 1: Strictest - Time + Action + Team + Outcome"""
    time_match = abs(ai['time'] - gt['time']) <= TOLERANCE
    action_match = ai['action'] == gt['action']
    team_match = ai['team'] == gt['team']
    outcome_match = ai['outcome'] == gt['outcome']
    
    return time_match and action_match and team_match and outcome_match


def events_match_level2(ai: Dict, gt: Dict) -> bool:
    """Level 2: Medium - Time + Action + Outcome (ignore team)"""
    time_match = abs(ai['time'] - gt['time']) <= TOLERANCE
    action_match = ai['action'] == gt['action']
    outcome_match = ai['outcome'] == gt['outcome']
    
    return time_match and action_match and outcome_match


def events_match_level3(ai: Dict, gt: Dict) -> bool:
    """Level 3: Loose - Time + Action (ignore team and outcome)"""
    time_match = abs(ai['time'] - gt['time']) <= TOLERANCE
    action_match = ai['action'] == gt['action']
    
    return time_match and action_match


def match_events_at_level(ai_events: List[Dict], gt_events: List[Dict], 
                          match_func, level_name: str) -> Tuple[int, int, int]:
    """
    Match events at a given strictness level
    Returns: (TP, FP, FN)
    """
    matched_gt_ids = set()
    tp = 0
    
    # For each AI event, try to find matching GT event
    for ai_event in ai_events:
        best_match = None
        best_distance = float('inf')
        
        for gt_event in gt_events:
            gt_id = gt_event.get('id', 'unknown')
            
            if gt_id in matched_gt_ids:
                continue
            
            if match_func(ai_event, gt_event):
                distance = abs(ai_event['time'] - gt_event['time'])
                if distance < best_distance:
                    best_distance = distance
                    best_match = gt_event
        
        if best_match:
            tp += 1
            matched_gt_ids.add(best_match.get('id', 'unknown'))
    
    fp = len(ai_events) - tp
    fn = len(gt_events) - tp
    
    return tp, fp, fn


def calculate_metrics(tp: int, fp: int, fn: int) -> Dict:
    """Calculate precision, recall, F1"""
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        "TP": tp,
        "FP": fp,
        "FN": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


def main():
    print("🎯 MULTI-LEVEL EVALUATION")
    print(f"   AI JSON:  {AI_JSON_FILE.name}")
    print(f"   GT JSON:  {GT_JSON_FILE.name}")
    if ARGS.time_limit:
        print(f"   Time Limit: {ARGS.time_limit}s ({ARGS.time_limit/60:.1f} min)")
    print()
    
    # Load events
    ai_events = load_events(AI_JSON_FILE, time_limit=ARGS.time_limit)
    gt_events = load_events(GT_JSON_FILE, time_limit=ARGS.time_limit)
    
    print(f"📊 Loaded {len(ai_events)} AI events, {len(gt_events)} GT events")
    print()
    
    # Test at each level
    levels = [
        ("Level 1: Time + Action + Team + Outcome", events_match_level1),
        ("Level 2: Time + Action + Outcome (no team)", events_match_level2),
        ("Level 3: Time + Action (no team/outcome)", events_match_level3),
    ]
    
    results = []
    
    print("="*90)
    for level_name, match_func in levels:
        tp, fp, fn = match_events_at_level(ai_events, gt_events, match_func, level_name)
        metrics = calculate_metrics(tp, fp, fn)
        results.append((level_name, metrics))
        
        print(f"{level_name}")
        print(f"  TP={metrics['TP']:2d}  FP={metrics['FP']:2d}  FN={metrics['FN']:2d}  "
              f"Precision={metrics['precision']:.1%}  Recall={metrics['recall']:.1%}  "
              f"F1={metrics['f1']:.1%}")
        print()
    
    print("="*90)
    print()
    print("💡 INTERPRETATION:")
    print()
    
    l1_f1 = results[0][1]['f1']
    l2_f1 = results[1][1]['f1']
    l3_f1 = results[2][1]['f1']
    
    if l3_f1 > 0.7:
        print("✅ Level 3 is GOOD (>70%) - AI detects actions correctly")
        if l2_f1 > 0.7:
            print("✅ Level 2 is GOOD (>70%) - AI detects outcomes correctly")
            if l1_f1 < 0.5:
                print("❌ Level 1 is BAD - PROBLEM: Team assignment is wrong!")
            else:
                print("✅ Level 1 is GOOD - Pipeline works well!")
        else:
            print("❌ Level 2 is BAD - PROBLEM: Outcome detection is wrong!")
    else:
        print("❌ Level 3 is BAD - PROBLEM: Fundamental action detection broken!")
        print("   AI can't even detect WHAT events are happening (Shot vs Kickout vs Foul)")
    
    print()
    print(f"Comparison: L1={l1_f1:.1%}  L2={l2_f1:.1%}  L3={l3_f1:.1%}")
    
    # Save results
    output_file = OUTPUT_DIR / "7_evaluation_multi_level.json"
    with open(output_file, 'w') as f:
        json.dump({
            "levels": [
                {"name": name, "metrics": metrics}
                for name, metrics in results
            ],
            "interpretation": {
                "level_3_f1": l3_f1,
                "level_2_f1": l2_f1,
                "level_1_f1": l1_f1,
                "primary_issue": (
                    "team_assignment" if l2_f1 > 0.5 and l1_f1 < 0.5
                    else "outcome_detection" if l3_f1 > 0.5 and l2_f1 < 0.5
                    else "action_detection"
                )
            }
        }, f, indent=2)
    
    print()
    print(f"💾 Saved: {output_file.name}")


if __name__ == "__main__":
    main()

