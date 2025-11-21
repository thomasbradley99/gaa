# Google AI Studio Pricing & Rates

**Last Updated:** November 4, 2025  
**Source:** Google AI Studio Pricing Page  
**Data Retrieved:** November 4, 2025

---

## Gemini 2.0 Flash (Recommended for Our Pipeline)

**Model Name:** `gemini-2.0-flash`

### Pricing (USD per 1M tokens)
- **Input (text/image/video):** $0.10
- **Input (audio):** $0.70
- **Output:** $0.40
- **Context caching (text/image/video):** $0.025
- **Context caching (audio):** $0.175

### Free Tier
- **Input:** Free of charge
- **Output:** Free of charge
- **Context caching:** Free of charge
- **Rate Limits (Free Tier):**
  - RPM: 2,000 requests per minute
  - TPM: 4,000,000 tokens per minute
  - RPD: Unlimited requests per day

### Notes
- 1M token context window
- Built for the era of Agents
- Most balanced multimodal model

---

## Gemini 2.0 Flash Experimental

**Model Name:** `gemini-2.0-flash-exp`

### Free Tier Rate Limits
- **RPM:** 10 requests per minute
- **TPM:** 250,000 tokens per minute
- **RPD:** 500 requests per day

### Notes
- Experimental version with stricter limits
- Free tier only (no paid tier pricing listed)
- Lower rate limits than stable version

---

## Gemini 2.5 Flash

**Model Name:** `gemini-2.5-flash`

### Pricing (USD per 1M tokens)
- **Input (text/image/video):** $0.30
- **Input (audio):** $1.00
- **Output (including thinking tokens):** $2.50
- **Context caching (text/image/video):** $0.03
- **Context caching (audio):** $0.10

### Free Tier
- **Input:** Free of charge
- **Output:** Free of charge
- **Rate Limits (Free Tier):**
  - RPM: 1,000 requests per minute
  - TPM: 1,000,000 tokens per minute
  - RPD: 10,000 requests per day

### Notes
- First hybrid reasoning model
- 1M token context window
- Has thinking budgets

---

## Gemini 2.5 Pro

**Model Name:** `gemini-2.5-pro`

### Pricing (USD per 1M tokens)
- **Input (prompts ≤ 200k tokens):** $1.25
- **Input (prompts > 200k tokens):** $2.50
- **Output (prompts ≤ 200k tokens):** $10.00
- **Output (prompts > 200k tokens):** $15.00
- **Context caching (≤ 200k):** $0.125
- **Context caching (> 200k):** $0.25

### Free Tier
- **Input:** Free of charge
- **Output:** Free of charge
- **Rate Limits (Free Tier):**
  - RPM: 150 requests per minute
  - TPM: 2,000,000 tokens per minute
  - RPD: 10,000 requests per day

### Notes
- State-of-the-art multipurpose model
- Excels at coding and complex reasoning
- Most expensive model

---

## Gemini 2.5 Flash-Lite

**Model Name:** `gemini-2.5-flash-lite`

### Pricing (USD per 1M tokens)
- **Input (text/image/video):** $0.10
- **Input (audio):** $0.30
- **Output (including thinking tokens):** $0.40
- **Context caching (text/image/video):** $0.01
- **Context caching (audio):** $0.03

### Free Tier
- **Input:** Free of charge
- **Output:** Free of charge
- **Rate Limits (Free Tier):**
  - RPM: 4,000 requests per minute
  - TPM: 4,000,000 tokens per minute
  - RPD: Unlimited requests per day

### Notes
- Smallest and most cost-effective
- Built for at-scale usage
- Same price as 2.0 Flash-Lite

---

## Usage Calculation Functions

### Python Implementation

