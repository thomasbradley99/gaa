# Production Pipeline 2: Overlapping Clips

This pipeline uses **30-second clips with 5-second overlap** to provide better context for AI analysis.

## Key Differences from Production 1

### Clip Strategy
- **Production 1:** 60-second clips, no overlap
- **Production 2:** 30-second clips with 5-second overlap

### Advantages
- Shorter clips reduce hallucination per clip
- Overlap ensures events at clip boundaries aren't missed
- AI sees events from multiple angles/contexts

### Disadvantages
- More clips to process (higher cost)
- Slightly slower Stage 1

## Pipeline Stages

```bash
# 0. Calibration (one-time per game)
python3 0.5_calibrate_game.py --game {game-name}

# 0. Generate overlapping clips (30s with 5s overlap)
python3 0_generate_clips_and_frames.py --game {game-name}

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

## Performance

- Clips are stored in `clips-v2/` directory
- Each clip: 30 seconds
- Overlap: 5 seconds (25 seconds unique per clip)
- Focus time: Middle 20 seconds of each clip

## Notes

- Stage 1 prompts inform AI about clip overlap and focus time
- Evaluation compares against same ground truth as Production 1
- Cost is ~30% higher due to more clips

