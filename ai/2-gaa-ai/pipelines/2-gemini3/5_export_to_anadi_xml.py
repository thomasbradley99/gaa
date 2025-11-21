#!/usr/bin/env python3
"""
Stage 5: Convert EVENT_SCHEMA JSON to Anadi XML format

Converts AI-generated events (EVENT_SCHEMA JSON) to Anadi-compliant XML
for manual review/editing in Anadi Pro.

Only exports detectable events: Shot, Kickout, Turnover, Foul, Throw-up

Usage: python3 5_export_to_anadi_xml.py --game {game-name}
"""

import json
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.dom import minidom

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game

# Auto-detect output folder
run_config = GAME_ROOT / "outputs" / ".current_run.txt"
if run_config.exists():
    output_folder = run_config.read_text().strip()
    print(f"📁 Using output folder: {output_folder}")
else:
    output_folder = "2-gemini3"
    print(f"📁 Using default folder: {output_folder}")

OUTPUT_DIR = GAME_ROOT / "outputs" / output_folder
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def event_schema_to_anadi(event: dict) -> dict:
    """
    Convert EVENT_SCHEMA event to Anadi XML fields
    
    EVENT_SCHEMA:
      {
        "time": 685.0,
        "team": "home" | "away",
        "action": "Shot" | "Kickout" | "Turnover" | "Foul" | "Throw-up",
        "outcome": "Point" | "Wide" | "Goal" | "Saved" | "Won" | "Lost" | "Awarded" | "Conceded",
        "metadata": { ... }
      }
    
    Anadi XML:
      <code>Shot Own</code>
      <label><text>Point</text></label>
    """
    
    action = event['action']
    outcome = event['outcome']
    team = event['team']
    metadata = event.get('metadata', {})
    
    # Convert team to Own/Opp (Home=Own, Away=Opp)
    team_label = "Own" if team == "home" else "Opp"
    
    # Build Anadi code and labels
    anadi_event = {
        "start": event['time'],
        "end": event['time'] + 3,  # Default 3-second window
        "code": None,
        "labels": []
    }
    
    if action == "Shot":
        anadi_event["code"] = f"Shot {team_label}"
        anadi_event["end"] = event['time'] + 10  # Shots need longer window
        
        # Add outcome label
        anadi_event["labels"].append(outcome)  # "Point", "Wide", "Goal", "Saved"
        
        # Add "From" tag
        from_type = metadata.get('from', 'play')
        if from_type == 'play':
            anadi_event["labels"].append("From Play")
        elif from_type == 'free':
            anadi_event["labels"].append("From Free")
        elif from_type == '45m':
            anadi_event["labels"].append("From 45m")
        elif from_type == 'penalty':
            anadi_event["labels"].append("From Penalty")
    
    elif action == "Kickout":
        anadi_event["code"] = f"Kickout {team_label}"
        anadi_event["end"] = event['time'] + 10
        
        # Add outcome
        anadi_event["labels"].append(outcome)  # "Won" or "Lost"
        
        # Add kickout type
        kickout_type = metadata.get('kickoutType')
        if kickout_type:
            anadi_event["labels"].append(kickout_type.capitalize())  # "Long", "Mid", "Short"
        
        # Add direction
        direction = metadata.get('direction')
        if direction:
            anadi_event["labels"].append(direction.capitalize())  # "Left", "Right", "Centre"
    
    elif action == "Turnover":
        # Anadi format: "Turnover Won" or "Turnover lost" (lowercase 'lost')
        if outcome == "Won":
            anadi_event["code"] = "Turnover Won"
        else:
            anadi_event["code"] = "Turnover lost"
        
        anadi_event["end"] = event['time'] + 5
        
        # Add turnover type
        turnover_type = metadata.get('turnoverType')
        if turnover_type:
            anadi_event["labels"].append(turnover_type.capitalize())  # "Forced", "Unforced"
        
        # Add zone
        zone = metadata.get('zone')
        if zone:
            anadi_event["labels"].append(zone)  # "D1", "M2", etc.
            # Add zone description
            if zone.startswith('D'):
                anadi_event["labels"].append("defensive")
            elif zone.startswith('M'):
                anadi_event["labels"].append("middle third")
            elif zone.startswith('A'):
                anadi_event["labels"].append("attack third")
    
    elif action == "Foul":
        # Anadi format: "Foul Awarded" or "Foul Conceded"
        anadi_event["code"] = f"Foul {outcome}"  # "Foul Awarded" or "Foul Conceded"
        anadi_event["end"] = event['time'] + 5
        
        # Add scoreable flag
        if metadata.get('scoreable'):
            # Create separate scoreable foul code
            anadi_event["code"] = f"Scoreable Foul {outcome}"
            anadi_event["labels"].append("Scoreable")
    
    elif action == "Throw-up":
        anadi_event["code"] = "Throw Up"
        anadi_event["end"] = event['time'] + 5
        anadi_event["labels"].append(outcome)  # "Won" or "Lost"
    
    return anadi_event


