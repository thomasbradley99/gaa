# Gemini 3 Pipeline Setup Summary

## What Was Done

The **gemini3** pipeline has been configured to match the **1-gaa-ai/production1** approach exactly, but using Gemini 3 Pro Preview model.

### 1. Pipeline Source
- **Copied from:** `/home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production1`
- **Updated to:** Use `gemini-3-pro-preview` model throughout

### 2. Model Updates

All AI stages now use Gemini 3 Pro Preview:

| Stage | File | Model |
|-------|------|-------|
| Calibration | `0.5_calibrate_game.py` | gemini-3-pro-preview |
| Descriptions | `1_clips_to_descriptions.py` | gemini-3-pro-preview |
| Narrative | `2_create_coherent_narrative.py` | gemini-3-pro-preview |
| Classification | `3_event_classification.py` | gemini-3-pro-preview |
| Extraction | `4_json_extraction.py` | gemini-3-pro-preview |

### 3. Approach: 1-gaa-ai Method

This pipeline uses the **proven 1-gaa-ai approach**:

✅ **Possession-based detection**
- Possession Own (with Won, Lost, Turnover)
- Possession Opp (with Won, Lost, Turnover)

✅ **Full event set (41 types)**
- Shot Own/Opp (Point, Goal, Wide, From Play, From Free)
- Kickout Own/Opp (Long, Mid, Short, Left, Centre, Right, Won, Lost)
- Turnover Won/lost (with zones: A3, M3, D3)
- Foul Awarded/Conceded

✅ **Full game analysis**
- Not limited to 10 minutes
- Entire match can be analyzed

✅ **Schema: `schema_gaa_basic_events.json`**
- Copied from 1-gaa-ai to 2-gaa-ai/schemas

### 4. Key Differences from 2-gaa-ai/production1

| Feature | gemini3 (1-gaa-ai approach) | production1 (2-gaa-ai approach) |
|---------|----------------------------|--------------------------------|
| **Event Focus** | Possession + Full events | Detectable events only |
| **Possession Events** | ✅ Yes (Possession Own/Opp) | ❌ No |
| **Scope** | Full game | First 10 minutes focus |
| **Schema** | `schema_gaa_basic_events.json` | `schema_gaa_detectable_first_10min.json` |
| **Target F1** | 60%+ | Experimental |
| **Model** | Gemini 3 Pro Preview | Gemini 2.5 Pro/Flash |

## Usage

### Run Full Pipeline

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/gemini3

# Calibrate (one-time per game)
python3 0.5_calibrate_game.py --game kilmeena-vs-cill-chomain

# Generate clips
python3 0.1_generate_clips_and_frames.py --game kilmeena-vs-cill-chomain

# Stage 1: Describe clips (e.g., first 10 clips)
python3 1_clips_to_descriptions.py --game kilmeena-vs-cill-chomain --start-clip 0 --end-clip 10

# Stage 2-7: Process and evaluate
python3 2_create_coherent_narrative.py --game kilmeena-vs-cill-chomain
python3 3_event_classification.py --game kilmeena-vs-cill-chomain
python3 4_json_extraction.py --game kilmeena-vs-cill-chomain
python3 5_export_to_anadi_xml.py --game kilmeena-vs-cill-chomain
python3 6_export_for_web.py --game kilmeena-vs-cill-chomain
python3 7_evaluate.py --game kilmeena-vs-cill-chomain
```

## Cost Expectations

Based on Gemini 3 pricing ($2/$12 per 1M tokens):

- **Calibration:** ~$0.04 (one-time)
- **90-minute match:** ~$0.80 total
  - Stage 1: ~$0.65
  - Stages 2-7: ~$0.15

## Performance Expectations

Based on 1-gaa-ai results with Gemini 2.5 Pro:
- **F1 Score:** 60%+
- **Precision:** ~66%
- **Recall:** ~55%

Gemini 3's advanced reasoning may improve these metrics.

## Rate Limits

⚠️ **Important:** Gemini 3 Pro Preview has strict rate limits:
- **50 RPM** (requests per minute)
- Processing may be slower than other models
- Calibration with 166 frames will hit rate limits

## Files Updated

1. All Python scripts in `/pipelines/gemini3/`
2. `/schemas/schema_gaa_basic_events.json` (copied from 1-gaa-ai)
3. `/docs/GOOGLE_AI_STUDIO_PRICING.md` (added gemini-3-pro-preview)
4. `/pipelines/gemini3/README.md` (new documentation)

## Next Steps

1. ✅ Pipeline configured
2. ✅ All model references updated
3. ✅ Schema copied
4. ⏭️ Ready to run on full game data
5. ⏭️ Compare results with 1-gaa-ai baseline

---

**Status:** ✅ Complete - Ready to test
**Date:** November 19, 2025


