# Shot Outcomes - Simplified

## ❌ Removed BS Outcomes:

- **Short Keeper** - Unclear what this even means
- **Rebound Post** - Too rare, not in first 10 mins
- **Saved** - Not in first 10 mins data
- **Pass / Other** - Not really a shot outcome
- **45m** - This is a restart after a wide, not a shot outcome

## ✅ Kept Core Outcomes:

### Point
- Shot scored over the bar (1 point)
- **Most common** scoring outcome

### Goal
- Shot scored into the net (3 points)
- **High value** outcome (though not in first 10 mins of our game)

### Wide
- Shot missed the target (ball goes wide)
- Results in a **45m free** for the opposition

---

## What Actually Happened (First 10 Minutes):

**Shot Own (4 shots):**
- 3 × Point ✅
- 1 × Wide ✅

**Shot Opp (4 shots):**
- 1 × Point ✅
- 2 × Wide ✅
- 1 × Pass / Other (removed from schema)

---

## AI Should Detect:

For each shot, determine:
1. **Team:** Own or Opp (in event code)
2. **Outcome:** Point, Goal, or Wide
3. **Context:** From Play or From Free

**Example:**
```xml
<code>Shot Own</code>
<label><text>From Play</text></label>
<label><text>Point</text></label>
```

Simple, clear, detectable from video.

---

**Result:** Schema now has only **3 shot outcomes** instead of 7+ random ones.
