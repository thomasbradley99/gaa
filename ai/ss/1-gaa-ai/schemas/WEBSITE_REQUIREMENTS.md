# Anadi Website Display Requirements

**Purpose:** Defines what the Anadi website needs to properly display match statistics  
**Based on:** Analysis of Anadi stats dashboard  
**Date:** November 4, 2025

---

## Critical Requirements

### 1. Period Markers (MANDATORY)

**The website REQUIRES these to split stats by half:**

```xml
<instance>
  <ID>1</ID>
  <start>705</start>
  <end>707</end>
  <code>1st Half Start</code>
</instance>

<instance>
  <ID>X</ID>
  <start>3105</start>
  <end>3107</end>
  <code>1st Half End</code>
</instance>

<instance>
  <ID>Y</ID>
  <start>3205</start>
  <end>3207</end>
  <code>2nd Half Start</code>
</instance>

<instance>
  <ID>Z</ID>
  <start>6105</start>
  <end>6107</end>
  <code>2nd Half End</code>
</instance>
```

**Without these:**
- ❌ Stats can't be split into 1st/2nd half columns
- ❌ Dashboard shows only "Total" column
- ❌ Half-by-half analysis broken

**Extra time markers (if applicable):**
- `1st Extra Time Start` / `1st Extra Time End`
- `2nd Extra Time Start` / `2nd Extra Time End`

---

## Event Types the Website Uses

### Core Stats Displayed

**Goals:**
- `Home Goal` / `Opp Goal`
- Grouped by half
- Shows: Goals scored, conceded, difference

**Shots:**
- `Home Shot at Goal` / `Opp Shot at Goal`
- **Requires label:** `<group>Shot Outcome</group>`
- **Values:** On Target, Off Target, Blocked, Save
- Shows: Total shots breakdown with percentages

**Free Kicks:**
- `Home Free Kick` / `Opp Free Kick`
- **Requires label:** `<group>Free Kick</group>` or `<group>Shot Outcome</group>`
- **Values:** Indirect, On Target, Off Target, Save, Blocked
- Shows: Free kick breakdown with percentages

**Penalties:**
- `Home Penalty` / `Opp Penalty`
- **Requires label:** `<group>Shot Outcome</group>`
- **Values:** On Target, Off Target, Save
- Shows: Penalty breakdown with percentages

**Crosses:**
- `Home Cross` / `Opp Cross`
- Shows: Total crosses per team per half

**Corners:**
- `Home Corner` / `Opp Corner`
- Shows: Total corners per team per half

**Throw-ins:**
- `Home Throw In` / `Opp Throw In`
- Shows: Total throw-ins per team per half

**Fouls:**
- `Home Foul` / `Opp Foul`
- Shows: Total fouls per team per half

**Offside:**
- `Home Offside` / `Opp Offside`
- Shows: Total offsides per team per half

**Cards:**
- `Home Yellow Card` / `Opp Yellow Card`
- `Home Red Card` / `Opp Red Card`
- Shows: Card totals per team per half

**Regains:**
- `Home Regain Won` / `Opp Regain Won`
- **Requires label:** `<group>Turnover Won Zone</group>`
- **Values:** A3 left/centre/right, M3 left/centre/right, D3 left/centre/right
- Shows: Heatmap of where possession was won

**A3 Entry:**
- `Home A3 Entry` / `Opp A3 Entry`
- Shows: Attacking third entries
- Used for: A3 entries to shots/goals ratios

---

## Calculated Metrics

The website calculates these from events:

**Possession %:**
- Requires: `Home Possession` / `Opp Possession` events
- **Our AI can't reliably detect this** ❌
- Will show 0% or N/A without these events

**Shots to Goals Ratio:**
- Uses: Shot at Goal events + Goal events
- Calculates: Goals / Total shots percentage
- **Our AI CAN detect this** ✅

**A3 Entries to Shots:**
- Uses: A3 Entry events + Shot at Goal events
- Calculates: Shots / A3 entries percentage
- **Our AI CAN detect this** ✅

