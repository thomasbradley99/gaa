# Production Pipeline 1: Standard Clips

This is the original pipeline using **60-second clips with no overlap**.

## Clip Strategy
- **Clip Duration:** 60 seconds
- **Overlap:** None
- **Storage:** `clips/` directory

## Pipeline Stages

```bash
# 0.1 Download videos (reads inputs/video_source.json)
python3 0.1_download_videos.py --game {game-name}

# 0.2 Generate clips (60s, no overlap)
python3 0.2_generate_clips_and_frames.py --game {game-name}

# 0.3 Calibration (one-time per game)
python3 0.3_calibrate_game.py --game {game-name}

# 0.4 Filter ground truth to detectable events (optional)
python3 0.4_filter_to_detectable.py --game {game-name} --time-range 450-2400

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

### Video Source Config

Each game directory should contain an `inputs/video_source.json` file describing where to fetch raw footage:

```jsonc
{
  "game": "example-game",
  "title": "Example Team v Other Team",
  "downloads": [
    {
      "label": "full_match",
      "url": "https://example.com/path/to/video.mp4",
      "target": "example-game.mp4"
    }
  ]
}
```

Use `python3 0.1_download_videos.py --dry-run` to validate URLs without downloading.

## Performance

- Lower cost (fewer clips)
- Faster processing
- Good for longer segments (full half)
- May miss events at clip boundaries

## See Also

- **Production 2:** Uses 30s clips with 5s overlap for better boundary detection

