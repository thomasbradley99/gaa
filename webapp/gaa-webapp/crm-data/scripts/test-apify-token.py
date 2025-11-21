#!/usr/bin/env python3
"""Test Apify API token"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv('APIFY_API_TOKEN', '')

print(f"Token loaded: {len(token)} chars")
print(f"Token ends with: ...{token[-10:] if len(token) > 10 else token}")
print()

# Test with token in URL
url = f"https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token={token}"
payload = {
    "queries": "test gaa club",
    "resultsPerPage": 2,
    "maxPagesPerQuery": 1
}

print("Testing Apify API...")
try:
    r = requests.post(url, json=payload, timeout=60)
    print(f"Status: {r.status_code}")
    
    if r.status_code in [200, 201]:
        print("✅ Token is valid!")
        try:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"Response is a list with {len(data)} items")
                if isinstance(data[0], dict):
                    print(f"First item keys: {list(data[0].keys())[:10]}")
                    # Check for organic results
                    if 'organicResults' in data[0] or 'organic' in data[0]:
                        print("✅ Found organic search results!")
            else:
                print(f"Response: {str(data)[:200]}")
        except:
            print(f"Response text: {r.text[:300]}")
    elif r.status_code == 401:
        print(f"❌ 401 Unauthorized - Token is invalid")
        print(f"Response: {r.text[:300]}")
    else:
        print(f"Status {r.status_code}: {r.text[:300]}")
except Exception as e:
    print(f"❌ Exception: {e}")

