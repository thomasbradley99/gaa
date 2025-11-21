#!/usr/bin/env python3
"""
Stage 7: Evaluate AI vs Professional Events (EVENT_SCHEMA JSON)

Compares AI-generated JSON (EVENT_SCHEMA format) against ground truth JSON
using ±20s tolerance matching.

Usage: python3 7_evaluate.py --game {game-name}
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--time-limit', type=float, help='Only evaluate events up to this time in seconds (e.g., 600 for 10 min)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs"

# Auto-detect output folder from Stage 1
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
    print(f"📁 Using output folder: {output_folder}")
else:
    output_folder = "2-gemini3"
    print(f"📁 Using default folder: {output_folder}")

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# File paths
AI_JSON_FILE = OUTPUT_DIR / "4_events.json"
GT_JSON_FULL = INPUT_DIR / "web_schema.json"
GT_JSON_FIRST_10MIN = INPUT_DIR / "web_schema_first_10min.json"

# Determine which ground truth to use
if ARGS.time_limit and ARGS.time_limit <= 600:
    # Use first 10 min if evaluating first 10 min
    if GT_JSON_FIRST_10MIN.exists():
        GT_JSON_FILE = GT_JSON_FIRST_10MIN
    elif GT_JSON_FULL.exists():
        GT_JSON_FILE = GT_JSON_FULL
    else:
        raise FileNotFoundError(f"❌ No ground truth JSON found in {INPUT_DIR}")
else:
    # Use full game ground truth
    if GT_JSON_FULL.exists():
        GT_JSON_FILE = GT_JSON_FULL
    elif GT_JSON_FIRST_10MIN.exists():
        GT_JSON_FILE = GT_JSON_FIRST_10MIN
    else:
        raise FileNotFoundError(f"❌ No ground truth JSON found in {INPUT_DIR}")

OUT_FILE = OUTPUT_DIR / "7_evaluation_metrics.json"
TIMELINE_FILE = OUTPUT_DIR / "7_evaluation_timeline.txt"

TOLERANCE = 20.0  # seconds

def load_events(json_path: Path, time_limit: float = None) -> List[Dict]:
    """Load events from EVENT_SCHEMA JSON file"""
    with open(json_path, 'r') as f:
        events = json.load(f)
    
    # Filter by time limit if specified
    if time_limit:
        events = [e for e in events if e['time'] <= time_limit]
    
    return events


def events_match(ai_event: Dict, gt_event: Dict) -> bool:
    """Check if two events match (same action, outcome, team, within tolerance)"""
    
    # Must be same action
    if ai_event['action'] != gt_event['action']:
        return False
    
    # Must be same outcome
    if ai_event['outcome'] != gt_event['outcome']:
        return False
    
    # Must be same team
    if ai_event['team'] != gt_event['team']:
        return False
    
    # Must be within time tolerance
    time_diff = abs(ai_event['time'] - gt_event['time'])
    if time_diff > TOLERANCE:
        return False
    
    return True


def match_events(ai_events: List[Dict], gt_events: List[Dict]) -> Tuple[Dict, List[Dict]]:
    """
    Match AI events to ground truth events
    
    Returns:
        - event_stats: dict of {event_type: {TP, FP, FN}}
        - matches: list of match details
    """
    
    # Initialize counters per event type
    event_stats = defaultdict(lambda: {"TP": 0, "FP": 0, "FN": 0})
    
    # Track which GT events have been matched
    matched_gt_ids = set()
    matches = []
    
    # For each AI event, try to find matching GT event
    for ai_event in ai_events:
        ai_time = ai_event['time']
        ai_action = ai_event['action']
        ai_id = ai_event.get('id', 'unknown')
        
        best_match = None
        best_distance = float('inf')
        
        # Look for matching GT event
        for gt_event in gt_events:
            gt_id = gt_event.get('id', 'unknown')
            
            # Skip if already matched
            if gt_id in matched_gt_ids:
                continue
            
            # Check if events match
            if events_match(ai_event, gt_event):
                distance = abs(ai_time - gt_event['time'])
                if distance < best_distance:
                    best_distance = distance
                    best_match = gt_event
        
        # Record the match result
        if best_match:
            # True Positive
            event_stats[ai_action]["TP"] += 1
            matched_gt_ids.add(best_match.get('id', 'unknown'))
            matches.append({
                "ai_event": ai_event,
                "gt_event": best_match,
                "time_diff": best_distance,
                "match_type": "TP"
            })
        else:
            # False Positive (AI detected something that wasn't there)
            event_stats[ai_action]["FP"] += 1
            matches.append({
                "ai_event": ai_event,
                "gt_event": None,
                "time_diff": None,
                "match_type": "FP"
            })
    
    # Count False Negatives (GT events that AI missed)
    for gt_event in gt_events:
        gt_id = gt_event.get('id', 'unknown')
        gt_action = gt_event['action']
        
        if gt_id not in matched_gt_ids:
            event_stats[gt_action]["FN"] += 1
            matches.append({
                "ai_event": None,
                "gt_event": gt_event,
                "time_diff": None,
                "match_type": "FN"
            })
    
    return dict(event_stats), matches


def calculate_metrics(event_stats: Dict) -> Dict:
    """Calculate overall precision, recall, F1"""
    
    total_tp = sum(stats["TP"] for stats in event_stats.values())
    total_fp = sum(stats["FP"] for stats in event_stats.values())
    total_fn = sum(stats["FN"] for stats in event_stats.values())
    
    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        "TP": total_tp,
        "FP": total_fp,
        "FN": total_fn,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


def format_time(seconds: float) -> str:
    """Convert seconds to MM:SS format"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def generate_timeline(matches: List[Dict], overall_metrics: Dict, total_ai: int, total_gt: int, event_stats: Dict, output_dir: Path) -> str:
    """Generate timeline comparison text file"""
    
    # Sort by time
    sorted_matches = sorted(matches, key=lambda m:
        m['ai_event']['time'] if m['ai_event']
        else m['gt_event']['time'])
    
    lines = []
    lines.append("=" * 100)
    lines.append("JSON-BASED TIMELINE COMPARISON: AI vs Ground Truth Events (EVENT_SCHEMA)")
    lines.append("=" * 100)
    lines.append("")
    
    # Calculate time range
    if sorted_matches:
        all_times = []
        for m in sorted_matches:
            if m['ai_event']:
                all_times.append(m['ai_event']['time'])
            if m['gt_event']:
                all_times.append(m['gt_event']['time'])
        if all_times:
            min_time = int(min(all_times))
            max_time = int(max(all_times))
            time_analyzed = f"{min_time//60}:{min_time%60:02d} - {max_time//60}:{max_time%60:02d} ({(max_time-min_time)//60} minutes)"
        else:
            time_analyzed = "Unknown"
    else:
        time_analyzed = "Unknown"
    
    # Summary header
    lines.append("📊 EVALUATION SUMMARY")
    lines.append("-" * 100)
    lines.append(f"Time Analyzed:  {time_analyzed}")
    lines.append(f"AI Events:      {total_ai}")
    lines.append(f"GT Events:      {total_gt}")
    lines.append(f"Matched (TP):   {overall_metrics['TP']}")
    lines.append(f"False Pos:      {overall_metrics['FP']}")
    lines.append(f"Missed (FN):    {overall_metrics['FN']}")
    lines.append("")
    lines.append(f"Precision:      {overall_metrics['precision']:.1%}")
    lines.append(f"Recall:         {overall_metrics['recall']:.1%}")
    lines.append(f"F1 Score:       {overall_metrics['f1']:.1%}")
    lines.append("")
    
    # Cost breakdown
    lines.append("💰 COST BREAKDOWN")
    lines.append("-" * 100)
    
    total_cost = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    
    # Stage 1
    stage1_file = output_dir / "usage_stats_stage1.json"
    if stage1_file.exists():
        with open(stage1_file, 'r') as f:
            stage1 = json.load(f)
        cost = stage1['cost']['total']
        tokens_in = stage1['tokens']['prompt_tokens']
        tokens_out = stage1['tokens']['output_tokens']
        total_cost += cost
        total_input_tokens += tokens_in
        total_output_tokens += tokens_out
        lines.append(f"Stage 1 (Clip Descriptions):  ${cost:.4f}  ({tokens_in:,} in / {tokens_out:,} out)")
    
    # Stage 2
    stage2_file = output_dir / "usage_stats_stage2.json"
    if stage2_file.exists():
        with open(stage2_file, 'r') as f:
            stage2 = json.load(f)
        cost = stage2['cost']['total']
        tokens_in = stage2['tokens']['prompt_tokens']
        tokens_out = stage2['tokens']['output_tokens']
        total_cost += cost
        total_input_tokens += tokens_in
        total_output_tokens += tokens_out
        lines.append(f"Stage 2 (Narrative):          ${cost:.4f}  ({tokens_in:,} in / {tokens_out:,} out)")
    
    # Stage 3
    stage3_file = output_dir / "usage_stats_stage3.json"
    if stage3_file.exists():
        with open(stage3_file, 'r') as f:
            stage3 = json.load(f)
        cost = stage3['cost']['total']
        tokens_in = stage3['tokens']['prompt_tokens']
        tokens_out = stage3['tokens']['output_tokens']
        total_cost += cost
        total_input_tokens += tokens_in
        total_output_tokens += tokens_out
        lines.append(f"Stage 3 (Classification):     ${cost:.4f}  ({tokens_in:,} in / {tokens_out:,} out)")
    
    lines.append(f"Stages 4-7:                   $0.0000  (regex/JSON only)")
    lines.append("-" * 100)
    lines.append(f"TOTAL THIS RUN:               ${total_cost:.4f}  ({total_input_tokens:,} in / {total_output_tokens:,} out)")
    lines.append("")
    lines.append("Note: Calibration ($0.05 one-time per game) not included above")
    lines.append("")
    
    # Per-event-type breakdown
    lines.append("📋 PER-EVENT-TYPE BREAKDOWN")
    lines.append("-" * 100)
    lines.append(f"{'Event Type':<25} {'AI':<6} {'GT':<6} {'TP':<6} {'FP':<6} {'FN':<6} {'Prec':<8} {'Recall':<8} {'F1':<8}")
    lines.append("-" * 100)
    
    sorted_events = sorted(event_stats.items(), key=lambda x: (x[1]['TP'] + x[1]['FN'], x[0]), reverse=True)
    
    for event_type, stats in sorted_events:
        tp = stats['TP']
        fp = stats['FP']
        fn = stats['FN']
        
        ai_count = tp + fp
        gt_count = tp + fn
        
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        
        if ai_count > 0 or gt_count > 0:
            lines.append(f"{event_type:<25} {ai_count:<6} {gt_count:<6} {tp:<6} {fp:<6} {fn:<6} {prec:<8.1%} {rec:<8.1%} {f1:<8.1%}")
    
    lines.append("-" * 100)
    lines.append(f"{'TOTAL':<25} {total_ai:<6} {total_gt:<6} {overall_metrics['TP']:<6} {overall_metrics['FP']:<6} {overall_metrics['FN']:<6} {overall_metrics['precision']:<8.1%} {overall_metrics['recall']:<8.1%} {overall_metrics['f1']:<8.1%}")
    lines.append("")
    
    # Detailed timeline
    lines.append("=" * 100)
    lines.append("DETAILED TIMELINE")
    lines.append("=" * 100)
    lines.append("")
    
    for match in sorted_matches:
        match_type = match['match_type']
        ai_event = match['ai_event']
        gt_event = match['gt_event']
        
        if match_type == "TP":
            ai_time = ai_event['time']
            gt_time = gt_event['time']
            time_diff = match['time_diff']
            action = ai_event['action']
            outcome = ai_event['outcome']
            team = ai_event['team']
            
            lines.append(f"✅ MATCH at {format_time(ai_time)} | {team} {action} - {outcome}")
            lines.append(f"   AI: {format_time(ai_time)} | ID: {ai_event.get('id', 'unknown')}")
            lines.append(f"   GT: {format_time(gt_time)} | ID: {gt_event.get('id', 'unknown')}")
            lines.append(f"   Time diff: {time_diff:.1f}s")
            
        elif match_type == "FP":
            ai_time = ai_event['time']
            action = ai_event['action']
            outcome = ai_event['outcome']
            team = ai_event['team']
            
            lines.append(f"❌ FALSE POSITIVE at {format_time(ai_time)} | {team} {action} - {outcome}")
            lines.append(f"   AI: {format_time(ai_time)} | ID: {ai_event.get('id', 'unknown')}")
            lines.append(f"   GT: No matching event within ±{TOLERANCE}s")
            
        elif match_type == "FN":
            gt_time = gt_event['time']
            action = gt_event['action']
            outcome = gt_event['outcome']
            team = gt_event['team']
            
            lines.append(f"⚠️  MISSED by AI at {format_time(gt_time)} | {team} {action} - {outcome}")
            lines.append(f"   AI: Not detected")
            lines.append(f"   GT: {format_time(gt_time)} | ID: {gt_event.get('id', 'unknown')}")
        
        lines.append("")
    
    return "\n".join(lines)


