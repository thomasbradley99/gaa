# XML Filtering Script Guide

## Script: `0.4_filter_to_detectable.py`

**Purpose:** Converts full game XML to detectable-events-only XML

---

## Usage Examples

### 1. Filter to First 10 Minutes (Detectable Events Only)

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/production1

python3 0.4_filter_to_detectable.py \
  --game kilmeena-vs-cill-chomain \
  --schema schema_gaa_detectable_first_10min.json \
  --time-range 0-600 \
  --output ground_truth_detectable_first_10min.xml
```

**Result:** 20 events (Shot, Kickout, Turnover, Foul)

---

### 2. Filter Full Game (All GAA Events)

```bash
python3 0.4_filter_to_detectable.py \
  --game kilmeena-vs-cill-chomain \
  --schema schema_gaa_all_events.json \
  --output ground_truth_all_gaa_events.xml
```

**Result:** All GAA events (including meta events like Ball in Play, Possession, etc.)

---

### 3. Filter Specific Time Range (Custom)

```bash
python3 0.4_filter_to_detectable.py \
  --game kilmeena-vs-cill-chomain \
  --schema schema_gaa_detectable_first_10min.json \
  --time-range 300-900 \
  --output ground_truth_5-15min.xml
```

**Result:** Events from 5-15 minute mark

---

## What It Does

1. **Loads schema** - Defines which event types to keep
2. **Parses input XML** - Reads `ground_truth_template.xml` (full game)
3. **Filters events:**
   - By event type (based on schema)
   - By time range (if specified)
4. **Renumbers IDs** - Sequential from 1
5. **Writes output** - Clean filtered XML

---

## Key Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--game` | (required) | Game name (folder in `games/`) |
| `--schema` | `schema_gaa_all_events.json` | Schema file to use for filtering |
| `--input` | `ground_truth_template.xml` | Input XML filename |
| `--output` | `ground_truth_detectable_events.xml` | Output XML filename |
| `--time-range` | None | Time range (e.g., "0-600" for first 10 mins) |

---

## Schema Files

### `schema_gaa_detectable_first_10min.json` ⭐
**Use for:** AI evaluation (fair comparison)  
**Contains:** 10 event types (Shot, Kickout, Turnover, Foul)  
**Excludes:** Meta events (Ball in Play, Possession, Attack, etc.)

### `schema_gaa_all_events.json`
**Use for:** Full game analysis  
**Contains:** 26 event types (all GAA events)  
**Includes:** Meta events + detectable events

---

## Example Output

**Input:** 486 events (full game with meta events)  
**Output:** 20 events (first 10 mins, detectable only)

**Filtered events:**
- 8 Shots (4 Own, 4 Opp)
- 5 Kickouts (2 Own, 3 Opp)
- 2 Turnovers (1 Won, 1 lost)
- 5 Fouls

**Excluded events:**
- Ball in Play (9)
- Possession Own/Opp (10)
- Attack Own/Opp (6)
- Stoppage (7)
- Highlight (6)
- etc.

---

## Verification

The script output matches manually filtered ground truth:

```bash
cd games/kilmeena-vs-cill-chomain/inputs
diff ground_truth_detectable_first_10min.xml <generated file>
# Event counts match ✅
```

---

**Location:** `/home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/production1/0.4_filter_to_detectable.py`
