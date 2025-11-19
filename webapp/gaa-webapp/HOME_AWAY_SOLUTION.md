# Home/Away Detection - The Right Solution

**Date:** November 19, 2025  
**Solution:** Match detected colors to club database

---

## 🎯 The Right Approach

### **User Flow:**
1. User selects their club when uploading video
2. System knows club's jersey colors (from database)
3. Lambda detects two team colors from video
4. System matches detected colors to club's colors
5. Club team = "home", opponent = "away"

**Simple. Accurate. No guessing.**

---

## 📊 Implementation Plan

### **1. Add Club Colors to Database**

**Update `teams` table:**
```sql
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50),
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50),
ADD COLUMN IF NOT EXISTS goalkeeper_color VARCHAR(50);
```

**Example data:**
```sql
INSERT INTO teams (name, primary_color, secondary_color, goalkeeper_color)
VALUES 
  ('Kerry GAA', 'green', 'gold', 'yellow'),
  ('Dublin GAA', 'blue', 'navy', 'green'),
  ('Mayo GAA', 'red', 'green', 'black');
```

---

### **2. Frontend: User Selects Club on Upload**

Already exists! When creating game:
```tsx
// User already selects team_id when uploading
<Select name="team_id">
  <option value="uuid-1">Kerry GAA</option>
  <option value="uuid-2">Dublin GAA</option>
</Select>
```

---

### **3. Backend: Pass Club Colors to Lambda**

**When invoking Lambda** (`backend/routes/games.js`):

```javascript
// Get team colors from database
const teamResult = await query(
  'SELECT id, name, primary_color, secondary_color FROM teams WHERE id = $1',
  [team_id]
);

const clubTeam = teamResult.rows[0];

// Invoke Lambda with club info
const lambdaPayload = {
  game_id: gameId,
  s3_key: s3Key,
  title: title,
  club_team: {                    // ADD THIS
    name: clubTeam.name,
    primary_color: clubTeam.primary_color,
    secondary_color: clubTeam.secondary_color
  }
};

await lambdaClient.send(new InvokeCommand({
  FunctionName: 'gaa-ai-analyzer-nov25',
  InvocationType: 'Event',
  Payload: JSON.stringify(lambdaPayload)
}));
```

---

### **4. Lambda: Match Colors to Determine Home/Away**

**Update `lambda_handler_s3.py`:**

```python
def match_club_to_detected_colors(club_team, detected_colors):
    """
    Match club's known colors to detected colors
    Returns: ('home', 'away') tuple for (team_a, team_b)
    """
    club_color = club_team['primary_color'].lower()
    team_a_color = detected_colors['team_a'].lower()
    team_b_color = detected_colors['team_b'].lower()
    
    # Check if club color matches team_a
    if is_color_match(club_color, team_a_color):
        return ('home', 'away')  # Club is team_a
    
    # Check if club color matches team_b
    elif is_color_match(club_color, team_b_color):
        return ('away', 'home')  # Club is team_b
    
    # Fallback: default assignment
    print(f"⚠️ Warning: Club color '{club_color}' doesn't match detected colors")
    return ('home', 'away')


def is_color_match(club_color, detected_color):
    """
    Fuzzy color matching (handles variations like 'green' vs 'dark green')
    """
    # Exact match
    if club_color == detected_color:
        return True
    
    # Partial match (e.g., 'green' in 'dark green')
    if club_color in detected_color or detected_color in club_color:
        return True
    
    # Color family matching
    color_families = {
        'green': ['green', 'lime', 'emerald', 'forest green'],
        'blue': ['blue', 'navy', 'royal blue', 'sky blue'],
        'red': ['red', 'maroon', 'crimson'],
        'white': ['white', 'cream', 'off-white'],
        'black': ['black', 'charcoal', 'dark grey']
    }
    
    for family, variations in color_families.items():
        if club_color in variations and detected_color in variations:
            return True
    
    return False


def lambda_handler(event, context):
    # ... existing code ...
    
    # Extract club team info
    club_team = event.get('club_team', {})
    
    # Stage 0.5: Calibrate (detect colors)
    game_profile = stage_0_5_calibrate_game(...)
    
    team_a_color = game_profile['team_a']['jersey_color']
    team_b_color = game_profile['team_b']['jersey_color']
    
    # Match club to detected colors
    if club_team:
        team_a_label, team_b_label = match_club_to_detected_colors(
            club_team,
            {'team_a': team_a_color, 'team_b': team_b_color}
        )
        print(f"✅ Matched club to video:")
        print(f"   {club_team['name']} ({club_team['primary_color']}) = {team_a_label}")
    else:
        # Fallback: arbitrary assignment (old behavior)
        team_a_label = 'home'
        team_b_label = 'away'
    
    # Update team mapping
    team_mapping = {
        'red': team_a_label,
        'blue': team_b_label
    }
    
    # Package team colors with correct labels
    team_colors = {
        team_a_label: team_a_color,
        team_b_label: team_b_color
    }
    
    # Parse opponent name from title
    # If club is "Kerry GAA" and title is "Kerry GAA vs Dublin GAA"
    # Then opponent is "Dublin GAA"
    team_names = parse_team_names_with_club(title, club_team['name'])
    
    # ... rest of pipeline ...
```

