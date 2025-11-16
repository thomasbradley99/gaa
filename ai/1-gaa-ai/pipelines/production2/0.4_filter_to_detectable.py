#!/usr/bin/env python3
"""
Filter Ground Truth XML to Detectable Events Only

Converts full ground truth XML (with all events including meta events) 
to filtered XML containing only detectable/evaluable events as defined 
in schema_gaa_evaluation.json. Optionally filters by time range.

Usage:
    python3 0.4_filter_to_detectable.py --game cmull-vs-castleconnor
    python3 0.4_filter_to_detectable.py --game cmull-vs-castleconnor --time-range 450-2400
    python3 0.4_filter_to_detectable.py --game cmull-vs-castleconnor --schema schema_gaa_evaluation.json --time-range 450-2400
"""

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
import json

parser = argparse.ArgumentParser(description='Filter ground truth XML to detectable events only')
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--schema', default='schema_gaa_evaluation.json', help='Schema file to use for filtering')
parser.add_argument('--input', default='ground_truth_template.xml', help='Input XML filename')
parser.add_argument('--output', default='ground_truth_detectable_events.xml', help='Output XML filename')
parser.add_argument('--time-range', help='Time range to filter (e.g., "450-2400" for 450s to 2400s)', default=None)
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUT_DIR = GAME_ROOT / "inputs"
SCHEMA_DIR = PROD_ROOT / "schemas"

INPUT_XML = INPUT_DIR / ARGS.input
OUTPUT_XML = INPUT_DIR / ARGS.output
SCHEMA_FILE = SCHEMA_DIR / ARGS.schema

# Validate inputs
if not INPUT_XML.exists():
    print(f"❌ Input XML not found: {INPUT_XML}")
    exit(1)

if not SCHEMA_FILE.exists():
    print(f"❌ Schema file not found: {SCHEMA_FILE}")
    exit(1)

# Load schema
with open(SCHEMA_FILE, 'r') as f:
    schema_data = json.load(f)
    detectable_events = set(schema_data.get('actions', {}).keys())
    excluded_events = set(schema_data.get('excluded_events', {}).keys())

# Parse time range if provided
time_range = None
if ARGS.time_range:
    start_str, end_str = ARGS.time_range.split('-')
    time_range = (float(start_str), float(end_str))

print(f"📋 Stage 0.4: Filter Ground Truth XML to Detectable Events")
print(f"   Input:  {INPUT_XML.name}")
print(f"   Output: {OUTPUT_XML.name}")
print(f"   Schema: {SCHEMA_FILE.name}")
print(f"   Detectable events: {len(detectable_events)}")
print(f"   Excluded events: {len(excluded_events)}")
if time_range:
    print(f"   Time range: {time_range[0]:.0f}s ({time_range[0]//60:.0f}m{time_range[0]%60:02.0f}s) to {time_range[1]:.0f}s ({time_range[1]//60:.0f}m{time_range[1]%60:02.0f}s)")
else:
    print(f"   Time range: All events")
print()

# Parse input XML
tree = ET.parse(INPUT_XML)
root = tree.getroot()

# Filter instances
all_instances = root.findall('.//instance')
filtered_instances = []
excluded_count = 0
time_filtered_count = 0

for instance in all_instances:
    code_elem = instance.find('code')
    start_elem = instance.find('start')
    
    if code_elem is None:
        continue
    
    code = (code_elem.text or '').strip()
    
    # Filter by time range if provided
    if time_range and start_elem is not None:
        try:
            start_time = float(start_elem.text or '0')
            if not (time_range[0] <= start_time <= time_range[1]):
                time_filtered_count += 1
                continue
        except (ValueError, TypeError):
            continue
    
    # Keep if in detectable events, exclude if in excluded list
    if code in detectable_events:
        filtered_instances.append(instance)
    elif code in excluded_events:
        excluded_count += 1
    else:
        # Event not in schema - exclude it (might be new/unknown event type)
        excluded_count += 1

print(f"📊 Filtering Results:")
print(f"   Total events in input: {len(all_instances)}")
if time_range:
    print(f"   Events outside time range: {time_filtered_count}")
print(f"   Detectable events kept: {len(filtered_instances)}")
print(f"   Events excluded (meta/unknown): {excluded_count}")
print()

# Create new XML structure
new_root = ET.Element('file')
new_all_instances = ET.SubElement(new_root, 'ALL_INSTANCES')

# Copy filtered instances with renumbered IDs
for idx, instance in enumerate(filtered_instances, start=1):
    new_instance = ET.SubElement(new_all_instances, 'instance')
    
    # Copy all child elements
    for child in instance:
        new_child = ET.SubElement(new_instance, child.tag)
        new_child.text = child.text
        new_child.tail = child.tail
        
        # Copy label structure if present
        if child.tag == 'label':
            for label_child in child:
                label_elem = ET.SubElement(new_child, label_child.tag)
                label_elem.text = label_child.text
                label_elem.tail = label_child.tail
    
    # Renumber ID
    id_elem = new_instance.find('ID')
    if id_elem is not None:
        id_elem.text = str(idx)

# Write output XML
tree = ET.ElementTree(new_root)
ET.indent(tree, space='  ')
tree.write(OUTPUT_XML, encoding='utf-8', xml_declaration=True)

print(f"✅ Filtered XML saved to: {OUTPUT_XML}")
print(f"   File size: {OUTPUT_XML.stat().st_size / 1024:.1f} KB")
print()
print(f"💡 Next steps:")
print(f"   - Use {OUTPUT_XML.name} for evaluation (fair comparison)")
print(f"   - Or use {INPUT_XML.name} and let evaluation script filter on-the-fly")