def build_anadi_xml(events: list, game_slug: str) -> str:
    """Build Anadi XML structure from EVENT_SCHEMA events"""
    
    # Create root
    root = ET.Element("file")
    all_instances = ET.SubElement(root, "ALL_INSTANCES")
    
    for idx, event in enumerate(events, start=1):
        # Convert to Anadi format
        anadi_event = event_schema_to_anadi(event)
        
        if not anadi_event["code"]:
            continue  # Skip if conversion failed
        
        # Create instance
        instance = ET.SubElement(all_instances, "instance")
        
        # Add ID
        id_elem = ET.SubElement(instance, "ID")
        id_elem.text = str(idx)
        
        # Add timestamps
        start_elem = ET.SubElement(instance, "start")
        start_elem.text = str(anadi_event["start"])
        
        end_elem = ET.SubElement(instance, "end")
        end_elem.text = str(anadi_event["end"])
        
        # Add code
        code_elem = ET.SubElement(instance, "code")
        code_elem.text = anadi_event["code"]
        
        # Add labels
        for label_text in anadi_event["labels"]:
            label = ET.SubElement(instance, "label")
            group = ET.SubElement(label, "group")
            group.text = "Tags"
            text = ET.SubElement(label, "text")
            text.text = label_text
    
    # Pretty print
    xml_string = ET.tostring(root, encoding='unicode')
    dom = minidom.parseString(xml_string)
    pretty_xml = dom.toprettyxml(indent="  ")
    
    # Remove empty lines
    lines = [line for line in pretty_xml.split('\n') if line.strip()]
    return '\n'.join(lines)


def main():
    input_file = OUTPUT_DIR / "4_events.json"
    game_slug = ARGS.game.replace('-', '_')
    output_file = OUTPUT_DIR / f"5_{game_slug}_Detectable_Events_AI.xml"
    
    if not input_file.exists():
        raise FileNotFoundError(f"❌ Input file not found: {input_file}")
    
    # Load EVENT_SCHEMA JSON
    with open(input_file, 'r') as f:
        events = json.load(f)
    
    print(f"📖 Loaded {len(events)} events from EVENT_SCHEMA JSON")
    
    # Convert to Anadi XML
    xml_content = build_anadi_xml(events, game_slug)
    
    # Save
    with open(output_file, 'w') as f:
        f.write(xml_content)
    
    print(f"✅ Exported {len(events)} events to Anadi XML")
    print(f"💾 Saved to: {output_file.name}")
    
    # Show breakdown
    action_counts = {}
    for event in events:
        action = event['action']
        action_counts[action] = action_counts.get(action, 0) + 1
    
    print(f"\n📊 Event Breakdown:")
    for action, count in sorted(action_counts.items()):
        print(f"   {action}: {count}")


if __name__ == "__main__":
    print(f"🏷️  STAGE 5: EVENT_SCHEMA → ANADI XML EXPORT")
    print(f"Game: {ARGS.game}")
    print("=" * 50)
    main()
