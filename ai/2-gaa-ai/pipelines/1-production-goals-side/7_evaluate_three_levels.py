#!/usr/bin/env python3
"""
Stage 7: Three-Level Evaluation - Generate 3 detailed timeline files

Level 1 (Strictest): Time + Action + Team + Outcome
Level 2 (Medium):    Time + Action + Outcome (ignore team)
Level 3 (Loose):     Time + Action (ignore team and outcome)

Outputs:
- 7_evaluation_level1.txt (strictest matching)
- 7_evaluation_level2.txt (medium matching)
- 7_evaluation_level3.txt (loose matching)
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Callable

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name')
parser.add_argument('--time-limit', type=float, help='Time limit in seconds')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs"

run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
else:
    output_folder = "6-with-audio"

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder

AI_JSON_FILE = OUTPUT_DIR / "4_events.json"
GT_JSON_FIRST_10MIN = INPUT_DIR / "web_schema_first_10min.json"
GT_JSON_FULL = INPUT_DIR / "web_schema.json"

# Determine GT file
if ARGS.time_limit and ARGS.time_limit <= 600:
    GT_JSON_FILE = GT_JSON_FIRST_10MIN if GT_JSON_FIRST_10MIN.exists() else GT_JSON_FULL
else:
    GT_JSON_FILE = GT_JSON_FULL if GT_JSON_FULL.exists() else GT_JSON_FIRST_10MIN

TOLERANCE = 20.0


def load_events(json_path: Path, time_limit: float = None) -> List[Dict]:
    with open(json_path, 'r') as f:
        events = json.load(f)
    if time_limit:
        events = [e for e in events if e['time'] <= time_limit]
    return events


def events_match_level1(ai: Dict, gt: Dict) -> bool:
    """Time + Action + Team + Outcome"""
    return (abs(ai['time'] - gt['time']) <= TOLERANCE and
            ai['action'] == gt['action'] and
            ai['team'] == gt['team'] and
            ai['outcome'] == gt['outcome'])


def events_match_level2(ai: Dict, gt: Dict) -> bool:
    """Time + Action + Outcome (ignore team)"""
    return (abs(ai['time'] - gt['time']) <= TOLERANCE and
            ai['action'] == gt['action'] and
            ai['outcome'] == gt['outcome'])


def events_match_level3(ai: Dict, gt: Dict) -> bool:
    """Time + Action (ignore team and outcome)"""
    return (abs(ai['time'] - gt['time']) <= TOLERANCE and
            ai['action'] == gt['action'])


def match_events(ai_events: List[Dict], gt_events: List[Dict], 
                 match_func: Callable) -> Tuple[Dict, List[Dict]]:
    """Match events and return stats + detailed matches"""
    event_stats = defaultdict(lambda: {"TP": 0, "FP": 0, "FN": 0})
    matched_gt_ids = set()
    matches = []
    
    # Match AI to GT
    for ai_event in ai_events:
        ai_action = ai_event['action']
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
            event_stats[ai_action]["TP"] += 1
            matched_gt_ids.add(best_match.get('id', 'unknown'))
            matches.append({
                "ai_event": ai_event,
                "gt_event": best_match,
                "time_diff": best_distance,
                "match_type": "TP"
            })
        else:
            event_stats[ai_action]["FP"] += 1
            matches.append({
                "ai_event": ai_event,
                "gt_event": None,
                "time_diff": None,
                "match_type": "FP"
            })
    
    # Count missed (FN)
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
    total_tp = sum(s["TP"] for s in event_stats.values())
    total_fp = sum(s["FP"] for s in event_stats.values())
    total_fn = sum(s["FN"] for s in event_stats.values())
    
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
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def generate_timeline(level_name: str, criteria: str, matches: List[Dict], 
                      overall_metrics: Dict, total_ai: int, total_gt: int, 
                      event_stats: Dict) -> str:
    """Generate timeline text"""
    sorted_matches = sorted(matches, key=lambda m:
        m['ai_event']['time'] if m['ai_event'] else m['gt_event']['time'])
    
    lines = []
    lines.append("="*100)
    lines.append(f"EVALUATION {level_name.upper()}: {criteria}")
    lines.append("="*100)
    lines.append("")
    
    # Summary
    lines.append("📊 EVALUATION SUMMARY")
    lines.append("-"*100)
    lines.append(f"Matching Criteria: {criteria}")
    lines.append(f"Time Tolerance:    ±{TOLERANCE}s")
    lines.append(f"AI Events:         {total_ai}")
    lines.append(f"GT Events:         {total_gt}")
    lines.append(f"Matched (TP):      {overall_metrics['TP']}")
    lines.append(f"False Pos:         {overall_metrics['FP']}")
    lines.append(f"Missed (FN):       {overall_metrics['FN']}")
    lines.append("")
    lines.append(f"Precision:         {overall_metrics['precision']:.1%}")
    lines.append(f"Recall:            {overall_metrics['recall']:.1%}")
    lines.append(f"F1 Score:          {overall_metrics['f1']:.1%}")
    lines.append("")
    
    # Per-event breakdown
    lines.append("📋 PER-EVENT-TYPE BREAKDOWN")
    lines.append("-"*100)
    lines.append(f"{'Event Type':<25} {'AI':<6} {'GT':<6} {'TP':<6} {'FP':<6} {'FN':<6} {'Prec':<8} {'Recall':<8} {'F1':<8}")
    lines.append("-"*100)
    
    sorted_events = sorted(event_stats.items(), 
                          key=lambda x: (x[1]['TP'] + x[1]['FN'], x[0]), 
                          reverse=True)
    
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
    
    lines.append("-"*100)
    lines.append(f"{'TOTAL':<25} {total_ai:<6} {total_gt:<6} {overall_metrics['TP']:<6} {overall_metrics['FP']:<6} {overall_metrics['FN']:<6} {overall_metrics['precision']:<8.1%} {overall_metrics['recall']:<8.1%} {overall_metrics['f1']:<8.1%}")
    lines.append("")
    
    # Detailed timeline
    lines.append("="*100)
    lines.append("DETAILED TIMELINE")
    lines.append("="*100)
    lines.append("")
    
    for match in sorted_matches:
        match_type = match['match_type']
        ai_event = match['ai_event']
        gt_event = match['gt_event']
        
        if match_type == "TP":
            ai_time = ai_event['time']
            action = ai_event['action']
            outcome = ai_event['outcome']
            team = ai_event['team']
            time_diff = match['time_diff']
            
            lines.append(f"✅ MATCH at {format_time(ai_time)} | {team} {action} - {outcome}")
            lines.append(f"   AI: {format_time(ai_time)} | ID: {ai_event.get('id', 'unknown')}")
            lines.append(f"   GT: {format_time(gt_event['time'])} | ID: {gt_event.get('id', 'unknown')}")
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
    print("🎯 THREE-LEVEL EVALUATION - Generating detailed timelines")
    print(f"   AI JSON:  {AI_JSON_FILE.name}")
    print(f"   GT JSON:  {GT_JSON_FILE.name}")
    print()
    
    ai_events = load_events(AI_JSON_FILE, time_limit=ARGS.time_limit)
    gt_events = load_events(GT_JSON_FILE, time_limit=ARGS.time_limit)
    
    print(f"📊 Loaded {len(ai_events)} AI events, {len(gt_events)} GT events")
    print()
    
    levels = [
        ("Level 1", "Time + Action + Team + Outcome", events_match_level1, "7_evaluation_level1.txt"),
        ("Level 2", "Time + Action + Outcome (no team)", events_match_level2, "7_evaluation_level2.txt"),
        ("Level 3", "Time + Action (no team/outcome)", events_match_level3, "7_evaluation_level3.txt"),
    ]
    
    for level_name, criteria, match_func, output_filename in levels:
        print(f"📝 Generating {level_name}...")
        event_stats, matches = match_events(ai_events, gt_events, match_func)
        overall_metrics = calculate_metrics(event_stats)
        
        timeline_text = generate_timeline(level_name, criteria, matches, 
                                         overall_metrics, len(ai_events), 
                                         len(gt_events), event_stats)
        
        output_file = OUTPUT_DIR / output_filename
        with open(output_file, 'w') as f:
            f.write(timeline_text)
        
        print(f"   ✅ {output_filename} - F1: {overall_metrics['f1']:.1%}")
    
    print()
    print("✅ Generated 3 detailed evaluation files!")
    print()
    print(f"📁 Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

