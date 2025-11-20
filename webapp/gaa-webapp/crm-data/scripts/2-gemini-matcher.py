#!/usr/bin/env python3
"""
Use Gemini to match VEO clubs with GAA clubs

Input:  ../output/batches/batch_*.csv + ../frontend/.../gaapitchfinder_data.json
Output: ../output/logs/batch_01.json, batch_02.json, etc.
"""

import os
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / 'output'
GAA_DATA = Path(__file__).parent.parent.parent / 'frontend' / 'src' / 'components' / 'pitch-finder' / 'gaapitchfinder_data.json'


def main():
    # 1. Load GAA clubs (1,680)
    # 2. Load Gemini API key from .env
    # 3. For each batch CSV:
    #    - Read 1,000 VEO clubs
    #    - Send to Gemini with GAA list
    #    - Get matches (confidence >= 70%)
    #    - Save to logs/batch_XX.json
    
    print("TODO: Implement Gemini matching")
    pass


if __name__ == '__main__':
    main()

