#!/usr/bin/env python3
"""
Stage 6: Evaluate AI vs Professional Events

Compares AI-generated XML against filtered professional XML
using ±20s tolerance matching.

Usage: python3 6_evaluate.py --game {game-name}
"""

import json
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--time-range', help='Time range to filter professional events (e.g., "660-960" for 11:00-16:00)', default=None)
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent  # production1/
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs"
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
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# File paths
game_slug = ARGS.game.replace('-', '_')
xml_filename = f"5_{game_slug}_Detectable_Events_AI.xml"
AI_XML_FILE = OUTPUT_DIR / xml_filename

# Use ground truth XML files
PRO_XML_FULL_GAME = INPUT_DIR / "ground_truth_full.xml"
PRO_XML_11_16MIN = INPUT_DIR / "ground_truth_11-16min.xml"
PRO_XML_DETECTABLE = INPUT_DIR / "ground_truth_detectable_events.xml"
PRO_XML_TEMPLATE = INPUT_DIR / "ground_truth_template.xml"

# Try ground truth files in priority order (FULL game first)
if PRO_XML_FULL_GAME.exists():
    PRO_XML_FILE = PRO_XML_FULL_GAME  # Full game (will filter to time range)
elif PRO_XML_11_16MIN.exists():
    PRO_XML_FILE = PRO_XML_11_16MIN  # 5-min segment for testing
elif PRO_XML_DETECTABLE.exists():
    PRO_XML_FILE = PRO_XML_DETECTABLE  # Detectable events only
elif PRO_XML_TEMPLATE.exists():
    PRO_XML_FILE = PRO_XML_TEMPLATE  # Template file (full game)
else:
    raise FileNotFoundError("No ground truth XML found in inputs/")

SCHEMA_FILE = SCHEMA_DIR / "schema_gaa_all_events.json"
OUT_FILE = OUTPUT_DIR / "7_evaluation_metrics.json"
TIMELINE_FILE = OUTPUT_DIR / "7_evaluation_timeline.txt"

TOLERANCE = 25.0  # seconds (pro events marked 10-15s early, need wider window)
TAG_AWARE = False  # set True to require tag match where both sides have tags

def load_schema_constraints(schema_path: Path) -> dict:
    """Load detectable event codes from schema"""
    try:
        with open(schema_path, 'r') as f:
            data = json.load(f)
            return data.get("actions", {})
    except Exception as e:
        print(f"⚠️  Warning: Could not load schema: {e}")
        return {}


def parse_xml_to_events(xml_path: Path, schema_constraints: dict = None, time_range: tuple = None) -> list:
    """Parse XML file into event list
    
    Args:
        xml_path: Path to XML file
        schema_constraints: Dict of allowed event codes (optional filter)
        time_range: Tuple of (start_seconds, end_seconds) to filter events (optional)
    """
    content = xml_path.read_text(encoding="utf-8", errors="ignore")
    root = ET.fromstring(content)
    
    events = []
    for instance in root.findall('.//instance'):
        id_elem = instance.find('ID')
        start_elem = instance.find('start')
        end_elem = instance.find('end')
        code_elem = instance.find('code')
        
        if not all([id_elem is not None, start_elem is not None, code_elem is not None]):
            continue
        
        code = (code_elem.text or '').strip()
        
        # Filter to detectable events if schema provided
        if schema_constraints and code not in schema_constraints:
            continue
        
        try:
            start_seconds = float(start_elem.text or '0')
        except:
            continue
        
        # Filter by time range if provided
        if time_range:
            start_time, end_time = time_range
            if not (start_time <= start_seconds <= end_time):
                continue
        
        event = {
            "ID": (id_elem.text or '').strip(),
            "start_seconds": start_seconds,
            "code": code
        }
        
        # Extract tag if present
        label_text_elem = instance.find('.//label/text')
        if label_text_elem is not None and (label_text_elem.text or '').strip():
            event["tag"] = label_text_elem.text.strip()
        
        events.append(event)
    
    return events