---

### **5. Helper Function: Parse Team Names with Club**

```python
def parse_team_names_with_club(title, club_name):
    """
    Parse team names from title, knowing which one is the club
    """
    separators = [' vs ', ' v ', ' - ', ' VS ', ' V ']
    
    for sep in separators:
        if sep in title:
            parts = [p.strip() for p in title.split(sep, 1)]
            
            # Check which part is the club
            if club_name.lower() in parts[0].lower():
                return {
                    'home_team': parts[0],  # Club
                    'away_team': parts[1]   # Opponent
                }
            elif club_name.lower() in parts[1].lower():
                return {
                    'home_team': parts[1],  # Club
                    'away_team': parts[0]   # Opponent
                }
    
    # Fallback: club is home
    return {
        'home_team': club_name,
        'away_team': 'Opponent'
    }
```

---

## 🎨 Color Database Seeding

**Create:** `db/gaa_club_colors.json`

```json
{
  "clubs": [
    {
      "name": "Kerry GAA",
      "county": "Kerry",
      "primary_color": "green",
      "secondary_color": "gold",
      "goalkeeper_color": "yellow"
    },
    {
      "name": "Dublin GAA",
      "county": "Dublin",
      "primary_color": "blue",
      "secondary_color": "navy",
      "goalkeeper_color": "green"
    },
    {
      "name": "Mayo GAA",
      "county": "Mayo",
      "primary_color": "red",
      "secondary_color": "green",
      "goalkeeper_color": "black"
    },
    {
      "name": "Galway GAA",
      "county": "Galway",
      "primary_color": "maroon",
      "secondary_color": "white",
      "goalkeeper_color": "yellow"
    },
    {
      "name": "Cork GAA",
      "county": "Cork",
      "primary_color": "red",
      "secondary_color": "white",
      "goalkeeper_color": "green"
    }
  ]
}
```

**Seed script:** `scripts/seed-club-colors.js`

```javascript
const fs = require('fs');
const { query } = require('../backend/utils/database');

async function seedClubColors() {
  const data = JSON.parse(fs.readFileSync('db/gaa_club_colors.json'));
  
  for (const club of data.clubs) {
    await query(
      `UPDATE teams 
       SET primary_color = $1,
           secondary_color = $2,
           goalkeeper_color = $3
       WHERE name ILIKE $4`,
      [club.primary_color, club.secondary_color, club.goalkeeper_color, `%${club.name}%`]
    );
    console.log(`✅ Updated ${club.name}`);
  }
}

seedClubColors().then(() => process.exit(0));
```

---

## 📊 Example Flow

### **Scenario:**
- User: Kerry GAA coach
- Video: Kerry (green) vs Dublin (blue)
- Video shot from Dublin end, so Dublin appears first

### **Old System (Broken):**
```
1. Detects: blue (first) = team_a, green (second) = team_b
2. Assigns: team_a = home, team_b = away
3. Result: Dublin = home ❌ WRONG
```

### **New System (Correct):**
```
1. User selects: Kerry GAA (team_id)
2. Database: Kerry = green jersey
3. Lambda detects: blue and green
4. Lambda matches: green = Kerry = home ✅
5. Result: Kerry = home, Dublin = away ✅
```

---

## ✅ Benefits

1. **Accurate:** Club is always "home" (their perspective)
2. **Automatic:** No user intervention needed
3. **Scalable:** Works for all clubs in database
4. **Simple:** One database lookup + color matching

---

## 📋 Implementation Checklist

### Database
- [ ] Add color columns to `teams` table
- [ ] Create `gaa_club_colors.json` with major clubs
- [ ] Create seed script
- [ ] Seed existing teams with colors

### Backend
- [ ] Fetch team colors when game is created
- [ ] Pass club info to Lambda in payload
- [ ] Update Lambda invocation

### Lambda
- [ ] Accept `club_team` in event payload
- [ ] Implement `match_club_to_detected_colors()`
- [ ] Implement `is_color_match()` with fuzzy matching
- [ ] Update `parse_team_names_with_club()`
- [ ] Update team assignment logic

### Testing
- [ ] Test with known club colors
- [ ] Test with color variations (dark green vs green)
- [ ] Test fallback when colors don't match
- [ ] Test opponent name parsing

---

## 🎯 Migration for Existing Games

For games already analyzed with wrong home/away:

```sql
-- Option 1: Re-analyze
UPDATE games SET status = 'pending' WHERE status = 'analyzed';

-- Option 2: Provide "Swap Teams" button as temporary fix
-- (Until re-analysis happens)
```

---

## 🚀 Deployment Order

1. **Database migration** (add color columns)
2. **Seed club colors** (run script)
3. **Deploy backend** (fetch and pass colors)
4. **Deploy Lambda** (color matching logic)
5. **Test** with real games

---

**This is the right solution!** Club selection → color matching → accurate home/away assignment.

