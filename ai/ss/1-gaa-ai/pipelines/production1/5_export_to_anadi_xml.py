#!/usr/bin/env python3
"""
Convert AI events JSON to Anadi XML format with proper Code Window compliance
Usage: python3 4_export_to_anadi_xml.py --game {game-name}
"""

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.dom import minidom

# Prefer explicit event.tag over heuristic mapping when available

# Parse arguments
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
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

def _prefer_event_tag_for_label(code: str, event: dict) -> tuple:
    tag = event.get("tag")
    if tag:
        if "Shot at Goal" in code:
            return ("Shot Outcome", tag)
        if "Regain Won" in code:
            return ("Turnover Won Zone", tag)
        if "Free Kick" in code:
            return ("Free Kick", tag)
        if "Penalty Shoot Out" in code:
            return ("Tags", tag)
    return (None, None)

# Event duration mappings (lead-in/lead-out in seconds) - from Anadi's raw.xml analysis
EVENT_DURATIONS = {
    # Scoring
    "Goal": 23,
    # Shots
    "Shot at Goal": 9,
    # Set pieces
    "Corner": 10,
    "Free Kick": 11,
    "Goal Kick": 11,
    "Throw In": 11,
    "Kick Off": 11,
    "Penalty": 6,
    # Turnovers
    "Regain Won": 15,
    # Attacking
    "A3 Entry": 20,
    "Cross": 10,
    # Infractions
    "Foul": 11,
    "Offside": 13,
    "Yellow Card": 20,
    "Red Card": 20,
}

# Shot outcome mapping (based on AI description keywords)
SHOT_OUTCOMES = {
    "save": "Save",
    "saved": "Save",
    "keeper": "Save",
    "goalkeeper": "Save",
    "block": "Blocked",
    "blocked": "Blocked",
    "deflect": "Blocked",
    "off target": "Off Target",
    "wide": "Off Target",
    "over": "Off Target",
    "miss": "Off Target",
    "on target": "On Target",
    "goal": "Goal",  # Special case - would be separate Goal event
}

# Zone mapping for field positions (D3=Defensive, M3=Middle, A3=Attacking)
ZONE_KEYWORDS = {
    "defensive third": "D3",
    "own half": "D3",
    "penalty area": "A3",
    "attacking third": "A3",
    "final third": "A3",
    "box": "A3",
    "midfield": "M3",
    "middle third": "M3",
    "centre": "centre",
    "center": "centre",
    "left": "left",
    "right": "right",
}

def get_event_duration(code: str) -> int:
    """Get standard duration for an event type"""
    for key, duration in EVENT_DURATIONS.items():
        if key in code:
            return duration
    return 5  # Default: 5 second window if unknown

def map_shot_outcome(label: str) -> str:
    """Map AI description to standard shot outcome"""
    if not label:
        return "On Target"  # Default
    
    label_lower = label.lower()
    for keyword, outcome in SHOT_OUTCOMES.items():
        if keyword in label_lower:
            return outcome
    return "On Target"  # Default

def extract_zone(label: str) -> str:
    """Extract zone from AI description (D3/M3/A3 + left/centre/right)"""
    if not label:
        return "M3 centre"  # Default
    
    label_lower = label.lower()
    
    # Determine third
    third = "M3"  # Default to middle
    for keyword, zone in ZONE_KEYWORDS.items():
        if keyword in label_lower and zone in ["D3", "M3", "A3"]:
            third = zone
            break
    
    # Determine lane
    lane = "centre"  # Default
    for keyword, direction in ZONE_KEYWORDS.items():
        if keyword in label_lower and direction in ["left", "right", "centre"]:
            lane = direction
            break
    
    return f"{third} {lane}"

def create_structured_label(code: str, ai_label: str) -> tuple:
    """
    Create structured label (group, text) based on event type and AI description.
    Returns (group, text) tuple or (None, None) if no structured label applies.
    """
    if "Shot at Goal" in code:
        outcome = map_shot_outcome(ai_label)
        return ("Shot Outcome", outcome)
    
    elif "Regain Won" in code:
        zone = extract_zone(ai_label)
        return ("Turnover Won Zone", zone)
    
    elif "Free Kick" in code:
        # Most are indirect unless specified
        return ("Free Kick", "Indirect")
    
    # No structured label for other event types
    return (None, None)