**A3 Entries to Goals:**
- Uses: A3 Entry events + Goal events
- Calculates: Goals / A3 entries percentage
- **Our AI CAN detect this** ✅

---

## What AI Must Detect (Priorities)

### Priority 1: MUST HAVE (Website Breaks Without)
- ✅ `1st Half Start`
- ✅ `1st Half End`
- ✅ `2nd Half Start`
- ✅ `2nd Half End`
- ✅ `Home Goal` / `Opp Goal`

### Priority 2: CORE STATS (Website Expects)
- ✅ `Home Shot at Goal` / `Opp Shot at Goal` (with labels!)
- ✅ `Home Corner` / `Opp Corner`
- ✅ `Home Foul` / `Opp Foul`
- ✅ `Home Free Kick` / `Opp Free Kick` (with labels!)
- ✅ `Home Throw In` / `Opp Throw In`

### Priority 3: ADVANCED STATS (Nice to Have)
- ⚠️ `Home A3 Entry` / `Opp A3 Entry`
- ⚠️ `Home Cross` / `Opp Cross`
- ⚠️ `Home Regain Won` / `Opp Regain Won` (with zone labels!)
- ⚠️ `Home Offside` / `Opp Offside`
- ⚠️ Cards (Yellow/Red)

### Priority 4: CAN'T DETECT (Skip)
- ❌ `Home Possession` / `Opp Possession` - Too hard for AI
- ❌ `Ball in Play` / `Ball out of Play` - Continuous state

---

## Label Requirements

### Shot Outcome (CRITICAL)
**For:** Home/Opp Shot at Goal, Free Kick, Penalty

```xml
<label>
  <group>Shot Outcome</group>
  <text>Save</text>  <!-- Save, Off Target, On Target, Blocked -->
</label>
```

**Website uses this to calculate:**
- % shots on target
- % shots saved
- % shots blocked
- % shots off target

**Without labels:** Website shows shots but no breakdown!

### Turnover Won Zone (IMPORTANT)
**For:** Home/Opp Regain Won

```xml
<label>
  <group>Turnover Won Zone</group>
  <text>M3 centre</text>  <!-- A3/M3/D3 + left/centre/right -->
</label>
```

**Website uses this for:** Regains heatmap showing where possession was won

### Free Kick Type
**For:** Home/Opp Free Kick

```xml
<label>
  <group>Free Kick</group>
  <text>Indirect</text>  <!-- Indirect, or Shot Outcome labels -->
</label>
```

---

## Minimum Viable XML

**For website to work at basic level:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<file>
  <ALL_INSTANCES>
    <!-- REQUIRED: Period markers -->
    <instance><ID>1</ID><start>X</start><end>X</end><code>1st Half Start</code></instance>
    <instance><ID>2</ID><start>Y</start><end>Y</end><code>1st Half End</code></instance>
    <instance><ID>3</ID><start>Z</start><end>Z</end><code>2nd Half Start</code></instance>
    <instance><ID>4</ID><start>W</start><end>W</end><code>2nd Half End</code></instance>
    
    <!-- CORE: Goals and shots with labels -->
    <instance>
      <ID>5</ID><start>...</start><end>...</end>
      <code>Home Shot at Goal</code>
      <label><group>Shot Outcome</group><text>Save</text></label>
    </instance>
    
    <!-- CORE: Other discrete events -->
    <instance><ID>6</ID><start>...</start><end>...</end><code>Home Corner</code></instance>
    <instance><ID>7</ID><start>...</start><end>...</end><code>Opp Foul</code></instance>
    ...
  </ALL_INSTANCES>
</file>
```

---

## Validation Checklist for Our AI Output

- [ ] Has all 4 period markers (1st/2nd Half Start/End)
- [ ] All shots have Shot Outcome labels
- [ ] All free kicks have labels (Indirect or Shot Outcome)
- [ ] Events properly attributed to Home/Opp
- [ ] IDs are sequential integers
- [ ] Times in seconds
- [ ] Follows exact XML structure

---

**Next Step:** Verify our AI output meets these requirements!

