#!/usr/bin/env python3
"""
Stage 5: Export to Anadi XML
Converts JSON events to Anadi iSportsAnalysis XML format
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime


def run(events_json, game_profile, title):
    """
    Export events to Anadi XML format
    
    Args:
        events_json: Structured events JSON
        game_profile: Calibrated game profile
        title: Match title
        
    Returns:
        xml_content: XML string
    """
    print(f"📄 Exporting to Anadi XML format")
    
    team_a = game_profile['team_a']
    team_b = game_profile['team_b']
    
    # Create root element
    root = ET.Element('file')
    
    # ALL_INSTANCES section
    all_instances = ET.SubElement(root, 'ALL_INSTANCES')
    
    events = events_json.get('events', [])
    
    for i, event in enumerate(events):
        instance = ET.SubElement(all_instances, 'instance')
        
        # ID
        ET.SubElement(instance, 'ID').text = str(i + 1)
        
        # Start time (convert to MM:SS.00 format)
        timestamp = event.get('timestamp', 0)
        minutes = timestamp // 60
        seconds = timestamp % 60
        ET.SubElement(instance, 'start').text = f"{minutes:02d}:{seconds:02d}.00"
        
        # End time (add 5 seconds for event duration)
        end_timestamp = timestamp + 5
        end_minutes = end_timestamp // 60
        end_seconds = end_timestamp % 60
        ET.SubElement(instance, 'end').text = f"{end_minutes:02d}:{end_seconds:02d}.00"
        
        # Code (event type)
        event_type = event.get('type', '').title()
        code_window = ET.SubElement(instance, 'code', attrib={'label': 'Code Window'})
        ET.SubElement(code_window, 'code').text = event_type
        
        # Team
        team = event.get('team', '')
        if team == 'home':
            team_name = team_a['jersey_color']
        elif team == 'away':
            team_name = team_b['jersey_color']
        else:
            team_name = team
        
        team_code = ET.SubElement(instance, 'code', attrib={'label': 'Team'})
        ET.SubElement(team_code, 'code').text = team_name
        
        # Metadata
        metadata = event.get('metadata', {})
        
        # Shot outcome (for shots)
        if event_type.lower() == 'shot':
            score_type = metadata.get('scoreType', 'attempt')
            outcome_code = ET.SubElement(instance, 'code', attrib={'label': 'Shot Outcome'})
            ET.SubElement(outcome_code, 'code').text = score_type.title()
        
        # Player (if available)
        player = metadata.get('player')
        if player:
            player_label = ET.SubElement(instance, 'label', attrib={'group': 'Player'})
            ET.SubElement(player_label, 'text').text = player
        
        # Description
        description = event.get('description', '')
        if description:
            desc_label = ET.SubElement(instance, 'label', attrib={'group': 'Description'})
            ET.SubElement(desc_label, 'text').text = description
    
    # Convert to pretty XML string
    xml_str = ET.tostring(root, encoding='unicode')
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent='  ')
    
    # Remove extra blank lines
    lines = [line for line in pretty_xml.split('\n') if line.strip()]
    xml_content = '\n'.join(lines)
    
    print(f"✅ Exported {len(events)} events to XML")
    
    return xml_content