def _tags_match(ai_event, pro_event):
    """Check if tags match (if TAG_AWARE is enabled)"""
    if not TAG_AWARE:
        return True
    ai_tag = ai_event.get('tag')
    pro_tag = pro_event.get('tag')
    # If either side lacks tag, fall back to code-only
    if ai_tag is None or pro_tag is None:
        return True
    return ai_tag == pro_tag


def match_events(ai_events, pro_events):
    """Match AI events to Pro events using tolerance window"""
    
    # Initialize counters per event type
    event_stats = defaultdict(lambda: {"TP": 0, "FP": 0, "FN": 0})
    
    # Track which pro events have been matched
    matched_pro_ids = set()
    matches = []
    
    # For each AI event, try to find matching Pro event
    for ai_event in ai_events:
        ai_time = ai_event.get('start_seconds', 0)
        ai_code = ai_event.get('code', '')
        
        best_match = None
        best_distance = float('inf')
        
        # Look for matching pro event
        for pro_event in pro_events:
            pro_time = pro_event.get('start_seconds', 0)
            pro_code = pro_event.get('code', '')
            pro_id = pro_event.get('ID', '')
            
            # Must be same event type and within tolerance
            if (ai_code == pro_code and 
                abs(ai_time - pro_time) <= TOLERANCE and
                pro_id not in matched_pro_ids and
                _tags_match(ai_event, pro_event)):
                
                distance = abs(ai_time - pro_time)
                if distance < best_distance:
                    best_distance = distance
                    best_match = pro_event
        
        # Record the match result
        if best_match:
            # True Positive
            event_stats[ai_code]["TP"] += 1
            matched_pro_ids.add(best_match.get('ID', ''))
            matches.append({
                "ai_event": ai_event,
                "pro_event": best_match,
                "time_diff": best_distance,
                "match_type": "TP"
            })
        else:
            # False Positive (AI detected something that wasn't there)
            event_stats[ai_code]["FP"] += 1
            matches.append({
                "ai_event": ai_event,
                "pro_event": None,
                "time_diff": None,
                "match_type": "FP"
            })
    
    # Count False Negatives (Pro events that AI missed)
    for pro_event in pro_events:
        pro_id = pro_event.get('ID', '')
        pro_code = pro_event.get('code', '')
        
        if pro_id not in matched_pro_ids:
            event_stats[pro_code]["FN"] += 1
            matches.append({
                "ai_event": None,
                "pro_event": pro_event,
                "time_diff": None,
                "match_type": "FN"
            })
    
    return event_stats, matches


def calculate_metrics(event_stats):
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


