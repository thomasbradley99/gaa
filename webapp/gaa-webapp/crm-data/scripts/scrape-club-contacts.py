#!/usr/bin/env python3
"""
Scrape contact information (coach/secretary name and email) for GAA clubs
by searching Google for each club
"""

import csv
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote_plus, urlparse
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

try:
    from googlesearch import search
    HAS_GOOGLESEARCH = True
except ImportError:
    HAS_GOOGLESEARCH = False
    print("⚠️  googlesearch-python not installed. Using basic search method.")

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'veo'

INPUT_CSV = DATA_DIR / 'irish_veo_clubs_matched_with_locations.csv'
OUTPUT_CSV = DATA_DIR / 'irish_veo_clubs_contacts.csv'

# Configuration
TEST_MODE = True  # Set to False to process all clubs
TEST_LIMIT = 5  # Number of clubs to process in test mode

# Email pattern
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# Headers to mimic a browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}


def extract_emails(text):
    """Extract email addresses from text"""
    emails = EMAIL_PATTERN.findall(text)
    # Filter out common non-contact emails
    filtered = [e for e in emails if not any(x in e.lower() for x in ['noreply', 'no-reply', 'donotreply', 'example.com', 'test.com'])]
    return list(set(filtered))  # Remove duplicates


def extract_contact_name(text, club_name):
    """Try to extract contact name from text (coach, secretary, etc.)"""
    # Look for patterns like "Secretary: John Doe" or "Coach: Jane Smith"
    patterns = [
        r'(?:secretary|coach|manager|chairman|chairperson|contact)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
        r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:secretary|coach|manager)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Filter out club name if it appears
            if club_name.lower() not in name.lower() and len(name.split()) <= 4:
                return name
    
    return None