def main():
    """Main evaluation pipeline"""
    
    print("🎯 JSON-BASED AI vs GROUND TRUTH EVENT COMPARISON (EVENT_SCHEMA)")
    print(f"   AI JSON:  {AI_JSON_FILE.name}")
    print(f"   GT JSON:  {GT_JSON_FILE.name}")
    if ARGS.time_limit:
        print(f"   Time Limit: {ARGS.time_limit}s ({ARGS.time_limit/60:.1f} min)")
    print()
    
    # Load events
    print(f"🔍 Loading AI events...")
    ai_events = load_events(AI_JSON_FILE, time_limit=ARGS.time_limit)
    print(f"   Found {len(ai_events)} AI events")
    
    print(f"🔍 Loading ground truth events...")
    gt_events = load_events(GT_JSON_FILE, time_limit=ARGS.time_limit)
    print(f"   Found {len(gt_events)} ground truth events")
    print()
    
    # Match events
    event_stats, matches = match_events(ai_events, gt_events)
    
    # Calculate metrics
    overall_metrics = calculate_metrics(event_stats)
    
    # Prepare output
    output = {
        "methodology": f"JSON-based EVENT_SCHEMA comparison with ±{TOLERANCE}s tolerance",
        "tolerance_seconds": TOLERANCE,
        "ai_json_file": AI_JSON_FILE.name,
        "gt_json_file": GT_JSON_FILE.name,
        "per_event": event_stats,
        "micro": overall_metrics,
        "detailed_matches": matches,
        "summary": {
            "total_ai_events": len(ai_events),
            "total_gt_events": len(gt_events),
            "precision": f"{overall_metrics['precision']:.1%}",
            "recall": f"{overall_metrics['recall']:.1%}",
            "f1_score": f"{overall_metrics['f1']:.1%}"
        }
    }
    
    # Save metrics
    with open(OUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Generate and save timeline
    timeline_text = generate_timeline(matches, overall_metrics, len(ai_events), len(gt_events), event_stats, OUTPUT_DIR)
    with open(TIMELINE_FILE, 'w') as f:
        f.write(timeline_text)
    
    print(f"📊 JSON COMPARISON RESULTS:")
    print(f"   Precision: {overall_metrics['precision']:.1%}")
    print(f"   Recall: {overall_metrics['recall']:.1%}")
    print(f"   F1 Score: {overall_metrics['f1']:.1%}")
    print(f"   True Positives: {overall_metrics['TP']}")
    print(f"   False Positives: {overall_metrics['FP']}")
    print(f"   False Negatives: {overall_metrics['FN']}")
    print()
    print(f"✅ Saved metrics: {OUT_FILE.name}")
    print(f"✅ Saved timeline: {TIMELINE_FILE.name}")


if __name__ == "__main__":
    main()