def generate_timeline(matches, overall_metrics, total_ai, total_pro, output_dir, event_stats):
    """Generate timeline comparison text file with summary header, costs, and per-event breakdown"""
    # Sort by time (use whichever event exists)
    sorted_matches = sorted(matches, key=lambda m: 
        m['ai_event']['start_seconds'] if m['ai_event'] 
        else m['pro_event']['start_seconds'])
    
    lines = []
    lines.append("=" * 100)
    lines.append("XML-BASED TIMELINE COMPARISON: AI vs Professional Events")
    lines.append("=" * 100)
    lines.append("")
    
    # Calculate time range analyzed
    if sorted_matches:
        all_times = []
        for m in sorted_matches:
            if m['ai_event']:
                all_times.append(m['ai_event']['start_seconds'])
            if m['pro_event']:
                all_times.append(m['pro_event']['start_seconds'])
        if all_times:
            min_time = int(min(all_times))
            max_time = int(max(all_times))
            time_analyzed = f"{min_time//60}:{min_time%60:02d} - {max_time//60}:{max_time%60:02d} ({(max_time-min_time)//60} minutes)"
        else:
            time_analyzed = "Unknown"
    else:
        time_analyzed = "Unknown"
    
    # Add summary header
    lines.append("📊 EVALUATION SUMMARY")
    lines.append("-" * 100)
    lines.append(f"Time Analyzed: {time_analyzed}")
    lines.append(f"AI Events:     {total_ai}")
    lines.append(f"Pro Events:    {total_pro}")
    lines.append(f"Matched (TP):  {overall_metrics['TP']}")
    lines.append(f"False Pos:     {overall_metrics['FP']}")
    lines.append(f"Missed (FN):   {overall_metrics['FN']}")
    lines.append("")
    lines.append(f"Precision:     {overall_metrics['precision']:.1%}")
    lines.append(f"Recall:        {overall_metrics['recall']:.1%}")
    lines.append(f"F1 Score:      {overall_metrics['f1']:.1%}")
    lines.append("")
    
    # Add cost summary with token details
    lines.append("💰 COST BREAKDOWN")
    lines.append("-" * 100)
    
    total_cost = 0.0
    total_input_tokens = 0
    total_output_tokens = 0
    
    # Stage 1
    stage1_file = output_dir / "usage_stats_stage1.json"
    if not stage1_file.exists():
        stage1_file = output_dir / "usage_stats.json"  # Fallback to old name
    
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
    
    lines.append(f"Stages 4-7:                   $0.0000  (regex/XML only)")
    lines.append("-" * 100)
    lines.append(f"TOTAL THIS RUN:               ${total_cost:.4f}  ({total_input_tokens:,} in / {total_output_tokens:,} out)")
    lines.append("")
    lines.append("Note: Calibration ($0.05 one-time per game) not included above")
    lines.append("")
    
    # Add per-event-type breakdown
    lines.append("📋 PER-EVENT-TYPE BREAKDOWN")
    lines.append("-" * 100)
    lines.append(f"{'Event Type':<25} {'AI':<6} {'Pro':<6} {'TP':<6} {'FP':<6} {'FN':<6} {'Prec':<8} {'Recall':<8} {'F1':<8}")
    lines.append("-" * 100)
    
    # Sort by number of professional events (most common first)
    sorted_events = sorted(event_stats.items(), key=lambda x: (x[1]['TP'] + x[1]['FN'], x[0]), reverse=True)
    
    for event_type, stats in sorted_events:
        tp = stats['TP']
        fp = stats['FP']
        fn = stats['FN']
        
        # Calculate counts (AI = TP + FP, Pro = TP + FN)
        ai_count = tp + fp
        pro_count = tp + fn
        
        # Calculate per-event metrics
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0
        
        # Only show events that exist in either AI or Pro
        if ai_count > 0 or pro_count > 0:
            lines.append(f"{event_type:<25} {ai_count:<6} {pro_count:<6} {tp:<6} {fp:<6} {fn:<6} {prec:<8.1%} {rec:<8.1%} {f1:<8.1%}")
    
    lines.append("-" * 100)
    lines.append(f"{'TOTAL':<25} {total_ai:<6} {total_pro:<6} {overall_metrics['TP']:<6} {overall_metrics['FP']:<6} {overall_metrics['FN']:<6} {overall_metrics['precision']:<8.1%} {overall_metrics['recall']:<8.1%} {overall_metrics['f1']:<8.1%}")
    lines.append("")
    
    lines.append("=" * 100)
    lines.append("DETAILED TIMELINE")
    lines.append("=" * 100)
    lines.append("")
    
    for match in sorted_matches:
        match_type = match['match_type']
        ai_event = match['ai_event']
        pro_event = match['pro_event']
        
        if match_type == "TP":
            # True Positive: matched
            ai_time = ai_event['start_seconds']
            pro_time = pro_event['start_seconds']
            time_diff = match['time_diff']
            code = ai_event['code']
            
            lines.append(f"✅ MATCH at {format_time(ai_time)} | {code}")
            lines.append(f"   AI:  {format_time(ai_time)} | ID: {ai_event['ID']}")
            lines.append(f"   PRO: {format_time(pro_time)} | ID: {pro_event['ID']}")
            lines.append(f"   Time diff: {time_diff:.1f}s")
            
        elif match_type == "FP":
            # False Positive: AI detected but no pro match
            ai_time = ai_event['start_seconds']
            code = ai_event['code']
            
            lines.append(f"❌ FALSE POSITIVE at {format_time(ai_time)} | {code}")
            lines.append(f"   AI:  {format_time(ai_time)} | ID: {ai_event['ID']}")
            lines.append(f"   PRO: No matching event within ±{TOLERANCE}s")
            
        elif match_type == "FN":
            # False Negative: Pro event but AI missed
            pro_time = pro_event['start_seconds']
            code = pro_event['code']
            
            lines.append(f"⚠️  MISSED by AI at {format_time(pro_time)} | {code}")
            lines.append(f"   AI:  Not detected")
            lines.append(f"   PRO: {format_time(pro_time)} | ID: {pro_event['ID']}")
        
        lines.append("")
    
    return "\n".join(lines)