def search_google(query, num_results=5):
    """Search Google and return result URLs"""
    links = []
    
    # Try googlesearch-python library first
    if HAS_GOOGLESEARCH:
        try:
            from googlesearch import search as gsearch
            # API: search(term, num_results=10, lang='en', ...)
            urls = list(gsearch(query, num_results=num_results, lang='en', timeout=10))
            for url in urls:
                if url and url.startswith('http') and 'google.com' not in url:
                    links.append(url)
                    if len(links) >= num_results:
                        break
            if links:
                print(f"   📋 Found {len(links)} search results")
                return links
        except Exception as e:
            print(f"   ⚠️  Google search library error: {e}, trying fallback...")
    
    # Fallback: Use DuckDuckGo (more permissive for scraping)
    try:
        ddg_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        response = requests.get(ddg_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract links from DuckDuckGo results
        for result in soup.find_all('a', class_='result__a')[:num_results]:
            href = result.get('href')
            if href and href.startswith('http') and 'duckduckgo.com' not in href:
                links.append(href)
        
        if links:
            print(f"   📋 Found {len(links)} search results (DuckDuckGo)")
            return links
    except Exception as e:
        print(f"   ⚠️  DuckDuckGo search error: {e}")
    
    # Last resort: Try Bing (often more permissive)
    try:
        bing_url = f"https://www.bing.com/search?q={quote_plus(query)}&count={num_results}"
        response = requests.get(bing_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract links from Bing results
        for result in soup.find_all('h2'):
            link = result.find('a')
            if link:
                href = link.get('href')
                if href and href.startswith('http') and 'bing.com' not in href:
                    links.append(href)
                    if len(links) >= num_results:
                        break
        
        if links:
            print(f"   📋 Found {len(links)} search results (Bing)")
            return links
    except Exception as e:
        print(f"   ⚠️  Bing search error: {e}")
    
    print(f"   ⚠️  No search results found")
    return []


def scrape_page_for_contacts(url, club_name):
    """Scrape a webpage for contact information"""
    try:
        # Skip certain domains that are unlikely to have contact info
        domain = urlparse(url).netloc.lower()
        skip_domains = ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 
                       'linkedin.com', 'wikipedia.org', 'gaa.ie']  # gaa.ie might have contacts but often generic
        
        if any(skip in domain for skip in skip_domains):
            return [], None
        
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text()
        
        # Also check HTML for email links
        html_text = str(soup)
        
        # Extract emails from both text and HTML
        emails = extract_emails(text + ' ' + html_text)
        
        # Extract contact name
        contact_name = extract_contact_name(text, club_name)
        
        # If no name found, try looking for email links with names nearby
        if not contact_name:
            email_links = soup.find_all('a', href=re.compile(r'mailto:'))
            for link in email_links:
                # Check parent/sibling elements for names
                parent = link.parent
                if parent:
                    parent_text = parent.get_text()
                    name_match = re.search(r'([A-Z][a-z]+\s+[A-Z][a-z]+)', parent_text)
                    if name_match:
                        contact_name = name_match.group(1)
                        break
        
        return emails, contact_name
    except Exception as e:
        return [], None


def find_club_contacts(club_name):
    """Find contact information for a club"""
    # Build search query
    query = f"{club_name} gaa coach secretary email contact"
    
    # Search Google
    search_results = search_google(query, num_results=5)
    
    if not search_results:
        return None, None
    
    # Try each result page
    all_emails = []
    contact_name = None
    
    for url in search_results[:3]:  # Check first 3 results
        emails, name = scrape_page_for_contacts(url, club_name)
        all_emails.extend(emails)
        if name and not contact_name:
            contact_name = name
        
        # If we found both, we can stop
        if all_emails and contact_name:
            break
        
        # Small delay to avoid rate limiting
        time.sleep(1)
    
    # Return best email (prefer gaa/club domain, or first one)
    best_email = None
    if all_emails:
        # Prefer emails with club name or gaa in domain
        for email in all_emails:
            if 'gaa' in email.lower() or club_name.split()[0].lower() in email.lower():
                best_email = email
                break
        if not best_email:
            best_email = all_emails[0]
    
    return contact_name, best_email


def main():
    """Main execution"""
    print("=" * 60)
    print("🔍 GAA Club Contact Scraper")
    print("=" * 60)
    print()
    
    # Load clubs
    clubs = []
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            club_name = row.get('Club Name', '').strip()
            if club_name:
                clubs.append(club_name)
    
    # Limit to test mode if enabled
    if TEST_MODE:
        clubs = clubs[:TEST_LIMIT]
        print(f"🧪 TEST MODE: Processing first {TEST_LIMIT} clubs")
    
    print(f"✅ Loaded {len(clubs)} clubs from {INPUT_CSV}")
    print(f"📊 Processing clubs...\n")
    
    # Check if output file exists (for resuming)
    existing_results = {}
    if OUTPUT_CSV.exists():
        with open(OUTPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_results[row['Club']] = row
    
    # Process clubs
    results = []
    found_count = 0
    skipped_count = 0
    
    for i, club_name in enumerate(tqdm(clubs, desc="Processing clubs"), 1):
        # Skip if already processed
        if club_name in existing_results:
            results.append(existing_results[club_name])
            if existing_results[club_name]['Contact Name'] or existing_results[club_name]['Contact Email']:
                found_count += 1
            skipped_count += 1
            continue
        
        print(f"\n[{i}/{len(clubs)}] Searching for: {club_name}")
        
        try:
            contact_name, email = find_club_contacts(club_name)
            
            if contact_name or email:
                found_count += 1
                status = "✅ Found"
            else:
                status = "❌ Not found"
            
            print(f"   {status} - Name: {contact_name or 'N/A'}, Email: {email or 'N/A'}")
            
            results.append({
                'Club': club_name,
                'Contact Name': contact_name or '',
                'Contact Email': email or ''
            })
            
            # Save incrementally after each club
            with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['Club', 'Contact Name', 'Contact Email'])
                writer.writeheader()
                writer.writerows(results)
            
        except Exception as e:
            print(f"   ❌ Error processing {club_name}: {e}")
            results.append({
                'Club': club_name,
                'Contact Name': '',
                'Contact Email': ''
            })
        
        # Delay between searches to avoid rate limiting
        time.sleep(3)  # Increased delay to be more respectful
    
    print(f"\n✅ Saved {len(results)} clubs to: {OUTPUT_CSV}")
    if skipped_count > 0:
        print(f"   (Skipped {skipped_count} already processed clubs)")
    processed = len(clubs) - skipped_count
    if processed > 0:
        print(f"📊 Summary: Found contacts for {found_count}/{processed} newly processed clubs ({found_count/processed*100:.1f}%)")
    else:
        print(f"📊 Summary: All clubs already processed")


if __name__ == '__main__':
    main()

