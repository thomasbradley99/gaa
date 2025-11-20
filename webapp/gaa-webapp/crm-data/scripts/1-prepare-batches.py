#!/usr/bin/env python3
"""
Split 27k VEO clubs into batches of 1,000 for Gemini

Input:  ../raw/veo_clubs_27k.csv
Output: ../output/batches/batch_01.csv, batch_02.csv, etc.
"""

import csv
import os
from pathlib import Path

RAW_DATA = Path(__file__).parent.parent / 'raw' / 'veo_clubs_27k.csv'
OUTPUT_DIR = Path(__file__).parent.parent / 'output' / 'batches'
BATCH_SIZE = 1000


def main():
    # 1. Load 27k VEO clubs
    # 2. Filter to Ireland/NI only
    # 3. Split into batches of 1,000
    # 4. Save each batch as CSV
    
    print("TODO: Implement batch preparation")
    pass


if __name__ == '__main__':
    main()
