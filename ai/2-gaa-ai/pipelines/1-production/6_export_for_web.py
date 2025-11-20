#!/usr/bin/env python3
"""
Export data files for web viewer
"""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
import argparse

def parse_xml_events(xml_file: Path):
    """Parse professional XML to web format - DISCRETE TACTICAL EVENTS ONLY"""
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    # Filter out continuous state tracking events - only keep discrete tactical events
    EXCLUDED_EVENTS = {
        "Ball in Play",
        "Ball Out of Play", 
        "Home Possession",
        "Opp Possession",
        "Stats Pen"
    }
    
    events = []
    for instance in root.findall(".//instance"):
        code_elem = instance.find("code")
        start_elem = instance.find("start")
        
        if code_elem is not None and start_elem is not None:
            code = code_elem.text
            
            # Skip continuous state events
            if code in EXCLUDED_EVENTS:
                continue
            
            start_seconds = int(float(start_elem.text))
            
            # Format time as MM:SS
            minutes = start_seconds // 60
            seconds = start_seconds % 60
            time_label = f"{minutes}:{seconds:02d}"
            
            event = {
                "time": start_seconds,
                "timeLabel": time_label,
                "code": code
            }
            
            # Add label if exists
            label_elem = instance.find(".//label/text")
            if label_elem is not None and label_elem.text:
                event["label"] = label_elem.text
            
            events.append(event)
    
    return events

def parse_ai_events(json_file: Path):
    """Parse AI events JSON to web format"""
    with open(json_file) as f:
        ai_events = json.load(f)
    
    events = []
    for event in ai_events:
        start_seconds = int(event.get("start_seconds", 0))
        minutes = start_seconds // 60
        seconds = start_seconds % 60
        time_label = f"{minutes}:{seconds:02d}"
        
        # Extract event code and tag properly
        code_raw = event.get("code", "Unknown")
        tag = event.get("tag", "")
        
        # If there's a tag, append it to the code in brackets
        if tag:
            code = f"{code_raw}"
        else:
            code = code_raw
        
        web_event = {
            "time": start_seconds,
            "timeLabel": time_label,
            "code": code
        }
        
        # Add tag as label if present
        if tag:
            web_event["label"] = tag
        
        events.append(web_event)
    
    return events

def parse_observations(obs_file: Path):
    """Parse observations.txt to web format"""
    content = obs_file.read_text()
    
    descriptions = []
    for block in content.split('\n['):
        if not block.strip():
            continue
        
        # Add back the [ if it was split
        if not block.startswith('['):
            block = '[' + block
        
        # Extract timestamp from [XXXs] format
        if block.startswith('[') and 's]' in block:
            timestamp_str = block.split('s]')[0].replace('[', '')
            try:
                timestamp = int(timestamp_str)
                # Get description (everything after the timestamp)
                description = block.split('s]', 1)[1].strip()
                
                descriptions.append({
                    "timestamp": timestamp,
                    "description": description
                })
            except ValueError:
                continue
    
    return descriptions

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', required=True, help='Game name (e.g., veo-anadi-28oct)')
    args = parser.parse_args()
    
    # Paths
    PIPELINE_DIR = Path(__file__).parent
    PROD_ROOT = PIPELINE_DIR.parent.parent
    BASE_DIR = PROD_ROOT / "games" / args.game
    INPUT_DIR = BASE_DIR / "inputs"
    
    # Auto-detect output folder from Stage 1
    run_config = BASE_DIR / "outputs" / ".current_run.txt"
    if run_config.exists():
        output_folder = run_config.read_text().strip()
    else:
        output_folder = "6-with-audio"
    
    OUTPUT_DIR = BASE_DIR / "outputs" / output_folder
    
    print(f"📊 EXPORTING DATA FOR WEB VIEWER")
    print(f"Game: {args.game}")
    print(f"📁 Output folder: {output_folder}")
    print("=" * 60)
    
    # 1. Export Professional Events (prefer detectable first 10 min for evaluation)
    pro_xml_first_10 = INPUT_DIR / "ground_truth_detectable_first_10min.xml"
    pro_xml_full = INPUT_DIR / "ground_truth_full.xml"
    pro_xml_filtered = INPUT_DIR / "ground_truth_detectable_events.xml"
    pro_xml_template = INPUT_DIR / "ground_truth_template.xml"
    
    # Use first 10 min if available (for focused evaluation), otherwise fall back to full game
    pro_xml = pro_xml_first_10 if pro_xml_first_10.exists() else (pro_xml_full if pro_xml_full.exists() else (pro_xml_filtered if pro_xml_filtered.exists() else pro_xml_template))
    
    if pro_xml.exists():
        print(f"📖 Parsing professional XML: {pro_xml.name}")
        pro_events = parse_xml_events(pro_xml)
        pro_js = f"const professionalEvents = {json.dumps(pro_events, indent=2)};"
        pro_output = BASE_DIR / "professional_events_data.js"
        pro_output.write_text(pro_js)
        print(f"✅ Exported {len(pro_events)} professional events")
        print(f"   → {pro_output}")
    
    # 2. Export AI Events
    ai_json = OUTPUT_DIR / "4_events.json"
    if ai_json.exists():
        print(f"\n📖 Parsing AI events JSON...")
        ai_events = parse_ai_events(ai_json)
        ai_js = f"const aiEventsData = {json.dumps(ai_events, indent=2)};"
        ai_output = BASE_DIR / "ai_events_data.js"
        ai_output.write_text(ai_js)
        print(f"✅ Exported {len(ai_events)} AI events")
        print(f"   → {ai_output}")
    
    # 3. Export Descriptions
    obs_file = OUTPUT_DIR / "1_observations.txt"
    if obs_file.exists():
        print(f"\n📖 Parsing observations...")
        descriptions = parse_observations(obs_file)
        desc_js = f"const descriptionsData = {json.dumps(descriptions, indent=2)};"
        desc_output = BASE_DIR / "descriptions_data.js"
        desc_output.write_text(desc_js)
        print(f"✅ Exported {len(descriptions)} descriptions")
        print(f"   → {desc_output}")
    
    print("\n" + "=" * 60)
    print("✅ EXPORT COMPLETE!")
    print(f"\n📤 Upload to S3:")
    print(f"   aws s3 cp {BASE_DIR}/*.js s3://end-nov-webapp-clann/gaa-analysis/{args.game}/")
    print(f"\n🌐 Website URL (after upload):")
    print(f"   https://end-nov-webapp-clann.s3.eu-west-1.amazonaws.com/gaa-analysis/game_viewer.html?game={args.game}&audio=with-audio")

if __name__ == "__main__":
    main()

