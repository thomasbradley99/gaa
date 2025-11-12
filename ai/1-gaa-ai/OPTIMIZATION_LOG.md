# Pipeline Optimization Log - Nov 6, 2025

## Summary: Testing Spatial Context and Prompt Variations

### Target: Beat 45.7% F1 Score

---

## All Runs Today (14+ minute segments):

| Run | F1 | Prec | Recall | Events | Key Changes |
|-----|-----|------|--------|--------|-------------|
| **1245** | **45.7%** | 43.5% | 48.1% | 85 | Baseline: Descriptive + attack dirs, NO extra spatial |
| 1420 | 44.9% | 45.8% | 44.0% | 72 | Similar to 1245 |
| 1659 | 40.8% | 39.7% | 41.9% | 78 | + Minimal spatial (defend left/right goal) |
| 1454 | 40.7% | 37.4% | 44.7% | 91 | + Full field position context (verbose) |
| 1637 | 39.2% | 40.3% | 38.2% | 72 | Reverted to simple (no attack dirs) |
| 1716 | 40.0% | 41.4% | 38.7% | 70 | + Attack dirs back |
| 1529 | 39.2% | 32.7% | 48.7% | 113 | Checklist approach (over-detection) |
| **1803** | **37.9%** | 37.2% | 38.7% | 78 | + Stage 2 A3 preservation + Stage 3 Pro |
| 1540 | 30.7% | 30.7% | 30.7% | 75 | Flow-based (too vague) |
| 1624 | 28.8% | 31.2% | 26.7% | 64 | No attack dirs (too simple) |

---

## Key Findings:

### 1. BEST CONFIGURATION: 45.7% F1 (Run 1245)
```
Stage 1:
- Simple descriptive observations
- Team colors + keepers + attack directions
- Absolute timestamps with focus markers
- NO extra spatial reasoning

Stage 2: 
- Conversational validation
- Bidirectional goal/kickoff logic

Stage 3:
- Flash model
- Basic extraction examples
```

### 2. FIELD POSITION CONTEXT EXPERIMENTS

**Verbose approach (1454):** 40.7% F1
- Added 40 lines of spatial reasoning
- "When camera shows right goal → you're in X half"
- Result: Detected Opp attacks but 19 more false positives

**Minimal approach (1659):** 40.8% F1  
- Just "defend right/left side goal"
- Result: Slightly better than verbose, detected 1 Opp Cross

**Conclusion:** Any spatial context beyond attack directions seems to hurt more than help

### 3. PROMPT STRUCTURE EXPERIMENTS

**Checklist (1529):** 39.2% F1, 113 events
- Listed all 24 event types for AI to detect
- Result: Over-detection, AI tried to find examples of everything

**Flow-based (1540):** 30.7% F1, 75 events
- "Describe flow of play"
- Result: Too narrative, missed discrete events

**Descriptive (current):** 37-41% F1 range
- "Describe what happens"
- Result: Best balance but variable

### 4. STAGE 3 UPGRADE EXPERIMENTS

**Run 1716 (Flash):** 40.0% F1
- Opp A3 Entry: 0 detected

**Run 1803 (Pro + examples):** 37.9% F1
- Opp A3 Entry: 1 detected (100% precision!)
- But: Overall F1 dropped 2%

**Issue:** Stage 2 still collapsing spatial details despite explicit instructions

---

## The Opponent A3 Entry Problem

**Why we can't detect them:**

1. **Stage 1** sees it: "Blue advances into White's half"
2. **Stage 2** collapses it: "Blue attacks, takes shot"
3. **Stage 3** can't extract: "attacks" is too vague

**Attempts to fix:**
- ✅ Added field position → detected 1-3 Opp events but 19 more FPs overall
- ✅ Upgraded Stage 3 to Pro → detected 1 but F1 dropped
- ✅ Added A3 examples to Stage 3 → working (100% precision on 1 detection)
- ❌ Told Stage 2 to preserve details → didn't help much

---

## Cost Impact

**Baseline (Flash everywhere):** ~$0.57 per 20 minutes
**Current (Pro Stages 1+3):** ~$0.57 per 20 minutes (Stage 3 is tiny, negligible cost increase)

---

## Current Status

**Best run overall:** 1245 at 45.7% F1
**Current pipeline:** 37-41% F1 range (variable)
**Key limitation:** Missing opponent attacking events (Opp A3, Opp Cross mostly 0%)

**Trade-off:**
- Option A: Keep simple prompts → 45% F1, miss opponent attacks
- Option B: Add spatial context → 40% F1, detect some opponent attacks