```python
def calculate_cost(input_tokens, output_tokens, model="gemini-2.0-flash", 
                   input_type="text", has_audio=False):
    """
    Calculate cost for Gemini API call.
    
    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        model: Model name
        input_type: "text", "video", "image", or "audio"
        has_audio: True if video contains audio
    
    Returns:
        Cost in USD (0.0 if free tier)
    """
    
    # Pricing table (paid tier only - free tier = $0)
    pricing = {
        "gemini-2.0-flash": {
            "input_text": 0.10 / 1_000_000,
            "input_audio": 0.70 / 1_000_000,
            "output": 0.40 / 1_000_000
        },
        "gemini-2.5-flash": {
            "input_text": 0.30 / 1_000_000,
            "input_audio": 1.00 / 1_000_000,
            "output": 2.50 / 1_000_000
        },
        "gemini-2.5-flash-lite": {
            "input_text": 0.10 / 1_000_000,
            "input_audio": 0.30 / 1_000_000,
            "output": 0.40 / 1_000_000
        },
        "gemini-2.5-pro": {
            "input_small": 1.25 / 1_000_000,  # <= 200k tokens
            "input_large": 2.50 / 1_000_000,  # > 200k tokens
            "output_small": 10.00 / 1_000_000,
            "output_large": 15.00 / 1_000_000
        }
    }
    
    # Free tier - return $0
    # (Note: In production, check if user is on free vs paid tier)
    is_free_tier = True  # TODO: Check actual tier
    if is_free_tier:
        return 0.0
    
    # Paid tier calculation
    rates = pricing.get(model)
    if not rates:
        raise ValueError(f"Unknown model: {model}")
    
    # Calculate input cost
    if model == "gemini-2.5-pro":
        # Pro has different pricing for large prompts
        if input_tokens > 200_000:
            input_cost = input_tokens * rates["input_large"]
        else:
            input_cost = input_tokens * rates["input_small"]
    else:
        # Other models: check if audio
        if has_audio or input_type == "audio":
            input_cost = input_tokens * rates["input_audio"]
        else:
            input_cost = input_tokens * rates["input_text"]
    
    # Calculate output cost
    if model == "gemini-2.5-pro":
        if input_tokens > 200_000:
            output_cost = output_tokens * rates["output_large"]
        else:
            output_cost = output_tokens * rates["output_small"]
    else:
        output_cost = output_tokens * rates["output"]
    
    return input_cost + output_cost


def estimate_pipeline_cost(game_duration_minutes=90, model="gemini-2.0-flash"):
    """
    Estimate cost for full pipeline run.
    
    Args:
        game_duration_minutes: Length of game
        model: Model to use
    
    Returns:
        Estimated cost in USD
    """
    
    # Assumptions for our pipeline (video + audio)
    clips = game_duration_minutes  # 1 clip per minute
    
    # Stage 1: Clip analysis (largest cost)
    # Video tokens ~1250 per clip, output ~50 per clip
    stage1_input = clips * 1250
    stage1_output = clips * 50
    
    # Stage 2-4: Text processing (narrative, classification, extraction)
    # ~10,000 tokens total input, ~5,000 output
    stage234_input = 10_000
    stage234_output = 5_000
    
    total_input = stage1_input + stage234_input
    total_output = stage1_output + stage234_output
    
    cost = calculate_cost(total_input, total_output, model, has_audio=True)
    
    return {
        "total_cost": cost,
        "per_minute": cost / game_duration_minutes,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_tokens": total_input + total_output
    }
```

---

## Example Calculations

### Single Clip (1 minute, with audio)
**Model:** gemini-2.0-flash

- Input tokens: 1,250 (video + audio)
- Output tokens: 50
- **Free tier cost:** $0.00
- **Paid tier cost:** $0.000145 (~$0.00014)

### Full 90-Minute Game
**Model:** gemini-2.0-flash

- Clips analyzed: 90
- Stage 1 input: 112,500 tokens
- Stage 1 output: 4,500 tokens
- Stages 2-4 input: 10,000 tokens
- Stages 2-4 output: 5,000 tokens
- **Total input:** 122,500 tokens
- **Total output:** 9,500 tokens
- **Free tier cost:** $0.00
- **Paid tier cost:** $0.0160 (~$0.02)

### Comparison Across Models (90-min game, paid tier)

| Model | Input Cost | Output Cost | Total Cost |
|-------|------------|-------------|------------|
| **2.0 Flash** | $0.0122 | $0.0038 | **$0.0160** |
| 2.5 Flash-Lite | $0.0122 | $0.0038 | **$0.0160** |
| 2.5 Flash | $0.0368 | $0.0238 | **$0.0606** |
| 2.5 Pro | $0.1531 | $0.0950 | **$0.2481** |

**Recommendation:** Use **gemini-2.0-flash** - best balance of cost and quality.

---

## Our Current Usage (from api rates.csv)

**Last 28 days peak usage:**
- gemini-2.5-flash: 28 RPM / 82.9K TPM / 75 RPD
- gemini-2.5-pro: 5 RPM / 74.26K TPM / 7 RPD
- gemini-2.5-flash-lite: 19 RPM / 15.02K TPM / 19 RPD

**We are well within free tier limits!**

---

## Important Notes

### Free Tier Benefits
- Currently on **FREE TIER** for all models
- No charges for input or output tokens
- Rate limits are generous enough for our pipeline
- Only pay if we explicitly upgrade to paid tier

### When Would We Need Paid Tier?
- Processing > 2,000 games per day (gemini-2.0-flash limit)
- Need faster rate limits
- Want guaranteed uptime/SLA

### Rate Limit Strategy
- **gemini-2.0-flash:** Best choice (2K RPM, unlimited daily)
- Avoid **gemini-2.0-flash-exp:** Only 10 RPM, 500 RPD (too restrictive)
- **gemini-2.5-flash-lite:** Good backup (4K RPM, unlimited daily)

---

**STATUS:** ✅ COMPLETE - Real pricing data from Google
**CURRENT COST:** $0.00 (Free tier)
**PAID TIER COST (90-min game):** ~$0.02 with gemini-2.0-flash
