#!/usr/bin/env python3
"""
Scrape contact information (coach/secretary name and email) for GAA clubs
by searching Google for each club
"""

import csv
import re
import sys
import time
import json
from pathlib import Path
from urllib.parse import quote_plus, urlparse
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
from dotenv import load_dotenv
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / 'veo'

# Load environment variables
load_dotenv(SCRIPT_DIR / '.env')

INPUT_CSV = DATA_DIR / 'irish_veo_clubs_matched_with_locations.csv'
OUTPUT_CSV = DATA_DIR / 'irish_veo_clubs_contacts.csv'

# Apify API Configuration
# Use the full token from the URL you provided
APIFY_API_TOKEN = os.getenv('APIFY_API_TOKEN', '')
APIFY_API_URL = "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items"

# Configuration
TEST_MODE = False  # Set to False to process all clubs
TEST_LIMIT = 10  # Number of clubs to process in test mode
RESULTS_PER_PAGE = 10  # Number of search results per query

# Email pattern
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

# Phone number patterns (Irish formats)
# +353, 00353, or 0 followed by area code and number
PHONE_PATTERNS = [
    re.compile(r'\+353\s?[1-9]\d{8,9}'),  # +353 format
    re.compile(r'00353\s?[1-9]\d{8,9}'),  # 00353 format
    re.compile(r'0[1-9]\d{8,9}'),  # Irish landline/mobile (0XX XXX XXXX or 0XX XXXXXXX)
    re.compile(r'\(0[1-9]\d{1,2}\)\s?\d{6,7}'),  # (0XX) XXXXXX format
]

# Headers to mimic a browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}


def extract_emails(text):
    """Extract email addresses from text"""
    emails = EMAIL_PATTERN.findall(text)
    # Filter out common non-contact emails
    filtered = [e for e in emails if not any(x in e.lower() for x in ['noreply', 'no-reply', 'donotreply', 'example.com', 'test.com'])]
    
    # Clean up emails that have "Email" prefix or suffix
    cleaned = []
    for email in filtered:
        # Remove "Email" prefix if present
        if email.lower().startswith('email'):
            email = email[5:]  # Remove "email" (5 chars)
        # Remove "Email" suffix if present
        if email.lower().endswith('email'):
            email = email[:-5]  # Remove "email" (5 chars)
        # Remove any leading/trailing non-email characters
        email = re.sub(r'^[^a-zA-Z0-9]+', '', email)
        email = re.sub(r'[^a-zA-Z0-9@._-]+$', '', email)
        # Validate it's still a valid email
        if '@' in email and '.' in email.split('@')[1] and len(email.split('@')[0]) > 0:
            cleaned.append(email)
    
    return list(set(cleaned))  # Remove duplicates


def extract_phone_numbers(text):
    """Extract phone numbers from text (Irish formats)"""
    phones = []
    
    for pattern in PHONE_PATTERNS:
        matches = pattern.findall(text)
        for match in matches:
            # Clean up the phone number
            phone = re.sub(r'[\s\-\(\)]', '', match)  # Remove spaces, dashes, parentheses
            digits_only = re.sub(r'[^\d]', '', phone)
            
            # Validate it's a reasonable length (9-12 digits)
            if 9 <= len(digits_only) <= 12:
                # Format nicely
                if phone.startswith('+353'):
                    clean_num = phone[4:].replace('+', '').replace(' ', '')
                    if len(clean_num) >= 9:
                        formatted = f"+353 {clean_num}"
                    else:
                        continue
                elif phone.startswith('00353'):
                    clean_num = phone[5:].replace(' ', '')
                    if len(clean_num) >= 9:
                        formatted = f"+353 {clean_num}"
                    else:
                        continue
                elif phone.startswith('0') and len(digits_only) >= 9:
                    # Irish format: keep as is but ensure it starts with 0
                    formatted = '0' + digits_only[1:] if not phone.startswith('0') else phone
                else:
                    continue
                
                # Additional validation - check it's not all same digits
                if len(set(digits_only)) < 3:
                    continue
                
                if formatted not in phones:
                    phones.append(formatted)
    
    # Filter out common fake/test numbers and invalid patterns
    filtered = []
    for p in phones:
        digits = re.sub(r'[^\d]', '', p)
        # Skip if all same digits, or common test patterns
        if (len(set(digits)) < 3 or 
            any(x in p for x in ['000000', '123456', '999999', '111111', '222222']) or
            digits.count('0') > len(digits) * 0.7):  # Skip if more than 70% zeros
            continue
        filtered.append(p)
    
    return filtered[:3]  # Return max 3 phone numbers


