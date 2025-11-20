# Calibration Lock Fix - Nov 20, 2024

## Problem Identified

**Root Cause of 0% F1 Runs:** The `game_profile.json` file was being regenerated between AI runs, causing team assignments to flip. When Black/White mappings were inverted, all events had the wrong perspective (Shot Own → Shot Opp), resulting in 0% F1 score.

### Evidence
- `game_profile.json` was modified at 23:02 on Nov 19 (right before the 6 test runs)
- File contained incorrect data:
  - Team A = White (should be Black)
  - `home_team_assignment = "EDIT_ME"` (should be "team_a")
  - `start = 0` (should be 25)
  - `half_time = null` (should be 1950)

## Solution Implemented

### 1. **Strict Validation** (Fail Fast)

Both Stage 1 and Stage 3 now:
- **REQUIRE** `game_profile.json` to exist
- **FAIL IMMEDIATELY** if `home_team_assignment` is not set to 'team_a' or 'team_b'
- Display clear error messages with fix instructions
- **Prevent pipeline from running** with invalid configuration

### 2. **Calibration Warning**

`0.5_calibrate_game.py` now:
- Detects if `game_profile.json` already exists
- Warns user that overwriting will cause inconsistencies
- Requires explicit "OVERWRITE" confirmation to proceed
- Emphasizes that calibration should only run **ONCE** per game

### 3. **Locked Configuration Messages**

- Both stages now display: `📌 Locked configuration - DO NOT re-run calibration!`
- Makes it crystal clear that the config is intentionally fixed

## Files Modified

1. `pipelines/1-production/1_clips_to_descriptions.py`
   - Added strict validation for game_profile.json
   - Fail if file missing or home_team_assignment invalid
   - Removed fallback logic (no more soft warnings)

2. `pipelines/1-production/3_event_classification.py`
   - Added same strict validation
   - Removed conditional HOME_TEAM/AWAY_TEAM logic
   - Guaranteed team assignments are always valid

3. `pipelines/1-production/0.5_calibrate_game.py`
   - Added overwrite warning and confirmation prompt
   - Prevents accidental recalibration

4. `games/kilmeena-vs-cill-chomain/inputs/game_profile.json`
   - Restored correct configuration:
     - Team A (Home) = Black
     - Team B (Away) = White
     - Proper match times (start=25, half_time=1950, etc.)
     - `home_team_assignment = "team_a"`

## Critical Rules Going Forward

1. **Run calibration ONCE** per game
2. **Manually verify** team assignments (watch first kickout)
3. **Lock the file** - never re-run calibration after setting home_team_assignment
4. **Pipeline will fail** if configuration is invalid (this is intentional!)

## Why This Matters

The AI pipeline is **deterministic in everything except the LLM itself**. When team assignments change between runs, we introduce a massive source of variance that looks like AI non-determinism but is actually configuration inconsistency.

With this fix:
- Team assignments are **locked** per game
- Any attempt to run with invalid config **fails immediately**
- We can now trust that variance is from Gemini, not from our configuration

## Next Steps

If you see a pipeline failure complaining about home_team_assignment:
1. **DO NOT** re-run calibration
2. **DO** manually edit game_profile.json
3. Set `"home_team_assignment": "team_a"` or `"team_b"` based on ground truth
4. Save and re-run pipeline

