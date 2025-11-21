# GAA AI IMPROVEMENT PLAN
**Created**: November 19, 2025  
**Goal**: Improve AI event detection from 46-53% F1 score to 75%+ F1 score

---

## 📊 CURRENT STATUS

### Performance Metrics (from latest evaluations):
**Kilmeena vs Cill Chomain** (Nov 15, 2025):
- Precision: 36.5%
- Recall: 61.4%
- F1 Score: 45.8%

**Cmull vs Castleconnor** (Nov 14, 2025):
- Precision: 45.7%
- Recall: 63.8%
- F1 Score: 53.2%

### What This Means:
- ✅ **High Recall (61-64%)**: AI catches most real events
- ❌ **Low Precision (37-46%)**: Too many false positives
- **Net Effect**: Over-detecting events, some inaccurate

---

## 🎯 ROOT CAUSES (Identified Issues)

### 1. **Unfair Evaluation Ground Truth** ⚠️ CRITICAL
**Problem**: Current evaluation uses `ground_truth_template.xml` which likely contains:
- Non-visible events (substitutions, tactical changes)
- Audio-only events (referee whistles)
- Events outside the AI's capability

**Impact**: AI is penalized for not detecting impossible events

**Files**:
- `games/cmull-vs-castleconnor/inputs/ground_truth_template.xml`
- `games/kilmeena-vs-cill-chomain/inputs/ground_truth_template.xml`

**Fix Required**:
```bash
# Create filtered ground truth with ONLY detectable events:
games/{game}/inputs/ground_truth_detectable_events.xml
```

### 2. **Possession Event Matching Too Strict**
**Problem**: Current evaluation uses:
- ±25 second tolerance for timestamps
- 30% overlap threshold for possessions

**Impact**: Valid possession detections marked as FP/FN due to timing differences

**File**: `pipelines/production2/7_evaluate.py` (line 65-66)

**Current**:
```python
TOLERANCE = 25.0  # seconds
POSSESSION_OVERLAP_THRESHOLD = 0.3  # 30%
```

### 3. **AI Pipeline Issues**
**Problem**: Analysis only covers first 10 minutes
- Missing events in 2nd half
- Incomplete score tracking

**Files**:
- Lambda: `webapp/gaa-webapp/lambda/gaa-ai-analyzer/lambda_handler_s3.py`
- Research: `pipelines/production2/0.2_generate_clips.py`

### 4. **Gemini Prompt Quality**
**Problem**: Prompts may be too generic or missing key instructions

**Files** (in order of importance):
1. `pipelines/production2/1_clips_to_descriptions.py` (Stage 1)
2. `pipelines/production2/2_create_coherent_narrative.py` (Stage 2)
3. `pipelines/production2/3_event_classification.py` (Stage 3)

---

## 📋 ACTION PLAN (Priority Order)

### PHASE 1: FIX EVALUATION (Get True Baseline) 🔴 URGENT

**Task 1.1**: Create Proper Ground Truth Files
```bash
# For each game, create:
games/{game}/inputs/ground_truth_detectable_events.xml

# Include ONLY these 4 event types:
- Possession Own
- Possession Opp  
- Kickout Own
- Kickout Opp
```

**How**:
1. Open existing `ground_truth_template.xml`
2. Filter to ONLY visible events in video
3. Remove events that require audio
4. Remove events outside video frame
5. Save as `ground_truth_detectable_events.xml`

**Verification**:
```bash
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai
python3 pipelines/production2/7_evaluate.py --game cmull-vs-castleconnor
```

**Expected**: Precision should increase to 60-70% (many "false positives" were actually correct)

---

**Task 1.2**: Adjust Evaluation Tolerance
```bash
# File: pipelines/production2/7_evaluate.py
```

**Test different tolerance values**:
```python
# Try these variations:
TOLERANCE = 30.0  # More lenient (current: 25.0)
POSSESSION_OVERLAP_THRESHOLD = 0.25  # More lenient (current: 0.3)
```

**Run evaluation with each setting to find sweet spot**

---

### PHASE 2: IMPROVE POSSESSION DETECTION 🟡 HIGH

**Task 2.1**: Review Possession Matching Logic

**Current Issue** (from timeline):
```
❌ FALSE POSITIVE at 09:00 | Possession Own
   AI:  09:00 | ID: 2
   PRO: No matching event within ±25.0s
```

**Investigation needed**:
1. Is this a real FP or did human analyst miss it?
2. Check video at 09:00 timestamp
3. Verify possession actually occurred

**File**: `pipelines/production2/7_evaluate.py` (lines 145-216)

---

**Task 2.2**: Analyze Per-Event Performance

**From Cmull game**:
```
Possession Opp:  59.3% precision, 80.0% recall → 68.1% F1 ✅ GOOD
Possession Own:  36.7% precision, 61.1% recall → 45.8% F1 ❌ NEEDS WORK
Kickout Own:     50.0% precision, 63.6% recall → 56.0% F1 ⚠️ OK
Kickout Opp:     30.0% precision, 33.3% recall → 31.6% F1 ❌ BAD
```

**Focus areas**:
1. Possession Own detection (too many FPs)
2. Kickout Opp detection (missing many)

---

### PHASE 3: EXTEND ANALYSIS TIME 🟢 MEDIUM

**Task 3.1**: Analyze Full Match (Not Just 10 Minutes)

**Current Limitation**:
```python
# Stage 0.1: Extract first 10 minutes only
# File: pipelines/production2/0.1_extract_first_10mins.py
```

