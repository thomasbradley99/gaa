#!/usr/bin/env python3
"""Test Apify API response structure"""
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('APIFY_API_TOKEN', '')

url = f"https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token={token}"
payload = {
    "queries": "davitts gaa club",
    "resultsPerPage": 3,
    "maxPagesPerQuery": 1
}

print("Testing Apify API with 'davitts gaa club'...")
r = requests.post(url, json=payload, timeout=60)
print(f"Status: {r.status_code}")

if r.status_code in [200, 201]:
    data = r.json()
    print(f"\nResponse type: {type(data)}")
    if isinstance(data, list) and len(data) > 0:
        page = data[0]
        print(f"Page keys: {list(page.keys())}")
        
        # Check for organic results
        for key in ['organicResults', 'organic', 'results', 'items']:
            if key in page:
                results = page[key]
                print(f"\nFound '{key}': {len(results) if isinstance(results, list) else type(results)} items")
                if isinstance(results, list) and len(results) > 0:
                    print(f"First result keys: {list(results[0].keys())}")
                    print(f"First result URL: {results[0].get('url', results[0].get('link', 'N/A'))}")
                    break
else:
    print(f"Error: {r.text[:500]}")

