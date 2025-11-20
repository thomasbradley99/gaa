# 2-gaa-ai: New Approach for GAA Event Detection

This is a fresh start for improving GAA AI event detection, focusing on the **first 10 minutes** of the Kilmeena vs Cill Chomain game.

## 🎯 Goal

Detect **20 detectable events** from video (0-600s):
- 8 Shots (with outcomes: Point, Goal, Wide)
- 5 Kickouts (with outcomes: Won, Lost)
- 2 Turnovers
- 5 Fouls

## 📂 Structure

```
2-gaa-ai/
├── pipelines/
│   └── production1/          # Pipeline stages (60s clips)
├── games/
│   └── kilmeena-vs-cill-chomain/
│       ├── inputs/           # Ground truth XMLs
│       │   └── ground_truth_detectable_first_10min.xml  ← Target
│       ├── outputs/          # AI output will go here
│       └── video.mp4
├── test-viewer/              # HTML viewer for results
├── docs/                     # Documentation
└── schemas/                  # Event schemas

```

## 🎯 Ground Truth (Target)

**File:** `games/kilmeena-vs-cill-chomain/inputs/ground_truth_detectable_first_10min.xml`

**Contents:** 20 events (0-600s video time)
- Shot Own: 4 events
- Shot Opp: 4 events
- Kickout Own: 2 events
- Kickout Opp: 3 events
- Turnover lost: 1 event
- Turnover Won: 1 event
- Foul Awarded: 1 event
- Foul Conceded: 3 events
- Scoreable Foul Awarded: 1 event

## 🏃 Pipeline Stages

```bash
cd pipelines/production1

# 0. Generate clips from video
python3 0_generate_clips.py --game kilmeena-vs-cill-chomain

# 1. Describe clips with AI
python3 1_clips_to_descriptions.py --game kilmeena-vs-cill-chomain

# 2. Create coherent narrative
python3 2_create_coherent_narrative.py --game kilmeena-vs-cill-chomain

# 3. Classify events
python3 3_event_classification.py --game kilmeena-vs-cill-chomain

# 4. Extract JSON
python3 4_json_extraction.py --game kilmeena-vs-cill-chomain

# 5. Export to XML
python3 5_export_to_anadi_xml.py --game kilmeena-vs-cill-chomain

# 6. Evaluate
python3 6_evaluate.py --game kilmeena-vs-cill-chomain --time-range 0-600
```

## ⏱️ Timing System

**All timestamps use absolute video time:**
- 0s = start of video file
- 600s = 10 minutes into video
- No game start adjustments

See: `games/kilmeena-vs-cill-chomain/inputs/TIMING_SYSTEM.md`

## 🆕 What's Different from 1-gaa-ai?

This is a clean slate to implement a new approach:
- Focus on first 10 minutes only (0-600s)
- Target specific detectable events (Shots, Kickouts, Turnovers, Fouls)
- Improved prompts for event detection
- Fair evaluation against filtered ground truth

## 📊 Evaluation

Compare AI output against `ground_truth_detectable_first_10min.xml`:

```bash
cd pipelines/production1
python3 6_evaluate.py --game kilmeena-vs-cill-chomain --time-range 0-600
```

Metrics: Precision, Recall, F1, True Positives, False Positives, False Negatives
