#!/usr/bin/env python3
"""
Add location data to matched clubs by matching with reference list
"""

import csv
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'veo'

MATCHED_CSV = DATA_DIR / 'irish_veo_clubs_matched.csv'
REFERENCE_CSV = DATA_DIR / 'clubs_not_using_veo.csv'
OUTPUT_CSV = DATA_DIR / 'irish_veo_clubs_matched_with_locations.csv'


def normalize_name(name: str) -> str:
    """Normalize club name for matching"""
    if not name:
        return ""
    name = name.lower().strip()
    name = name.replace('gaa', '').replace('club', '').replace('fc', '')
    name = name.replace('.', '').replace("'", '').replace('-', ' ').replace('  ', ' ')
    name = name.replace('/', ' ').replace('&', 'and')
    return name.strip()


def load_reference_clubs():
    """Load reference clubs with location data"""
    clubs = {}
    with open(REFERENCE_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            club_name = row.get('Club Name', '').strip()
            if club_name:
                normalized = normalize_name(club_name)
                clubs[normalized] = {
                    'original_name': club_name,
                    'county': row.get('County', ''),
                    'province': row.get('Province', ''),
                    'country': row.get('Country', ''),
                    'latitude': row.get('Latitude', ''),
                    'longitude': row.get('Longitude', ''),
                }
    return clubs


def match_clubs():
    """Match clubs and add location data"""
    # Load reference clubs
    print("Loading reference clubs with location data...")
    reference_clubs = load_reference_clubs()
    print(f"✅ Loaded {len(reference_clubs)} reference clubs")
    
    # Load matched clubs
    print("\nLoading matched clubs...")
    matched_clubs = []
    with open(MATCHED_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            matched_clubs.append({
                'name': row['Club Name'].strip(),
                'videos': row['Number of Videos'].strip()
            })
    print(f"✅ Loaded {len(matched_clubs)} matched clubs")
    
    # Match and add location data
    print("\nMatching clubs with location data...")
    matched_count = 0
    unmatched_count = 0
    
    results = []
    for club in matched_clubs:
        club_name = club['name']
        normalized = normalize_name(club_name)
        
        # Try exact match first
        if normalized in reference_clubs:
            ref = reference_clubs[normalized]
            results.append({
                'Club Name': club_name,
                'Number of Videos': club['videos'],
                'County': ref['county'],
                'Province': ref['province'],
                'Country': ref['country'],
                'Latitude': ref['latitude'],
                'Longitude': ref['longitude'],
                'Matched': 'Yes'
            })
            matched_count += 1
        else:
            # Try fuzzy matching - check if any part matches
            matched = False
            for ref_normalized, ref_data in reference_clubs.items():
                # Check if normalized names overlap significantly
                if normalized in ref_normalized or ref_normalized in normalized:
                    # Check if they share significant words
                    normalized_words = set(normalized.split())
                    ref_words = set(ref_normalized.split())
                    if len(normalized_words & ref_words) >= 2:  # At least 2 words match
                        results.append({
                            'Club Name': club_name,
                            'Number of Videos': club['videos'],
                            'County': ref_data['county'],
                            'Province': ref_data['province'],
                            'Country': ref_data['country'],
                            'Latitude': ref_data['latitude'],
                            'Longitude': ref_data['longitude'],
                            'Matched': 'Fuzzy'
                        })
                        matched_count += 1
                        matched = True
                        break
            
            if not matched:
                results.append({
                    'Club Name': club_name,
                    'Number of Videos': club['videos'],
                    'County': '',
                    'Province': '',
                    'Country': 'Ireland',  # Assume Ireland since they're GAA clubs
                    'Latitude': '',
                    'Longitude': '',
                    'Matched': 'No'
                })
                unmatched_count += 1
    
    # Save results
    print(f"\n📊 Matching Results:")
    print(f"   Exact/Fuzzy matches: {matched_count}")
    print(f"   Unmatched: {unmatched_count}")
    
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['Club Name', 'Number of Videos', 'County', 'Province', 'Country', 
                     'Latitude', 'Longitude', 'Matched']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ Saved {len(results)} clubs to: {OUTPUT_CSV}")
    
    # Show summary by province
    print("\n📍 Summary by Province:")
    province_counts = {}
    for result in results:
        province = result['Province'] or 'Unknown'
        province_counts[province] = province_counts.get(province, 0) + 1
    
    for province, count in sorted(province_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {province}: {count} clubs")
    
    # Show summary by county (top 10)
    print("\n📍 Top 10 Counties:")
    county_counts = {}
    for result in results:
        county = result['County'] or 'Unknown'
        county_counts[county] = county_counts.get(county, 0) + 1
    
    for county, count in sorted(county_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"   {county}: {count} clubs")


if __name__ == '__main__':
    match_clubs()