def extract_contact_name(soup, text, club_name, emails=None):
    """Try to extract contact name from HTML and text using multiple strategies
    Prioritizes names extracted from email addresses as they're most reliable"""
    names_found = []
    
    # Common Irish first names and titles to look for
    irish_names = ['sean', 'seán', 'ciaran', 'ciarán', 'padraig', 'pádraig', 'eamon', 'eamonn', 
                 'mairead', 'máire', 'sinead', 'sinéad', 'aoife', 'niamh', 'siobhan', 'siobhán',
                 'tomas', 'tomás', 'conor', 'connor', 'david', 'john', 'michael', 'patrick',
                 'thomas', 'james', 'william', 'richard', 'paul', 'mark', 'stephen', 'brian',
                 'mary', 'catherine', 'anne', 'sarah', 'emma', 'lisa', 'jennifer', 'karen',
                 'colm', 'ian', 'gemma', 'vikki', 'kieran', 'chris', 'tom', 'jenny']
    
    # Words that are NOT names - expanded list of titles, roles, and UI elements
    skip_words = ['contact', 'us', 'home', 'page', 'email', 'phone', 'address', 'club', 'gaa',
                 'secretary', 'coach', 'manager', 'click', 'here', 'menu', 'toggle', 'form',
                 'training', 'times', 'welfare', 'officer', 'programmes', 'monitoring', 'education',
                 'session', 'planner', 'events', 'register', 'counselling', 'service', 'links',
                 'policies', 'committee', 'board', 'member', 'members', 'team', 'players',
                 'more', 'next', 'match', 'view', 'read', 'see', 'all', 'about', 'news',
                 'fixtures', 'results', 'gallery', 'shop', 'login', 'search', 'follow',
                 'social', 'media', 'facebook', 'twitter', 'instagram', 'youtube', 'linkedin',
                 'enquire', 'now', 'round', 'towers', 'telephone', 'tel', 'mobile', 'call',
                 'local', 'meath', 'intermediate', 'camogie', 'button', 'submit',
                 'send', 'message', 'enquiry', 'enquiries', 'chairman', 'chairperson',
                 'treasurer', 'registrar', 'president', 'childrens', 'communications',
                 'fundraising', 'grants', 'info', 'admin', 'webmaster', 'sponsor', 'main',
                 'donate', 'play', 'sports', 'partnership', 'account', 'domhnach', 'seachnaill',
                 'dunshaughlin', 'robert', 'emmets', 'naomholaf', 'eastern', 'harps', 'derrygonnelly',
                 'first', 'name', 'last', 'donate', 'play', 'draw', 'lotto', 'basket', 'checkout',
                 'town', 'hall', 'ongress', 'meeting', 'agenda', 'inead', 'canon', 'maguire',
                 'app', 'instructions', 'watergate', 'street', 'our', 'teams', 'ieran']
    
    # Strategy 1 (PRIORITY): Extract from email addresses - most reliable source
    if emails:
        email_names = []
        for email in emails:
            local_part = email.split('@')[0].lower().strip()
            
            # Skip generic/role-based emails
            generic_emails = ['info', 'contact', 'admin', 'webmaster', 'secretary', 'chairperson', 
                            'treasurer', 'registrar', 'president', 'childrensofficer', 'communications',
                            'grants', 'fundraising', 'secretarybng', 'member', 'mlsp', 'membership',
                            'design', 'academy', 'pitchallocator', 'pro']
            if local_part in generic_emails:
                continue
            
            # Remove common role/club prefixes (e.g., "secretary.clubname" or "membership.clubname")
            # Also remove club name patterns that might be in the email
            local_part_clean = re.sub(r'^(secretary|chairperson|treasurer|registrar|president|childrensofficer|communications|grants|fundraising|pro|secretarybng|membership|design|academy|pitchallocator)\.', '', local_part, flags=re.IGNORECASE)
            
            # Remove common club name suffixes that might appear in emails (e.g., "name.clubname" -> "name")
            # Look for patterns like "name.clubname" where clubname is long
            local_part_clean = re.sub(r'\.(robertemmets|naomholaf|dunshaughlin|easternharps|derrygonnelly)[^@]*$', '', local_part_clean, flags=re.IGNORECASE)
            
            # Skip if after cleaning it's too short or still looks like a role
            if len(local_part_clean) < 3 or local_part_clean in generic_emails:
                continue
            
            # Pattern 1: firstname.lastname (e.g., "tom.parsons", "brian.howard", "niall.o.regan")
            # Handle cases with middle initials like "niall.o.regan" -> "Niall O Regan" or "Niall Regan"
            name_match = re.search(r'^([a-z]{2,})(?:\.([a-z]{1,2}))?\.([a-z]{2,})(?:\.[a-z]+)*$', local_part_clean)
            if name_match:
                first = name_match.group(1).capitalize()
                middle = name_match.group(2) if name_match.group(2) else None
                last = name_match.group(3).capitalize()
                
                # Skip if last name looks like a club name or domain
                if last.lower() in ['com', 'org', 'ie', 'gaa', 'email', 'club', 'meath', 'dublin', 'sligo', 'fermanagh', 
                                   'robertemmets', 'naomholaf', 'dunshaughlin', 'easternharps', 'derrygonnelly']:
                    continue
                
                # Validate it looks like a real name
                if (first.lower() in irish_names or len(first) >= 3) and \
                   last.lower() not in skip_words and len(last) >= 2:
                    # Include middle initial if present
                    if middle and len(middle) == 1:
                        name = f"{first} {middle.upper()}. {last}"
                    else:
                        name = f"{first} {last}"
                    validated = validate_name(name, skip_words, irish_names, club_name)
                    if validated and validated not in email_names:
                        email_names.append(validated)
            
            # Pattern 1b: Simple firstname.lastname without middle
            elif re.search(r'^([a-z]{2,})\.([a-z]{2,})$', local_part_clean):
                name_match = re.search(r'^([a-z]{2,})\.([a-z]{2,})$', local_part_clean)
                if name_match:
                    first = name_match.group(1).capitalize()
                    last = name_match.group(2).capitalize()
                    
                    if last.lower() not in ['com', 'org', 'ie', 'gaa', 'email', 'club', 'meath', 'dublin', 'sligo', 'fermanagh',
                                          'robertemmets', 'naomholaf', 'dunshaughlin', 'easternharps', 'derrygonnelly']:
                        if (first.lower() in irish_names or len(first) >= 3) and \
                           last.lower() not in skip_words and len(last) >= 2:
                            name = f"{first} {last}"
                            validated = validate_name(name, skip_words, irish_names, club_name)
                            if validated and validated not in email_names:
                                email_names.append(validated)
            
            # Pattern 2: firstnamelastname (no dot, e.g., "tomparsons", "mleddy", "pauljnolan")
            # Remove trailing numbers first
            local_part_no_numbers = re.sub(r'\d+$', '', local_part_clean)
            # Also handle cases like "pauljnolan" where we need to split at capital letter boundaries
            # Try inserting a space before capital letters (e.g., "paulNolan" -> "paul Nolan")
            if re.match(r'^[a-z]+[A-Z][a-z]+$', local_part_no_numbers):
                # Split at capital letter
                parts = re.split(r'([A-Z][a-z]+)', local_part_no_numbers)
                if len(parts) >= 2:
                    first_part = parts[0]
                    last_part = ''.join(parts[1:])
                    if len(first_part) >= 2 and len(last_part) >= 2:
                        first = first_part.capitalize()
                        last = last_part.capitalize()
                        if last.lower() not in skip_words:
                            name = f"{first} {last}"
                            validated = validate_name(name, skip_words, irish_names, club_name)
                            if validated and validated not in email_names:
                                email_names.append(validated)
            
            elif re.match(r'^[a-z]{5,}$', local_part_no_numbers) and len(local_part_no_numbers) >= 5:
                # Try to split into first/last using known Irish names
                for irish_name in sorted(irish_names, key=len, reverse=True):
                    if local_part_no_numbers.startswith(irish_name) and len(local_part_no_numbers) > len(irish_name) + 2:
                        first = irish_name.capitalize()
                        last = local_part_no_numbers[len(irish_name):].capitalize()
                        if len(last) >= 2 and last.lower() not in skip_words and last.lower() not in ['com', 'org', 'ie', 'gaa']:
                            name = f"{first} {last}"
                            validated = validate_name(name, skip_words, irish_names, club_name)
                            if validated and validated not in email_names:
                                email_names.append(validated)
                                break
                
                # Also try common patterns like "mleddy" -> "M" + "Leddy" (first initial + last name)
                # Or try splitting at common boundaries
                if not email_names and len(local_part_no_numbers) >= 6:
                    # Try pattern like "mleddy" where first letter is initial
                    if local_part_no_numbers[0] in 'abcdefghijklmnopqrstuvwxyz' and len(local_part_no_numbers[1:]) >= 4:
                        # Check if the rest looks like a last name
                        potential_last = local_part_no_numbers[1:].capitalize()
                        if potential_last.lower() not in skip_words and len(potential_last) >= 4:
                            # Try to find a first name that starts with this letter
                            for irish_name in irish_names:
                                if irish_name[0] == local_part_no_numbers[0] and len(irish_name) >= 3:
                                    name = f"{irish_name.capitalize()} {potential_last}"
                                    validated = validate_name(name, skip_words, irish_names, club_name)
                                    if validated and validated not in email_names:
                                        email_names.append(validated)
                                        break
                            if email_names:
                                break
        
        # Add email-extracted names first (highest priority)
        names_found.extend(email_names)
    
    # Strategy 2: Look for names in proximity to email addresses in HTML (only if no email names found)
    if not names_found and emails and soup:
        for email in emails[:3]:  # Check first 3 emails
            email_links = soup.find_all('a', href=re.compile(r'mailto:' + re.escape(email)))
            email_texts = soup.find_all(string=re.compile(re.escape(email)))
            
            for link in email_links:
                parent = link.parent
                if parent:
                    parent_text = parent.get_text(separator=' ', strip=True)
                    name = extract_name_from_text(parent_text, skip_words, irish_names)
                    if name and name not in names_found:
                        names_found.append(name)
                    
                    if parent.parent:
                        for sibling in parent.parent.find_all(['div', 'p', 'span', 'td', 'li', 'dt', 'dd'], limit=10):
                            sibling_text = sibling.get_text(separator=' ', strip=True)
                            if email in sibling_text or link in sibling:
                                name = extract_name_from_text(sibling_text, skip_words, irish_names)
                                if name and name not in names_found:
                                    names_found.append(name)
            
            for text_node in email_texts:
                if hasattr(text_node, 'parent'):
                    parent = text_node.parent
                    if parent:
                        context_text = parent.get_text(separator=' ', strip=True)
                        name = extract_name_from_text(context_text, skip_words, irish_names)
                        if name and name not in names_found:
                            names_found.append(name)
    
    # Strategy 3: Look for names in contact sections (only if no email names)
    if not names_found and soup:
        contact_selectors = [
            'div.contact', 'div.contact-info', 'div.contact-details',
            'section.contact', 'div.officers', 'div.committee',
            'table.contact', 'table.officers', 'dl.contact',
            '[class*="contact"]', '[class*="officer"]', '[id*="contact"]'
        ]
        
        for selector in contact_selectors:
            try:
                elements = soup.select(selector, limit=10)
                for elem in elements:
                    elem_text = elem.get_text(separator=' ', strip=True)
                    name = extract_name_from_text(elem_text, skip_words, irish_names)
                    if name and name not in names_found:
                        names_found.append(name)
            except:
                continue
    
    # Strategy 4: Look for patterns like "Secretary: John Doe" (only if no email names)
    if not names_found:
        patterns = [
            r'(?:secretary|coach|manager|chairman|chairperson|treasurer|registrar|president|children\'?s\s+officer)[\s:\-–—]+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,2})',
            r'([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\s*[–\-\(\)]+\s*(?:secretary|coach|manager|chairman|chairperson|treasurer)',
            r'(?:name|contact|person)[\s:]+([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})',
            r'<t[dh][^>]*>\s*([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\s*</t[dh]>',
            r'<d[tl][^>]*>\s*([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\s*</d[tl]>',
        ]
        
        search_texts = [text]
        if soup:
            search_texts.append(str(soup))
        
        for search_text in search_texts:
            for pattern in patterns:
                matches = re.finditer(pattern, search_text, re.IGNORECASE)
                for match in matches:
                    name = match.group(1).strip()
                    name = validate_name(name, skip_words, irish_names, club_name)
                    if name and name not in names_found:
                        names_found.append(name)
    
    # Return the first valid name found, prioritizing email-extracted names
    return names_found[0] if names_found else None


