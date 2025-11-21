# Video Token Calculation for Gemini 2.5 Pro

**Last Updated:** November 4, 2025  
**Model:** gemini-2.5-pro  
**Use Case:** Football match video analysis

---

## Gemini 2.5 Pro Pricing (from api costs.csv)

### Input (Video)
- **Prompts ≤ 200k tokens:** $1.25 per 1M tokens
- **Prompts > 200k tokens:** $2.50 per 1M tokens

### Output
- **Prompts ≤ 200k tokens:** $10.00 per 1M tokens
- **Prompts > 200k tokens:** $15.00 per 1M tokens

---

## How Video is Tokenized (NEED TO VERIFY)

### Google's Video Tokenization
Video input is converted to tokens based on:
1. **Frame sampling rate** (e.g., 1 frame per second)
2. **Tokens per frame** (varies by resolution)
3. **Audio transcription** (if enabled)

### Estimated Token Counts (NEED REAL DATA)

**Typical assumptions:**
- 1 video frame ≈ 258 tokens (at standard resolution)
- Gemini samples ~1 frame per second by default
- Audio adds additional tokens based on length

**For our 15-second clips:**
```
Frames: 15 seconds × 1 fps = 15 frames
Visual tokens: 15 frames × 258 tokens/frame = 3,870 tokens
Audio tokens: ~15 seconds × ~100 tokens/sec = 1,500 tokens
Text prompt: ~50 tokens
TOTAL PER CLIP: ~5,420 tokens
```

**For 90-minute game (90 clips):**
```
Total input tokens: 90 clips × 5,420 tokens = 487,800 tokens
Output tokens: 90 clips × 50 tokens = 4,500 tokens
TOTAL: 492,300 tokens
```

---

## Cost Calculation with 2.5 Pro

### Single 15-Second Clip
```python
Input: 5,420 tokens
Output: 50 tokens
Prompt size: 5,420 tokens (< 200k threshold)

Input cost:  (5,420 / 1,000,000) × $1.25 = $0.006775
Output cost: (50 / 1,000,000) × $10.00  = $0.000500
TOTAL: $0.007275 (~$0.007 per clip)
```

### Full 90-Minute Game
```python
Input: 487,800 tokens (> 200k threshold!)
Output: 4,500 tokens

Input cost:  (487,800 / 1,000,000) × $2.50 = $1.2195
Output cost: (4,500 / 1,000,000) × $15.00  = $0.0675
TOTAL: $1.287 (~$1.29 per game)
```

**⚠️ WARNING:** This crosses the 200k token threshold, so pricing jumps to higher tier!

---

## Comparison: 2.0 Flash vs 2.5 Pro

### Per 90-Minute Game

| Model | Input Cost | Output Cost | Total | vs 2.0 Flash |
|-------|------------|-------------|-------|--------------|
| **2.0 Flash** | $0.049 | $0.002 | **$0.05** | baseline |
| **2.5 Pro** | $1.220 | $0.068 | **$1.29** | **26x more** |

**2.5 Pro costs 26x more than 2.0 Flash!**

---

## How to Get EXACT Token Counts

### Method 1: Test API Call
```python
import google.generativeai as genai

# Upload a test video clip
video_file = genai.upload_file("test_clip.mp4")

# Make API call
model = genai.GenerativeModel('gemini-2.5-pro')
response = model.generate_content([video_file, "Describe this clip"])

# Check actual tokens used
print(f"Input tokens: {response.usage_metadata.prompt_token_count}")
print(f"Output tokens: {response.usage_metadata.candidates_token_count}")
print(f"Total tokens: {response.usage_metadata.total_token_count}")
```

### Method 2: Check Pipeline Logs
Look at existing runs in `outputs/*/usage_stats.json`:
```bash
cat outputs/6-with-audio-FINAL-5min/usage_stats.json
```

---

## Optimization Strategies for 2.5 Pro

### 1. Reduce Frame Sampling
- Default: 1 fps (15 frames for 15s clip)
- Reduce to: 0.5 fps (8 frames for 15s clip)
- **Token savings: ~50%**
- **Cost savings: ~50%**

### 2. Use 2.5 Pro Only for Key Moments
- Use 2.0 Flash for initial clip scanning
- Use 2.5 Pro only for complex events (goals, fouls, etc.)
- **Hybrid approach:** 80% Flash + 20% Pro
- **Estimated cost:** $0.30 per game (6x cheaper than full Pro)

### 3. Lower Video Resolution
- If possible, reduce resolution before upload
- Fewer tokens per frame
- May impact accuracy

### 4. Batch Processing
- Process multiple clips in one API call
- Reduce per-call overhead
- Stay under 200k token threshold if possible

---

## Recommended Approach

### Option A: Stick with 2.0 Flash
- **Cost:** $0.05 per game
- **Quality:** Good for most events
- **Speed:** Fast
- **Best for:** High-volume processing

### Option B: Hybrid (Flash + Pro)
- **Cost:** $0.30 per game
- **Quality:** Best of both worlds
- **Approach:** Flash for scanning, Pro for details
- **Best for:** Quality + cost balance

### Option C: Full 2.5 Pro
- **Cost:** $1.29 per game
- **Quality:** Highest accuracy
- **Best for:** Critical analysis, small batches

---

## Action Items

1. **Run test with actual video clip** to get real token counts
2. **Check existing usage_stats.json** from previous runs
3. **Decide on strategy:** Full Pro, Hybrid, or Flash-only
4. **Update cost calculations** with real data

---

## Test Script

```python
#!/usr/bin/env python3
"""Test video tokenization with 2.5 Pro"""

import os
import google.generativeai as genai
from pathlib import Path

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Test with one clip
clip_path = "path/to/clip_011m00s.mp4"
video_file = genai.upload_file(clip_path)

print(f"Uploaded: {video_file.name}")
print(f"Waiting for processing...")
video_file.wait()

# Analyze
model = genai.GenerativeModel('gemini-2.5-pro')
response = model.generate_content([
    video_file,
    "Describe what happens in this football clip in one sentence."
])

# Token usage
usage = response.usage_metadata
print(f"\n📊 Token Usage:")
print(f"   Input:  {usage.prompt_token_count:,}")
print(f"   Output: {usage.candidates_token_count:,}")
print(f"   Total:  {usage.total_token_count:,}")

# Cost
input_cost = (usage.prompt_token_count / 1_000_000) * 1.25
output_cost = (usage.candidates_token_count / 1_000_000) * 10.00
total_cost = input_cost + output_cost

print(f"\n💰 Cost (paid tier 1):")
print(f"   Input:  ${input_cost:.6f}")
print(f"   Output: ${output_cost:.6f}")
print(f"   Total:  ${total_cost:.6f}")

# Extrapolate
clips_per_game = 90
game_cost = total_cost * clips_per_game

print(f"\n🎮 Full Game Estimate:")
print(f"   Clips: {clips_per_game}")
print(f"   Total cost: ${game_cost:.2f}")
```

---

**NEXT STEP:** Run test script with actual clip to get REAL token counts!

