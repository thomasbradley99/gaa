# Anadi's GAA CRM TODO

## Goal
Get 100 GAA clubs with VEO into sales pipeline and send emails.

---

## Step 1: Match VEO Clubs with GAA Clubs (Gemini)

**Input:**
- `raw/veo_clubs_27k.csv` (27k clubs, copy from CLANNAI/crm)
- `frontend/src/components/pitch-finder/gaapitchfinder_data.json` (1,680 GAA clubs)

**Process:**
- Filter 27k to Ireland/NI only (~2-3k clubs)
- Split into batches of 1,000
- For each batch: Send to Gemini with full GAA list
- Gemini returns matches (club name, confidence score)

**Output:**
- `output/matched_gaa_veo_clubs.csv` (expected: 50-100 matches)
- Format: `GAA_Club, County, VEO_Club_Name, VEO_Recordings, Confidence`

**Scripts to write:**
- `1-prepare-batches.py` - Split 27k into batches
- `2-gemini-matcher.py` - Run Gemini API calls
- `3-combine-results.py` - Merge batch results

**Cost:** ~$10, **Time:** ~1 hour

---

## Step 2: Scrape Club Contacts

**Input:**
- `output/matched_gaa_veo_clubs.csv` (50-100 clubs)

**Process:**
- For each club: Google search for website, email, phone
- Use existing scraper from CLANNAI/crm/veo/crm-clean/src/3-contact-finder.py
- Extract: website, email, phone, Facebook, Twitter

**Output:**
- `output/gaa_clubs_with_contacts.csv`
- Format: `Club, County, VEO_Recordings, Email, Phone, Website`

**Script:**
- `4-scrape-contacts.py` - Reuse existing contact scraper

**Time:** ~2-3 hours

---

## Step 3: Admin Dashboard + Attio Link

**Backend:**
- Update `backend/routes/admin.js`
- Add Attio iframe or link to admin dashboard

**Frontend:**
- Update `frontend/src/app/admin/page.tsx`
- Add new tab: "CRM" with link to Attio

**Attio Setup:**
- Import `gaa_clubs_with_contacts.csv` to Attio
- Create "GAA VEO Prospects" list
- Tag with: VEO_Recordings count, County

---

## Step 4: Email Campaign (100 clubs)

**In Attio:**
- Select top 100 clubs (sorted by VEO recordings)
- Create email sequence:
  - Subject: "Coaching AI for [Club Name]"
  - Personalize: Club name, county, VEO mention
- Set up tracking
- Send 100 emails over 1 week (10-20/day)

**Email Template:**
```
Subject: Better insights from your VEO footage?

Hi [Club Name],

Noticed you're using VEO to record games. We built AI that 
automatically analyzes GAA footage and generates:
- Match stats (shots, possession, turnovers)
- Key moments timeline
- AI coach insights

Would you be interested in a quick demo?

Best,
Thomas
Clann AI
[calendly link]
```

---

## Step 5: Call with Paul

**Prep:**
- Show him: matched clubs list, admin dashboard, email stats
- Ask: Best approach for GAA club outreach?
- Get: Intro to 2-3 clubs for pilot

**Schedule:** After 50 emails sent, before scaling to 500

---

## File Structure

```
crm-data/
├── ANADI_TODO.md              (this file)
├── raw/
│   └── veo_clubs_27k.csv      (copy from CLANNAI)
├── scripts/
│   ├── 1-prepare-batches.py
│   ├── 2-gemini-matcher.py
│   ├── 3-combine-results.py
│   ├── 4-scrape-contacts.py
│   └── requirements.txt
└── output/
    ├── matched_gaa_veo_clubs.csv
    └── gaa_clubs_with_contacts.csv
```

---

## Quick Start

```bash
cd crm-data

# 1. Copy raw data
cp /path/to/CLANNAI/crm/veo/raw/veo_clubs_27k.csv raw/

# 2. Install deps
cd scripts && pip install -r requirements.txt

# 3. Run matching
python 1-prepare-batches.py
python 2-gemini-matcher.py
python 3-combine-results.py

# 4. Scrape contacts
python 4-scrape-contacts.py

# 5. Import to Attio
# (Upload output/gaa_clubs_with_contacts.csv)
```

---

## Timeline

- **Day 1:** VEO matching (Step 1)
- **Day 2:** Contact scraping (Step 2)
- **Day 3:** Admin dashboard + Attio setup (Step 3)
- **Day 4:** Send first 20 emails (Step 4)
- **Day 7:** Call with Paul (Step 5)

---

**Status:** 🔴 Not started  
**Owner:** Anadi  
**Updated:** 2025-11-20