def extract_name_from_text(text, skip_words, irish_names):
    """Extract a name from text using various patterns"""
    # Look for "First Last" pattern (2-3 words, each capitalized)
    # Be more careful about word boundaries to avoid concatenated text
    patterns = [
        r'\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b',  # Two words, each 3+ chars
        r'\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b',  # Three words
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            name = match.group(1).strip()
            # Clean up any trailing concatenated words
            # Remove common suffixes that might be concatenated
            name = re.sub(r'(telephone|tel|email|phone|mobile|button|link|click)$', '', name, flags=re.IGNORECASE)
            name = name.strip()
            
            name = validate_name(name, skip_words, irish_names, '')
            if name:
                return name
    
    return None


def validate_name(name, skip_words, irish_names, club_name):
    """Validate that a potential name is actually a person's name"""
    if not name:
        return None
    
    name_lower = name.lower()
    words = [w for w in name.split() if w]  # Remove empty strings
    
    # Must be 2-4 words
    if len(words) < 2 or len(words) > 4:
        return None
    
    # Check each word starts with capital (proper name)
    if not all(word and word[0].isupper() for word in words):
        return None
    
    # Skip if contains common non-name words
    if any(word.lower() in skip_words for word in words):
        return None
    
    # Skip if it's the club name or contains club name words
    if club_name:
        club_words = [w.lower() for w in club_name.split() if len(w) > 3]
        name_words = [w.lower() for w in words]
        # If 2+ words from club name appear in the name, it's likely the club name
        if sum(1 for cw in club_words if cw in name_words) >= 2:
            return None
        # Also check if the full club name is in the name
        if club_name.lower() in name_lower or name_lower in club_name.lower():
            return None
    
    # Skip if all words are the same (e.g., "More More", "Next Next")
    if len(set(word.lower() for word in words)) == 1:
        return None
    
    # Skip single letter words (except valid prefixes like "O", "Mc", "Mac")
    valid_prefixes = ["O", "Mc", "Mac", "De", "Van", "Le"]
    if any(len(word) == 1 and word not in valid_prefixes for word in words):
        return None
    
    # Skip if words are too short (less than 2 chars) unless it's a valid prefix
    if any(len(word) < 2 and word not in valid_prefixes for word in words):
        return None
    
    # Skip if it looks like a UI element (contains numbers/special chars except apostrophes and hyphens)
    if any(not word.replace("'", "").replace("-", "").replace(".", "").isalpha() for word in words):
        return None
    
    # Skip if any word ends with common UI suffixes that got concatenated
    ui_suffixes = ['telephone', 'tel', 'email', 'phone', 'mobile', 'button', 'link', 'click']
    if any(word.lower().endswith(tuple(ui_suffixes)) for word in words):
        return None
    
    # Skip if name contains common button/UI text or titles
    ui_phrases = ['enquire now', 'click here', 'read more', 'view all', 'see more', 'next match',
                 'counselling service', 'events register', 'session planner', 'round towers',
                 'search login', 'meath local', 'intermediate camogie', 'donate play', 'first name',
                 'last name', 'main sponsor', 'sports partnership', 'account dunshaughlin', 'draw lotto',
                 'basket checkout', 'town hall', 'meeting agenda', 'app instructions', 'watergate street',
                 'our teams']
    if name_lower in ui_phrases:
        return None
    
    # Skip if it's clearly a title/role (contains common role words)
    role_words = ['service', 'register', 'planner', 'towers', 'local', 'camogie', 'login', 'search',
                 'membership', 'emmet', 'emmets', 'naomholaf', 'robert', 'dunshaughlin', 'eastern',
                 'derrygonnelly', 'harps', 'royal', 'gaels', 'domhnach', 'seachnaill', 'donate',
                 'play', 'sponsor', 'partnership', 'account', 'first', 'name', 'last', 'draw', 'lotto',
                 'basket', 'checkout', 'town', 'hall', 'ongress', 'jnolan', 'meeting', 'agenda',
                 'inead', 'canon', 'app', 'instructions', 'watergate', 'street', 'our', 'teams', 'ieran']
    if any(role in name_lower for role in role_words):
        return None
    
    # Skip if it looks like a club name pattern or placeholder
    club_name_patterns = ['robert emmets', 'membership', 'events register', 'session planner',
                         'domhnach seachnaill', 'donate play', 'first name', 'last name',
                         'main sponsor', 'sports partnership']
    if name_lower in club_name_patterns:
        return None
    
    # Skip if it's just "First Name" or "Last Name" (placeholders)
    if name_lower in ['first name', 'last name', 'name']:
        return None
    
    # Prefer names that contain common Irish first names
    first_word = words[0].lower()
    last_word = words[-1].lower() if len(words) > 1 else ''
    
    # Strong signal: first name is in Irish names list
    if first_word in irish_names:
        return ' '.join(words)
    
    # Good signal: first word is 3+ chars and looks like a name
    if len(first_word) >= 3 and first_word.isalpha():
        # Last name should also be reasonable
        if len(words) >= 2 and len(last_word) >= 2:
            return ' '.join(words)
    
    # Weak signal: just proper capitalization and reasonable length
    # Only accept if both words are 3+ chars
    if len(words) == 2 and all(len(w) >= 3 for w in words):
        return ' '.join(words)
    
    return None


def search_google_apify(query, num_results=5):
    """Search Google using Apify API and return result URLs"""
    links = []
    
    if not APIFY_API_TOKEN:
        print(f"   ⚠️  APIFY_API_TOKEN not set in environment")
        return []
    
    try:
        # Prepare Apify API request - token in URL as per your example
        url = f"{APIFY_API_URL}?token={APIFY_API_TOKEN}"
        
        # Payload format - queries must be a string, not array
        payload = {
            "queries": query,  # String, not array
            "resultsPerPage": RESULTS_PER_PAGE,
            "maxPagesPerQuery": 1,
            "countryCode": "ie"  # Ireland for GAA clubs
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Make API request
        print(f"   🔍 Calling Apify API for: {query[:50]}...")
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        # Parse response
        data = response.json()
        
        # Apify returns a list where each item is a search result page
        # Each page contains organicResults with the actual URLs
        if isinstance(data, list) and len(data) > 0:
            # Get the first (and likely only) search result page
            page = data[0] if isinstance(data[0], dict) else {}
            
            # Look for organic results - the actual search result URLs
            organic_results = (page.get('organicResults') or page.get('organic') or 
                              page.get('results') or page.get('items') or [])
            
            # If no organic results, check if the page itself has URL fields
            if not organic_results and isinstance(page, dict):
                # Try to find any nested results
                for key in ['organicResults', 'organic', 'results', 'items', 'organicResultsList']:
                    if key in page and isinstance(page[key], list):
                        organic_results = page[key]
                        break
            
            # Extract URLs from organic results
            for result in organic_results[:num_results]:
                if isinstance(result, dict):
                    # Common field names for the result URL
                    url = (result.get('url') or result.get('link') or result.get('href') or 
                          result.get('resultUrl') or result.get('website') or result.get('organicUrl') or
                          result.get('titleUrl') or result.get('displayUrl'))
                    
                    # Filter out Google search pages and other unwanted URLs
                    if url and url.startswith('http'):
                        url_lower = url.lower()
                        # Skip Google search pages, Google domains, and other search engines
                        if not any(skip in url_lower for skip in ['google.com/search', 'google.ie/search', 
                                                                  'bing.com', 'duckduckgo.com']):
                            links.append(url)
        
        # Debug: if no links found, show what we got
        if not links and isinstance(data, list) and len(data) > 0:
            page = data[0] if isinstance(data[0], dict) else {}
            print(f"   Debug - Page keys: {list(page.keys())[:15]}")
            if 'organicResults' in page:
                print(f"   organicResults count: {len(page.get('organicResults', []))}")
            if 'resultsTotal' in page:
                print(f"   resultsTotal: {page.get('resultsTotal')}")
        
        if links:
            print(f"   📋 Found {len(links)} search results (Apify)")
            # Show first URL for debugging
            if links:
                print(f"   First URL: {links[0][:80]}...")
            return links
        else:
            print(f"   ⚠️  No URLs found in Apify response")
            # Debug: show response structure
            if isinstance(results, dict):
                print(f"   Response keys: {list(results.keys())[:10]}")
            elif isinstance(results, list) and len(results) > 0:
                print(f"   Results count: {len(results)}, First result type: {type(results[0])}")
                if isinstance(results[0], dict):
                    print(f"   First result keys: {list(results[0].keys())[:10]}")
                    # Show first result for debugging
                    print(f"   First result sample: {str(results[0])[:200]}...")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️  Apify API error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Response: {e.response.text[:300]}...")
        return []
    except json.JSONDecodeError as e:
        print(f"   ⚠️  Failed to parse Apify response: {e}")
        print(f"   Response: {response.text[:500]}...")
        return []
    except Exception as e:
        print(f"   ⚠️  Unexpected error: {e}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()[:200]}...")
        return []


def scrape_page_for_contacts(url, club_name):
    """Scrape a webpage for contact information"""
    try:
        # Skip certain domains that are unlikely to have contact info
        domain = urlparse(url).netloc.lower()
        skip_domains = ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 
                       'linkedin.com', 'wikipedia.org', 'gaa.ie']  # gaa.ie might have contacts but often generic
        
        if any(skip in domain for skip in skip_domains):
            return [], None, []
        
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text()
        
        # Also check HTML for email links and phone numbers
        html_text = str(soup)
        full_text = text + ' ' + html_text
        
        # Extract emails from both text and HTML
        emails = extract_emails(full_text)
        
        # Extract phone numbers
        phone_numbers = extract_phone_numbers(full_text)
        
        # Extract contact name using improved method
        contact_name = extract_contact_name(soup, text, club_name, emails)
        
        return emails, contact_name, phone_numbers
    except Exception as e:
        return [], None, []


def find_club_contacts(club_name):
    """Find contact information for a club - returns list of contacts"""
    # Build search query
    query = f"{club_name} gaa coach secretary email contact phone"
    
    # Search Google using Apify
    search_results = search_google_apify(query, num_results=5)
    
    if not search_results:
        return []
    
    # Collect all contacts from all pages
    all_contacts = []  # List of {name, email, phone} dicts
    seen_emails = set()  # Track to avoid duplicates
    seen_phones = set()
    all_names = []  # Collect all names found
    
    for i, url in enumerate(search_results[:3], 1):  # Check first 3 results
        print(f"   Scraping URL {i}/{min(3, len(search_results))}: {url[:60]}...")
        emails, name, phones = scrape_page_for_contacts(url, club_name)
        
        if emails:
            print(f"   Found {len(emails)} emails: {emails}")
        if phones:
            print(f"   Found {len(phones)} phone numbers: {phones}")
        if name:
            print(f"   Found contact name: {name}")
            if name not in all_names:
                all_names.append(name)
        
        # Create contact entries - try to pair names with specific emails/phones
        # Strategy: Create one contact per unique email/phone combination
        
        # First, if we have a name, create contacts with that name
        if name:
            # Pair name with each email (one contact per email)
            for email in emails:
                if email not in seen_emails:
                    # Try to find an unpaired phone for this email
                    phone = ''
                    for p in phones:
                        if p not in seen_phones:
                            phone = p
                            seen_phones.add(p)
                            break
                    
                    all_contacts.append({
                        'name': name,
                        'email': email,
                        'phone': phone
                    })
                    seen_emails.add(email)
            
            # Add remaining phones with this name
            for phone in phones:
                if phone not in seen_phones:
                    all_contacts.append({
                        'name': name,
                        'email': '',
                        'phone': phone
                    })
                    seen_phones.add(phone)
        else:
            # No name found, just add emails and phones separately
            for email in emails:
                if email not in seen_emails:
                    phone = phones[0] if phones and phones[0] not in seen_phones else ''
                    all_contacts.append({
                        'name': '',
                        'email': email,
                        'phone': phone
                    })
                    seen_emails.add(email)
                    if phone:
                        seen_phones.add(phone)
            
            # Add remaining phones
            for phone in phones:
                if phone not in seen_phones:
                    all_contacts.append({
                        'name': '',
                        'email': '',
                        'phone': phone
                    })
                    seen_phones.add(phone)
        
        # Small delay to avoid rate limiting
        time.sleep(2)
    
    # Remove duplicates and empty contacts
    unique_contacts = []
    seen_combos = set()
    
    for contact in all_contacts:
        # Create a key for this contact
        email = contact.get('email', '') if isinstance(contact, dict) else ''
        phone = contact.get('phone', '') if isinstance(contact, dict) else ''
        key = (email, phone)
        
        if key not in seen_combos and (email or phone):
            unique_contacts.append(contact)
            seen_combos.add(key)
    
    # Sort: prefer contacts with both email and phone, then by name
    unique_contacts.sort(key=lambda x: (
        not (x.get('email', '') and x.get('phone', '')),  # Has both email and phone first
        not x.get('name', ''),  # Has name first
    ))
    
    return unique_contacts


def main():
    """Main execution"""
    print("=" * 60)
    print("🔍 GAA Club Contact Scraper (Apify)")
    print("=" * 60)
    print()
    
    # Check API token
    if not APIFY_API_TOKEN or APIFY_API_TOKEN == 'apify_api_FlnTefPUjZmcPc3rABfOpjH1TxypIQ3X':
        print("⚠️  Warning: Using default/example Apify API token.")
        print("   Please set APIFY_API_TOKEN in .env file with your actual token.")
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
    existing_results = {}  # Dict of club_name -> list of rows
    processed_clubs = set()
    if OUTPUT_CSV.exists():
        with open(OUTPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                club_name = row.get('Club', '')
                # Handle old format without phone column
                if 'Contact Phone' not in row:
                    row['Contact Phone'] = ''
                
                if club_name:
                    if club_name not in existing_results:
                        existing_results[club_name] = []
                    existing_results[club_name].append(row)
                    processed_clubs.add(club_name)
    
    # Process clubs
    results = []
    found_count = 0
    skipped_count = 0
    
    for i, club_name in enumerate(tqdm(clubs, desc="Processing clubs"), 1):
        # Skip if already processed
        if club_name in processed_clubs:
            club_rows = existing_results.get(club_name, [])
            if club_rows:
                results.extend(club_rows)
                # Check if any have contact info
                if any(row.get('Contact Name') or row.get('Contact Email') or row.get('Contact Phone') for row in club_rows):
                    found_count += 1
                skipped_count += len(club_rows)
            continue
        
        print(f"\n[{i}/{len(clubs)}] Searching for: {club_name}")
        
        try:
            contacts = find_club_contacts(club_name)
            
            # Ensure contacts is a list
            if not isinstance(contacts, list):
                contacts = []
            
            if contacts and len(contacts) > 0:
                found_count += 1
                status = f"✅ Found {len(contacts)} contact(s)"
                print(f"   {status}")
                for j, contact in enumerate(contacts, 1):
                    # Ensure contact is a dict
                    if isinstance(contact, dict):
                        name = contact.get('name', '') or ''
                        email = contact.get('email', '') or ''
                        phone = contact.get('phone', '') or ''
                        print(f"      Contact {j}: {name or 'N/A'} | {email or 'N/A'} | {phone or 'N/A'}")
            else:
                status = "❌ Not found"
                print(f"   {status}")
            
            # Add each contact as a separate row
            if contacts and len(contacts) > 0:
                for contact in contacts:
                    # Ensure contact is a dict
                    if isinstance(contact, dict):
                        results.append({
                            'Club': club_name,
                            'Contact Name': contact.get('name', '') or '',
                            'Contact Email': contact.get('email', '') or '',
                            'Contact Phone': contact.get('phone', '') or ''
                        })
            else:
                # Add one row with empty contacts
                results.append({
                    'Club': club_name,
                    'Contact Name': '',
                    'Contact Email': '',
                    'Contact Phone': ''
                })
            
            # Save incrementally after each club
            with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['Club', 'Contact Name', 'Contact Email', 'Contact Phone'])
                writer.writeheader()
                writer.writerows(results)
            
        except Exception as e:
            print(f"   ❌ Error processing {club_name}: {e}")
            results.append({
                'Club': club_name,
                'Contact Name': '',
                'Contact Email': '',
                'Contact Phone': ''
            })
        
        # Delay between searches to avoid rate limiting
        time.sleep(3)  # Increased delay to be more respectful
    
    # Count unique clubs and total contacts
    unique_clubs = len(set(r['Club'] for r in results))
    total_contacts = len([r for r in results if r.get('Contact Email') or r.get('Contact Phone')])
    
    print(f"\n✅ Saved {len(results)} contact rows ({unique_clubs} unique clubs) to: {OUTPUT_CSV}")
    if skipped_count > 0:
        print(f"   (Skipped {skipped_count} already processed contact rows)")
    processed = len(clubs) - len(processed_clubs)
    if processed > 0:
        print(f"📊 Summary: Found contacts for {found_count}/{processed} newly processed clubs ({found_count/processed*100:.1f}%)")
        print(f"📊 Total contacts found: {total_contacts}")
    else:
        print(f"📊 Summary: All clubs already processed")
        print(f"📊 Total contacts in file: {total_contacts}")


if __name__ == '__main__':
    main()

