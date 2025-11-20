# 2-gaa-ai Setup Guide

## ✅ What's Ready

### 📂 Directory Structure
```
/home/ubuntu/clann/gaa/ai/2-gaa-ai/
├── README.md                    ✅ Overview
├── SETUP.md                     ✅ This file
├── pipelines/
│   └── production1/             ✅ 60s clips pipeline (copied from 1-gaa-ai)
├── games/
│   └── kilmeena-vs-cill-chomain/
│       ├── video.mp4            ✅ Video file (2.7GB)
│       ├── inputs/
│       │   ├── ground_truth_detectable_first_10min.xml  ✅ Target (20 events)
│       │   ├── TIMING_SYSTEM.md  ✅ Timing documentation
│       │   ├── clips/           ✅ 83 clips pre-generated
│       │   └── game_profile.json ✅ Team colors, calibration
│       └── outputs/             ✅ Ready for new AI output
├── test-viewer/                 ✅ HTML viewer for results
├── docs/                        ✅ Documentation (pricing, etc.)
└── schemas/                     ✅ Event schemas
```

### 🎯 Ground Truth (First 10 Minutes)

**File:** `games/kilmeena-vs-cill-chomain/inputs/ground_truth_detectable_first_10min.xml`

**Target:** 20 detectable events (0-600s video time)

| Event Type | Count |
|-----------|-------|
| Shot Own | 4 |
| Shot Opp | 4 |
| Kickout Own | 2 |
| Kickout Opp | 3 |
| Turnover lost | 1 |
| Turnover Won | 1 |
| Foul Awarded | 1 |
| Foul Conceded | 3 |
| Scoreable Foul Awarded | 1 |

### 📋 Event Structure (Team & Outcome)

**TEAM:** Encoded in event code
- `Shot Own` = home team
- `Shot Opp` = away team

**OUTCOME:** Stored as XML `<label>` tags
- Shots: `Point`, `Goal`, `Wide`, `Saved`
- Kickouts: `Won`, `Lost` + type (`Long`, `Mid`, `Short`)

**Example:**
```xml
<code>Shot Own</code>
<label><text>From Play</text></label>
<label><text>Point</text></label>
```

### ⏱️ Timing System

**All timestamps = absolute video time**
- 0s = start of video file
- 600s = 10 minutes into video
- No game start adjustments

See: `games/kilmeena-vs-cill-chomain/inputs/TIMING_SYSTEM.md`

---

## 🏃 How to Run Pipeline

### Option 1: Process First 10 Minutes Only (Recommended)

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/production1

# 1. Describe first 10 clips only (0-600s)
python3 1_clips_to_descriptions.py --game kilmeena-vs-cill-chomain --start-clip 0 --end-clip 10

# 2. Create narrative
python3 2_create_coherent_narrative.py --game kilmeena-vs-cill-chomain

# 3. Classify events
python3 3_event_classification.py --game kilmeena-vs-cill-chomain

# 4. Extract JSON
python3 4_json_extraction.py --game kilmeena-vs-cill-chomain

# 5. Export to XML
python3 5_export_to_anadi_xml.py --game kilmeena-vs-cill-chomain

# 6. Evaluate (filter to 0-600s)
python3 6_evaluate.py --game kilmeena-vs-cill-chomain --time-range 0-600
```

### Option 2: Process Full Game (Then Filter Evaluation)

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/production1

# Process all clips
python3 1_clips_to_descriptions.py --game kilmeena-vs-cill-chomain

# Then continue pipeline...
# Evaluation will filter to 0-600s automatically
python3 6_evaluate.py --game kilmeena-vs-cill-chomain --time-range 0-600
```

---

## 🎯 What AI Needs to Detect

Current AI (1-gaa-ai) only detects:
- ✅ Possession events
- ✅ Some kickouts

Target AI (2-gaa-ai) should detect:
- ✅ Kickouts (with Won/Lost outcomes)
- ❌ **Shots** (with Point/Goal/Wide outcomes) ← NEW
- ❌ **Turnovers** (possession changes) ← NEW
- ❌ **Fouls** (referee decisions) ← NEW

---

## 📊 Evaluation Metrics

After running the pipeline, check:

```bash
cat games/kilmeena-vs-cill-chomain/outputs/[latest-run]/6_evaluation_metrics.json
```

Key metrics:
- **Precision:** How many AI events were correct?
- **Recall:** How many ground truth events did AI find?
- **F1 Score:** Balanced performance metric
- **TP/FP/FN:** True Positives, False Positives, False Negatives

---

## 🔧 Key Files to Modify (for Improvement)

To improve AI detection, focus on these prompt files:

1. **Stage 1:** `pipelines/production1/1_clips_to_descriptions.py`
   - Prompt for describing video clips
   - Add focus on shots, turnovers, fouls

2. **Stage 3:** `pipelines/production1/3_event_classification.py`
   - Prompt for classifying events
   - Ensure it outputs: Shot, Kickout, Turnover, Foul

3. **Stage 4:** `pipelines/production1/4_json_extraction.py`
   - Prompt for extracting structured JSON
   - Must include team (Own/Opp) and outcome (Point/Goal/Wide/Won/Lost)

---

## 📝 Next Steps

1. ✅ Setup complete (2-gaa-ai created)
2. ⏳ Run baseline (current pipeline on first 10 mins)
3. ⏳ Improve prompts (add Shot/Turnover/Foul detection)
4. ⏳ Re-run and evaluate
5. ⏳ Compare metrics

---

## 📂 Directory Comparison

| Feature | 1-gaa-ai | 2-gaa-ai |
|---------|----------|----------|
| Pipeline | production1 + production2 | production1 only |
| Focus | Full games | First 10 mins |
| Ground Truth | Full game XML | Filtered (20 events, 0-600s) |
| Approach | Existing (Possession-focused) | New (Shot/Kickout/Turnover/Foul) |

