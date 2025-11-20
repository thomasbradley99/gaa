# Actual vs Invented Outcomes

## What I Fucked Up (Made-Up BS) ❌

### Shots
- **Rebound Post** ❌ - NOT in data
- **Saved** ❌ - NOT in data  
- **45m** ❌ - This is a restart, not a shot outcome

BUT:
- **Short Keeper** ✅ - Actually IS in full game data (my bad for removing)
- **Goal** ✅ - In full game (just not first 10 mins)

### Kickouts
No bullshit here - I had the right ones from the full game:
- ✅ Long, Mid, Short, Left, Centre, Right, Won, Lost

### Turnovers
I had zones like A1-A3, D1-D3, M1-M3 which ARE in the full game.
BUT in first 10 mins:
- Only **M1** (for Turnover Won)
- Only **M3** (for Turnover lost)

---

## Updated Schemas ✅

### `schema_gaa_detectable_first_10min.json`
**ONLY labels that exist in first 10 minutes:**

**Shot Own:** From Play, From Free, Point, Wide  
**Shot Opp:** From Play, From Free, Point, Wide, Pass / Other  
**Kickout Own:** Long, Mid, Left, Lost (NO Won!)  
**Kickout Opp:** Long, Mid, Centre, Right, Won, Lost  
**Turnover Won:** Unforced, M1, middle third  
**Turnover lost:** Unforced, M3, middle third  
**Fouls:** No labels

### `schema_gaa_all_events.json`
**All labels from full game ground truth:**

**Shot Own/Opp:** From Play, From Free, Point, Goal, Wide, Short Keeper  
**Kickout Own/Opp:** Long, Mid, Short, Left, Centre, Right, Won, Lost  
**Turnover Won:** Forced, Unforced, D1-D3, M1-M3, defensive, middle third  
**Turnover lost:** Forced, Unforced, A1-A3, M2-M3, attack third, middle third  

---

## Key Insight

**First 10 mins is LIMITED:**
- No Goals (only Points and Wides)
- Kickout Own never Won in first 10 mins
- Only M1 and M3 turnover zones
- Fouls have NO outcome labels

**Full game has MORE:**
- Goals exist
- Short Keeper saves
- All turnover zones (A1-A3, M1-M3, D1-D3)
- All kickout outcomes

---

**Bottom line:** Schemas now match ACTUAL data, not invented BS.