def main():
    """Main comparison pipeline"""
    
    print("🎯 XML-BASED AI vs PRO EVENT COMPARISON")
    print(f"   AI XML:  {AI_XML_FILE.name}")
    print(f"   PRO XML: {PRO_XML_FILE.name}")
    
    # Auto-detect time range from AI events if not provided
    time_range = None
    if ARGS.time_range:
        start_str, end_str = ARGS.time_range.split('-')
        time_range = (int(start_str), int(end_str))
        print(f"   ⏱️  Manual time range: {time_range[0]//60}:{time_range[0]%60:02d} - {time_range[1]//60}:{time_range[1]%60:02d}")
    else:
        # Auto-detect from AI XML
        try:
            temp_ai_events = parse_xml_to_events(AI_XML_FILE, schema_constraints=None, time_range=None)
            if temp_ai_events:
                ai_times = [e['start_seconds'] for e in temp_ai_events]
                time_range = (int(min(ai_times)), int(max(ai_times)))
                print(f"   ⏱️  Auto-detected time range from AI events: {time_range[0]//60}:{time_range[0]%60:02d} - {time_range[1]//60}:{time_range[1]%60:02d}")
        except:
            print(f"   ⏱️  No time range filter (using full ground truth)")
    
    print(f"   Ground truth: {PRO_XML_FILE.name}")
    if PRO_XML_FILE == PRO_XML_11_16MIN:
        print(f"   ✅ Using 11-16min segment (matches our test clips)")
    elif PRO_XML_FILE == PRO_XML_DETECTABLE:
        print(f"   ✅ Using detectable events only (fair comparison)")
    else:
        print(f"   ⚠️  Using full game XML (will filter on-the-fly)")
    print()
    
    # Load schema constraints
    schema_constraints = load_schema_constraints(SCHEMA_FILE)
    print(f"📋 Loaded schema with {len(schema_constraints)} detectable event types")
    
    # Parse XML files
    print(f"🔍 Parsing AI XML...")
    ai_events = parse_xml_to_events(AI_XML_FILE, schema_constraints=None, time_range=time_range)  # AI already filtered
    print(f"   Found {len(ai_events)} AI events")
    
    print(f"🔍 Parsing Professional XML...")
    pro_events = parse_xml_to_events(PRO_XML_FILE, schema_constraints=schema_constraints, time_range=time_range)
    print(f"   Found {len(pro_events)} professional detectable events")
    print()
    
    # Match events
    event_stats, matches = match_events(ai_events, pro_events)
    
    # Calculate metrics
    overall_metrics = calculate_metrics(event_stats)
    
    # Prepare output
    output = {
        "methodology": f"XML-based structured event comparison with ±{TOLERANCE}s tolerance",
        "tolerance_seconds": TOLERANCE,
        "ai_xml_file": AI_XML_FILE.name,
        "pro_xml_file": PRO_XML_FILE.name,
        "per_event": dict(event_stats),
        "micro": overall_metrics,
        "detailed_matches": matches,
        "summary": {
            "total_ai_events": len(ai_events),
            "total_pro_events": len(pro_events),
            "precision": f"{overall_metrics['precision']:.1%}",
            "recall": f"{overall_metrics['recall']:.1%}",
            "f1_score": f"{overall_metrics['f1']:.1%}"
        }
    }
    
    # Save metrics
    OUT_FILE.parent.mkdir(exist_ok=True)
    with open(OUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Generate and save timeline with summary header, costs, and per-event breakdown
    timeline_text = generate_timeline(matches, overall_metrics, len(ai_events), len(pro_events), OUTPUT_DIR, event_stats)
    with open(TIMELINE_FILE, 'w') as f:
        f.write(timeline_text)
    
    print(f"📊 XML COMPARISON RESULTS:")
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




