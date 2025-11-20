#!/usr/bin/env python3
"""
Combine all Gemini batch results into single CSV

Input:  ../output/logs/batch_*.json
Output: ../output/matched_gaa_veo_clubs.csv
"""

from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent / 'output' / 'logs'
OUTPUT_FILE = Path(__file__).parent.parent / 'output' / 'matched_gaa_veo_clubs.csv'


def main():
    # 1. Read all batch_*.json files
    # 2. Extract matches from each
    # 3. Combine into single list
    # 4. Save as CSV: GAA_Club, County, VEO_Club, VEO_Recordings, Confidence
    
    print("TODO: Implement result combining")
    pass


if __name__ == '__main__':
    main()

