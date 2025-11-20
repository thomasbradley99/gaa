#!/usr/bin/env python3
"""
Scrape contact details for matched GAA clubs

Input:  ../output/matched_gaa_veo_clubs.csv
Output: ../output/gaa_clubs_with_contacts.csv
"""

from pathlib import Path

INPUT_FILE = Path(__file__).parent.parent / 'output' / 'matched_gaa_veo_clubs.csv'
OUTPUT_FILE = Path(__file__).parent.parent / 'output' / 'gaa_clubs_with_contacts.csv'


def main():
    # 1. Read matched clubs CSV
    # 2. For each club:
    #    - Google search: "[Club Name] GAA contact"
    #    - Extract: website, email, phone
    #    - Use DuckDuckGo or existing scraper from CLANNAI/crm
    # 3. Save results: Club, County, VEO_Recordings, Email, Phone, Website
    
    print("TODO: Implement contact scraping")
    print("Reuse: CLANNAI/crm/veo/crm-clean/src/3-contact-finder.py")
    pass


if __name__ == '__main__':
    main()

