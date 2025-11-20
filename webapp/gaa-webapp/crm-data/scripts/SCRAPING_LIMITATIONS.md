# Web Scraping Limitations

## Current Issue
Google actively blocks automated web scraping. The `googlesearch-python` library and direct HTTP requests to Google search are being blocked, resulting in no search results.

## Alternatives

### Option 1: Use SerpAPI (Recommended)
- Paid service ($50/month for 5,000 searches)
- Reliable, no blocking
- API: https://serpapi.com/
- Python library: `google-search-results`

### Option 2: Use Selenium with Real Browser
- More reliable but slower
- Requires Chrome/Firefox browser
- Can handle JavaScript-rendered content
- More likely to bypass basic bot detection

### Option 3: Manual Collection
- Most reliable but time-consuming
- Use the script structure but manually search and enter contacts

### Option 4: Alternative Data Sources
- GAA official websites
- County board websites
- Social media (Facebook, Twitter)
- Direct club website contact pages

## Current Script Status
The script `scrape-club-contacts.py` is set up correctly but cannot get search results due to Google blocking. The structure is ready for:
- SerpAPI integration
- Selenium implementation
- Manual data entry

