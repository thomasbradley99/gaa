# Home/Away Assignment Logic

**Status:** ⚠️ **ARBITRARY** - Not smart, needs fixing

---

## 🎯 The Problem

The system **arbitrarily** assigns home/away, which can be wrong!

---

## 📊 Current Flow

### 1. **Stage 0.5: Calibration**
Lambda detects two team colors from video:

```python
team_a_color = "green"  # First team detected
team_b_color = "blue"   # Second team detected
```

**Problem:** Order is arbitrary - depends on which team appears first in calibration frames.

---

### 2. **Stage 4: JSON Extraction**
AI is told to map colors to home/away:

```python
# In stages/stage_4_json_extraction.py, line 76
prompt = f"""
- Map jersey colors to team: "{team_a['jersey_color']}" = home, "{team_b['jersey_color']}" = away
"""
```

**Result:** Events get `team: "home"` or `team: "away"` field.

**Problem:** team_a = home is arbitrary! No logic to determine actual home team.

---

### 3. **Lambda Posts to Backend**
```python
# Lines 311-314
team_colors = {
    'home': team_a_color,   # green
    'away': team_b_color    # blue
}

# Lines 43-60
team_names = parse_team_names_from_title(title)  
# "Kilmeena vs Cill Chomain" → home=Kilmeena, away=Cill Chomain

payload = {
    'metadata': {
        'teams': {
            'home_team': {
                'name': team_names['home_team'],      # Kilmeena
                'jersey_color': team_colors['home']   # green
            },
            'away_team': {
                'name': team_names['away_team'],      # Cill Chomain
                'jersey_color': team_colors['away']   # blue
            }
        }
    }
}
```

**Problem:** Assumes first name in title = home = team_a color. This might be wrong!

---

### 4. **Example Mismatch**

**Title:** "Kilmeena vs Cill Chomain"

**Video Detection:**
- First team seen: Blue jerseys (Cill Chomain - actually away)
- Second team seen: Green jerseys (Kilmeena - actually home)

**Result:**
```json
{
  "home_team": {
    "name": "Kilmeena",       // ✅ Correct
    "jersey_color": "blue"    // ❌ WRONG! Kilmeena wears green
  },
  "away_team": {
    "name": "Cill Chomain",   // ✅ Correct
    "jersey_color": "green"   // ❌ WRONG! Cill Chomain wears blue
  }
}
```

**Impact:**
- Frontend shows wrong team colors
- Stats attributed to wrong teams
- Confusing for coaches

---

## 🔍 Why This Happens

### Calibration Frame Selection
```python
# Stage 0.0 extracts frames at:
- 30 seconds
- 5 minutes
- 25 minutes
```

**Problem:** Depends which team is on camera first. If video is shot from away end, away team appears first.

### No "Attacking Direction" Logic
The system **does not** use:
- Which side of field teams are on
- Which goal they're attacking
- Which team has kickoff
- Any other contextual clues

It's purely: "First team detected = team_a = home"

---

## ❌ What's Wrong

1. **Arbitrary Detection Order**
   - team_a is just the first detected, not actual home team

2. **Title Parsing Assumption**
   - Assumes "Team A vs Team B" means A=home, B=away
   - Not always true! Could be "Away vs Home"

3. **No Validation**
   - No way to verify if colors match names
   - No user confirmation
   - No way to swap if wrong

---

## ✅ How to Fix

### **Option 1: Use Attacking Direction (Best)**

Determine home/away based on which goal teams attack:

```python
# In Stage 0.5 calibration
game_profile = {
    'team_a': {
        'jersey_color': 'green',
        'attacking_direction': 'left-to-right'  # Add this
    },
    'team_b': {
        'jersey_color': 'blue',
        'attacking_direction': 'right-to-left'  # Add this
    }
}

# Convention: Team attacking left-to-right = home
if game_profile['team_a']['attacking_direction'] == 'left-to-right':
    home_team = team_a
    away_team = team_b
else:
    home_team = team_b
    away_team = team_a
```

**Benefit:** Consistent across all videos, follows sports convention.

---

### **Option 2: Let User Confirm/Swap**

Add UI to swap teams if wrong:

```tsx
// In game detail page
<div className="team-assignment">
  <p>Are these team colors correct?</p>
  <div>Home: {home_team.name} ({home_team.jersey_color})</div>
  <div>Away: {away_team.name} ({away_team.jersey_color})</div>
  <Button onClick={swapTeams}>Swap Teams</Button>
</div>
```

**Benefit:** Simple, lets user fix mistakes.

---

### **Option 3: Match Colors to Team Database**

If you have a team database with known jersey colors:

```python
def match_colors_to_teams(detected_colors, team_names):
    # Look up Kerry GAA → known to wear green
    # Look up Dublin → known to wear blue
    # Match detected colors to known colors
    pass
```

**Benefit:** Automatic, accurate if database is good.

---

### **Option 4: Use Team Name Position Convention**

Standardize title format:

```
"Home Team vs Away Team" (always)
```

**Benefit:** Simple if titles are consistent.

**Problem:** Requires user discipline, error-prone.

---

## 🎯 Recommended Solution

**Combination of Option 1 + Option 2:**

1. **Auto-detect using attacking direction** (best guess)
2. **Show confirmation UI** with swap button (let user fix)

```python
# Lambda Stage 0.5
- Detect attacking directions
- Assign team attacking left-to-right as home

# Frontend
- Display team assignments
- Allow user to swap if wrong
- Store correction in metadata
```

---

## 🔧 Current Workaround

**Manual fix after analysis:**

1. User notices wrong colors
2. Opens edit mode
3. Manually swaps team assignments
4. Re-saves events

**Problem:** Requires manual intervention every time.

---

## 📋 Implementation Plan

### Phase 1: Add "Swap Teams" Button (Quick Fix)
- [ ] Add swap button to game detail page
- [ ] Update backend endpoint to swap metadata.teams
- [ ] Update events.team_mapping

### Phase 2: Smart Detection (Better)
- [ ] Update Stage 0.5 to detect attacking directions
- [ ] Use attacking direction to assign home/away
- [ ] Add confidence score

### Phase 3: Team Database (Best)
- [ ] Create team colors database
- [ ] Match detected colors to known teams
- [ ] Auto-assign based on matches

---

## 📝 Current Hardcoded Mapping

```python
# lambda_handler_s3.py, line 305-308
team_mapping = {
    'red': 'home',   # Legacy format
    'blue': 'away'   # Legacy format
}
```

**Note:** This is for **backward compatibility** with old event format. New events use "home"/"away" directly.

---

## 🎯 Summary

**Current Logic:**
```
team_a (first detected) = home
team_b (second detected) = away
```

**Problem:** Arbitrary, often wrong.

**Solution:** Use attacking direction or let user swap.

---

**Want me to implement the "Swap Teams" button?** That's the quickest fix to let users correct mistakes.

