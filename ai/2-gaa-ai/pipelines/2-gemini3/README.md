# Gemini 3 Pipeline: 1-gaa-ai Approach

This pipeline uses **Gemini 3 Pro Preview** (`gemini-3-pro-preview`) with the proven 1-gaa-ai approach.

## Approach

This pipeline follows the exact same methodology as **1-gaa-ai/production1**:

- **Full game analysis** (not just 10 minutes)
- **Possession-based detection** (Possession Own, Possession Opp)
- **41 detectable event types** including:
  - Possession Own/Opp (with Won, Lost, Turnover labels)
  - Shot Own/Opp (with From Play, From Free, Point, Goal, Wide)
  - Kickout Own/Opp (with Long, Mid, Short, Left, Centre, Right)
  - Turnover Won/lost
  - Foul Awarded/Conceded
- **60-second clips** with no overlap
- **Schema:** `schema_gaa_basic_events.json`

## Clip Strategy

- **Clip Duration:** 60 seconds
- **Overlap:** None
- **Storage:** `clips/` directory

## Pipeline Stages

```bash
# 0.0 Download videos (reads inputs/video_source.json)
python3 0.0_download_videos.py --game {game-name}

# 0.5 Calibration (one-time per game)
python3 0.5_calibrate_game.py --game {game-name}

# 0.1 Generate clips (60s, no overlap)
python3 0.1_generate_clips_and_frames.py --game {game-name}

# 1. Clip descriptions (parallel processing)
python3 1_clips_to_descriptions.py --game {game-name} --start-clip X --end-clip Y

# 2. Create coherent narrative
python3 2_create_coherent_narrative.py --game {game-name}

# 3. Classify events
python3 3_event_classification.py --game {game-name}

# 4. Extract JSON
python3 4_json_extraction.py --game {game-name}

# 5. Export to Anadi XML
python3 5_export_to_anadi_xml.py --game {game-name}

# 6. Export for web viewer
python3 6_export_for_web.py --game {game-name}

# 7. Evaluate
python3 7_evaluate.py --game {game-name}
```

## Model Details

- **Model:** gemini-3-pro-preview
- **Cost:** $2.00/$12.00 per 1M tokens (input/output, ≤200k prompts)
- **Cost:** $4.00/$18.00 per 1M tokens (input/output, >200k prompts)
- **Free Tier:** Not available (paid tier only)
- **Rate Limit:** 50 requests per minute (RPM)

## Expected Performance

Based on 1-gaa-ai results:
- **Target F1 Score:** 60%+
- **Precision:** ~66%
- **Recall:** ~55%

With Gemini 3's advanced reasoning, we expect similar or better performance.

## Cost Estimate

For a 90-minute GAA match:
- **Calibration:** ~$0.05 (one-time)
- **Stage 1 (Descriptions):** ~$0.65
- **Stage 2-7:** ~$0.10
- **Total:** ~$0.80 per full match

## Differences from 2-gaa-ai/production1

This pipeline is **identical** to 1-gaa-ai/production1 except:
1. Uses Gemini 3 Pro Preview instead of Gemini 2.5 Pro/Flash
2. Located in 2-gaa-ai for organizational purposes
3. Uses the proven Possession-based approach, not the experimental detectable-only approach

## See Also

- **1-gaa-ai/production1:** Original pipeline (Gemini 2.5 Pro)
- **2-gaa-ai/production1:** Experimental detectable-events-only approach
