# Timing System - Kilmeena vs Cill Chomain (First 10 Minutes)

## 📍 Video Time (Absolute Timestamps)

**All events use ABSOLUTE VIDEO TIME:**
- Timestamp 0s = start of video file
- Timestamp 600s = 10 minutes into video file
- No adjustments for "game start" or "throw-in"

## 🎯 Target: First 10 Minutes (0-600s)

**Ground Truth File:**
```
ground_truth_detectable_first_10min.xml
```

**Contents:**
- Time range: 0-600s (absolute video time)
- Actual events span: 26.77s → 566.23s
- Total events: 20 detectable events
  - 8 Shots (4 Own, 4 Opp)
  - 5 Kickouts (2 Own, 3 Opp)
  - 2 Turnovers (1 lost, 1 Won)
  - 5 Fouls

## 🧪 Evaluation Command

```bash
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production2

python3 7_evaluate.py \
  --game kilmeena-vs-cill-chomain \
  --time-range 0-600
```

**What it does:**
1. Filters AI events to 0-600s video time
2. Filters Pro events to 0-600s video time + detectable types only
3. Matches events with ±25s tolerance
4. Outputs metrics to `7_evaluation_metrics.json`

## ✅ Consistency Rules

- **Always use video timestamps** (not game time)
- **First 10 minutes = 0-600s** in video file
- **No half markers needed** - just use absolute time
- **AI and Pro XML use same time reference**

This ensures fair, consistent comparison between AI and professional annotations.
