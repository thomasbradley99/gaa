# GAA AI Event Detection - Production System

## Quick Start

### Run the Full Pipeline (10 minutes of video)

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai

# Stage 1: Video → Descriptions (clips 0-9 = first 10 mins)
python3 pipelines/production1/1_clips_to_descriptions.py \
  --game kilmeena-vs-cill-chomain \
  --start-clip 0 \
  --end-clip 9

# Stage 2: Descriptions → Narrative
python3 pipelines/production1/2_create_coherent_narrative.py \
  --game kilmeena-vs-cill-chomain

# Stage 3: Narrative → Classified Events
python3 pipelines/production1/3_event_classification.py \
  --game kilmeena-vs-cill-chomain

# (Stages 4-5 run automatically with Stage 3)

# Stage 7: Evaluate vs Ground Truth
python3 pipelines/production1/7_evaluate.py \
  --game kilmeena-vs-cill-chomain
```

### Or Run All at Once

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai

python3 pipelines/production1/1_clips_to_descriptions.py \
  --game kilmeena-vs-cill-chomain --start-clip 0 --end-clip 9 && \
python3 pipelines/production1/2_create_coherent_narrative.py \
  --game kilmeena-vs-cill-chomain && \
python3 pipelines/production1/3_event_classification.py \
  --game kilmeena-vs-cill-chomain && \
python3 pipelines/production1/7_evaluate.py \
  --game kilmeena-vs-cill-chomain
```

---

## Current Performance (First 10 Minutes)

- **Precision: 32.0%** - 8 correct out of 25 detected
- **Recall: 40.0%** - 8 correct out of 20 in ground truth  
- **F1 Score: 35.6%**
- **Cost: $0.26** per 10-minute segment

**Best at:**
- Turnovers: 100% F1
- Kickouts: 67% F1
- Shots: 40-44% F1

**Needs work:**
- Fouls: 0% (timing mismatches)

See `PERFORMANCE_SUMMARY.md` for full details.

---

## File Structure

```
2-gaa-ai/
├── pipelines/production1/          # Main pipeline scripts
│   ├── 1_clips_to_descriptions.py  # Gemini video analysis
│   ├── 2_create_coherent_narrative.py
│   ├── 3_event_classification.py   # Auto-runs 4 & 5
│   ├── 4_json_extraction.py
│   ├── 5_export_to_xml.py
│   └── 7_evaluate.py
│
├── games/kilmeena-vs-cill-chomain/
│   ├── inputs/
│   │   ├── clips/                  # Video clips (1-min each)
│   │   ├── game_profile.json       # Team colors, directions
│   │   └── ground_truth_detectable_first_10min.xml
│   │
│   └── outputs/
│       └── 6-with-audio-YYYYMMDD-HHMM/  # Timestamped runs
│           ├── 1_observations.txt
│           ├── 2_narrative.txt
│           ├── 3_events_classified.txt
│           ├── 4_events.json
│           ├── 5_*_AI.xml
│           ├── 7_evaluation_metrics.json
│           └── 7_evaluation_timeline.txt
│
└── schemas/
    ├── schema_gaa_detectable_first_10min.json  # 10 event types
    └── schema_gaa_all_events.json               # Full schema
```

---

## Game Profile Setup

Each game needs a `game_profile.json` in `games/{game-name}/inputs/`:

```json
{
  "team_a": {
    "jersey_color": "Black",
    "keeper_color": "Dark",
    "attack_direction_1st_half": "right-to-left",
    "attack_direction_2nd_half": "left-to-right"
  },
  "team_b": {
    "jersey_color": "White",
    "keeper_color": "Dark",
    "attack_direction_1st_half": "left-to-right",
    "attack_direction_2nd_half": "right-to-left"
  },
  "match_times": {
    "start": 25,
    "half_time": 1950,
    "second_half_start": 2820,
    "end": 4920
  },
  "home_team_assignment": "team_a"
}
```

---

## Event Types Detected

### Primary Events (10 types):
1. **Shot Own** - Home team shoots (Point/Goal/Wide)
2. **Shot Opp** - Away team shoots (Point/Goal/Wide)
3. **Kickout Own** - Home keeper kickout (Long/Mid/Short, Won/Lost)
4. **Kickout Opp** - Away keeper kickout (Long/Mid/Short, Won/Lost)
5. **Turnover Won** - Home team gains possession
6. **Turnover lost** - Home team loses possession  
7. **Foul Awarded** - Free TO home (opponent fouled us)
8. **Foul Conceded** - Free BY home (we fouled opponent)
9. **Scoreable Foul Awarded** - Free TO home near goal
10. **Scoreable Foul Conceded** - Free BY home near goal

---

## Key Configuration

### Environment
- **Model:** Gemini 2.5 Pro
- **API Key:** From `/home/ubuntu/clann/CLANNAI/.env`
- **Workers:** 30 parallel (Stage 1)
- **Temperature:** 0 (deterministic)

### Evaluation
- **Tolerance:** ±25 seconds for event matching
- **Ground Truth:** Detectable events only (not full professional annotations)

---

## Tips

1. **First run on new game:** Set up game_profile.json first
2. **Clip range:** Use `--start-clip` and `--end-clip` to process specific segments
3. **Output folders:** Auto-timestamped to prevent overwrites
4. **Best run:** Marked with `PRODUCTION_BEST.txt`

---

## Web Upload (Optional)

To upload results to S3 for web viewing:

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai
bash upload-s3.sh
```

---

*Last updated: November 19, 2024*