**Options**:
1. **Incremental**: Analyze 20 minutes (2x clips)
2. **Full Match**: Process entire game (longer runtime)
3. **Intelligent Sampling**: Analyze critical moments only

**Cost Impact**:
- 10 mins: $0.16 per game ✅
- 20 mins: $0.32 per game
- 40 mins: $0.64 per game
- Full 60 mins: $0.96 per game

**Lambda Timeout**: Current 15 min → May need to increase to 20-25 min

---

### PHASE 4: TUNE GEMINI PROMPTS 🟢 MEDIUM

**Task 4.1**: Review Stage 1 (Clip Descriptions)

**File**: `pipelines/production2/1_clips_to_descriptions.py`

**Check for**:
- Clear instructions about possession changes
- Emphasis on scoring events
- Team color recognition accuracy

---

**Task 4.2**: Review Stage 3 (Event Classification)

**File**: `pipelines/production2/3_event_classification.py`

**Improvements needed**:
- Better shot/point/wide detection
- Clearer possession change criteria
- More specific kickout identification

---

## 🔬 EXPERIMENTAL IMPROVEMENTS

### Option A: Use Gemini 2.0 Flash Multimodal
**Current**: Gemini 2.0 Flash (text+video)
**Upgrade**: Same model but with better prompts

### Option B: Parallel Processing Optimization
**Current**: 10 clips processed in parallel
**Improvement**: Process all clips with shared context

### Option C: Add Temporal Context
**Current**: Each clip analyzed independently
**Improvement**: Pass previous clip's context to next clip

---

## 📈 SUCCESS METRICS

### Target Performance (by Feb 2025):
- **Precision**: 65%+ (reduce false positives)
- **Recall**: 70%+ (maintain high detection)
- **F1 Score**: 67%+ (balanced performance)

### Per-Event Targets:
- Possession Own: 60% F1 (from 46%)
- Possession Opp: 75% F1 (from 68%) ✅ Already good
- Kickout Own: 65% F1 (from 56%)
- Kickout Opp: 55% F1 (from 32%)

---

## 🛠️ DEVELOPMENT WORKFLOW

### Step 1: Get True Baseline
```bash
cd /home/ubuntu/clann/gaa/ai/1-gaa-ai

# 1. Create detectable ground truth XML
# 2. Run evaluation
python3 pipelines/production2/7_evaluate.py --game cmull-vs-castleconnor

# 3. Check results
cat games/cmull-vs-castleconnor/outputs/production2-20251114-1108/7_evaluation_timeline.txt
```

### Step 2: Iterative Improvement
```bash
# 1. Make prompt changes in stages/
# 2. Run pipeline on test game
python3 pipelines/production2/1_clips_to_descriptions.py --game cmull-vs-castleconnor

# 3. Evaluate
python3 pipelines/production2/7_evaluate.py --game cmull-vs-castleconnor

# 4. Compare metrics (before vs after)
```

### Step 3: Deploy to Lambda
```bash
cd /home/ubuntu/clann/gaa/webapp/gaa-webapp/lambda/gaa-ai-analyzer

# 1. Copy improved stages from research pipeline
cp /home/ubuntu/clann/gaa/ai/1-gaa-ai/pipelines/production2/stages/*.py stages/

# 2. Build and deploy Docker image
./docker-deploy.sh
```

---

## 🚀 IMMEDIATE NEXT STEPS

### This Week (Nov 19-23):

**Day 1-2: Fix Evaluation**
- [ ] Create `ground_truth_detectable_events.xml` for both games
- [ ] Re-run evaluation with proper ground truth
- [ ] Document true baseline metrics

**Day 3-4: Analyze Results**
- [ ] Review evaluation timeline manually
- [ ] Identify patterns in FP/FN events
- [ ] Check video timestamps for disputed events

**Day 5: Plan Improvements**
- [ ] Prioritize which event types to focus on
- [ ] Draft improved Gemini prompts
- [ ] Set targets for next sprint

---

## 📁 KEY FILES REFERENCE

### Research Pipeline (VM):
```
/home/ubuntu/clann/gaa/ai/1-gaa-ai/
├── pipelines/production2/
│   ├── 1_clips_to_descriptions.py      ← Stage 1 prompts
│   ├── 2_create_coherent_narrative.py  ← Stage 2 prompts
│   ├── 3_event_classification.py       ← Stage 3 prompts
│   └── 7_evaluate.py                   ← Evaluation script
├── games/
│   ├── cmull-vs-castleconnor/
│   │   ├── inputs/ground_truth_template.xml
│   │   └── outputs/production2-20251114-1108/
│   └── kilmeena-vs-cill-chomain/
│       ├── inputs/ground_truth_template.xml
│       └── outputs/production2-20251115-1638/
```

### Production Lambda (Deployed):
```
webapp/gaa-webapp/lambda/gaa-ai-analyzer/
├── lambda_handler_s3.py
└── stages/
    ├── stage_1_clips_to_descriptions.py
    ├── stage_2_create_coherent_narrative.py
    └── stage_3_event_classification.py
```

---

## 💡 NOTES

1. **Don't trust current F1 scores** - evaluation may be using unfair ground truth
2. **Start with evaluation fix** - get accurate baseline first
3. **Manual review required** - check disputed events in video
4. **Incremental improvements** - test each change thoroughly
5. **Cost awareness** - longer analysis = higher cost per game

---

**Status**: 🟡 Ready to start Phase 1  
**Next Action**: Create detectable ground truth XML files  
**Owner**: AI improvement team