def json_to_anadi_xml(json_file: Path, xml_file: Path):
    """Convert AI events JSON to Anadi XML format with Code Window compliance"""
    
    # Load AI events
    with open(json_file, 'r') as f:
        events = json.load(f)
    
    print(f"📖 Loaded {len(events)} AI events from {json_file.name}")
    
    # Create root element
    root = ET.Element("file")
    
    # Add ALL_INSTANCES container
    all_instances = ET.SubElement(root, "ALL_INSTANCES")
    
    # Convert each event to XML
    for i, event in enumerate(events, 1):
        instance = ET.SubElement(all_instances, "instance")
        
        # ID - NUMERIC ONLY (no "ai-" prefix, no leading zeros)
        id_elem = ET.SubElement(instance, "ID")
        original_id = event.get("ID", f"ai-{i}")
        # Strip "ai-" prefix if present, keep just the number
        numeric_id = original_id.replace("ai-", "").replace("ai_", "")
        # Convert to int and back to string to remove any leading zeros
        id_elem.text = str(int(numeric_id))
        
        # Get base time and event code
        start_seconds = event.get("start_seconds", 0)
        code = event.get("code", "")
        
        # Calculate duration based on event type
        duration = get_event_duration(code)
        lead_in = duration // 2  # Half before
        lead_out = duration - lead_in  # Half after (or more)
        
        # Start time (with lead-in)
        start_elem = ET.SubElement(instance, "start")
        start_with_lead = max(0, int(start_seconds - lead_in))
        start_elem.text = str(start_with_lead)
        
        # End time (with lead-out)
        end_elem = ET.SubElement(instance, "end")
        end_with_lead = int(start_seconds + lead_out)
        end_elem.text = str(end_with_lead)
        
        # Code (event type)
        code_elem = ET.SubElement(instance, "code")
        code_elem.text = code
        
        # Label - structured with group/text if applicable
        ai_label = event.get("label", "")
        # prefer explicit tag
        group, text = _prefer_event_tag_for_label(code, event)
        if not group:
            group, text = create_structured_label(code, ai_label)
        
        if group and text:
            # Structured label with group
            label_elem = ET.SubElement(instance, "label")
            group_elem = ET.SubElement(label_elem, "group")
            group_elem.text = group
            text_elem = ET.SubElement(label_elem, "text")
            text_elem.text = text
    
    # Pretty print the XML with utf-8 encoding
    xml_string = ET.tostring(root, encoding='utf-8')
    dom = minidom.parseString(xml_string)
    pretty_xml = dom.toprettyxml(indent="  ", encoding='utf-8').decode('utf-8')
    
    # Remove extra blank lines
    pretty_xml = '\n'.join([line for line in pretty_xml.split('\n') if line.strip()])
    
    # Save to file
    with open(xml_file, 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
    
    print(f"✅ Converted {len(events)} events to XML")
    print(f"💾 Saved to: {xml_file}")
    print(f"📏 File size: {xml_file.stat().st_size / 1024:.1f}KB")
    print(f"\n🎯 Anadi-compliant XML:")
    print(f"  ✅ Numeric IDs (no 'ai-' prefix)")
    print(f"  ✅ Proper event durations (lead-in/lead-out)")
    print(f"  ✅ Structured labels (Shot Outcome, Turnover Won Zone, Free Kick)")

def narrative_to_xml(narrative_file: Path, xml_file: Path):
    """Read narrative.txt directly and create XML (bypassing JSON)"""
    
    # Read narrative
    with open(narrative_file, 'r') as f:
        narrative_text = f.read()
    
    print(f"📖 Loaded narrative: {len(narrative_text)} characters")
    
    # Parse events using regex
    # Pattern: MM:SS - Event Code [Optional Tag] [Optional: Description]
    pattern = r'(\d+):(\d+)\s*-\s*([^\[\:]+?)(?:\s*\[([^\]]+)\])?(?:\s*:\s*(.+))?$'
    events = []
    
    for line in narrative_text.split('\n'):
        line = line.strip()
        if not line or line.startswith('Here are') or line.startswith('**'):
            continue
            
        match = re.match(pattern, line)
        if match:
            minutes, seconds, code, tag, label = match.groups()
            start_seconds = int(minutes) * 60 + int(seconds)
            
            event = {
                'ID': str(len(events) + 1),
                'start_seconds': start_seconds,
                'code': code.strip(),
                'label': label.strip() if label else code.strip(),  # Use code as label if no description
                'tag': tag.strip() if tag else None
            }
            events.append(event)
    
    print(f"📊 Parsed {len(events)} events from narrative")
    
    # Now convert to XML (same logic as json_to_anadi_xml but simpler)
    root = ET.Element("file")
    all_instances = ET.SubElement(root, "ALL_INSTANCES")
    
    for event in events:
        instance = ET.SubElement(all_instances, "instance")
        
        # ID
        id_elem = ET.SubElement(instance, "ID")
        id_elem.text = event['ID']
        
        # Get event details
        code = event['code']
        start_seconds = event['start_seconds']
        
        # Calculate duration
        duration = get_event_duration(code)
        lead_in = duration // 2
        lead_out = duration - lead_in
        
        # Start/End times
        start_elem = ET.SubElement(instance, "start")
        start_elem.text = str(max(0, int(start_seconds - lead_in)))
        
        end_elem = ET.SubElement(instance, "end")
        end_elem.text = str(int(start_seconds + lead_out))
        
        # Code
        code_elem = ET.SubElement(instance, "code")
        code_elem.text = code
        
        # Label with tag if present
        tag = event.get('tag')
        if tag:
            label_elem = ET.SubElement(instance, "label")
            group_elem = ET.SubElement(label_elem, "group")
            text_elem = ET.SubElement(label_elem, "text")
            
            if "Shot at Goal" in code:
                group_elem.text = "Shot Outcome"
                text_elem.text = tag
            elif "Free Kick" in code:
                group_elem.text = "Free Kick"
                text_elem.text = tag
    
    # Pretty print
    xml_string = ET.tostring(root, encoding='unicode')
    dom = minidom.parseString(xml_string)
    pretty_xml = dom.toprettyxml(indent="  ")
    pretty_xml = '\n'.join([line for line in pretty_xml.split('\n') if line.strip()])
    
    # Save
    with open(xml_file, 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
    
    print(f"✅ Converted {len(events)} events to XML")
    print(f"💾 Saved to: {xml_file}")

if __name__ == "__main__":
    # Input: events.json
    json_file = OUTPUT_DIR / "4_events.json"
    
    # Output: Anadi XML format (numbered)
    xml_filename = f"5_{ARGS.game.replace('-', '_')}_Detectable_Events_AI.xml"
    xml_file = OUTPUT_DIR / xml_filename
    
    if json_file.exists():
        json_to_anadi_xml(json_file, xml_file)
    else:
        # Fallback to narrative if JSON doesn't exist
        narrative_file = OUTPUT_DIR / "2_narrative.txt"
        narrative_to_xml(narrative_file, xml_file)
    
    print("\n🎯 Ready to send to Anadi!")
