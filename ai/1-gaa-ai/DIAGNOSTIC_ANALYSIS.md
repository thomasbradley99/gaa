# 🔍 Diagnostic Analysis: Where Are We Losing Events?

**Date:** November 5th, 2024  
**Test Run:** 6-with-audio-20251105-1634  
**Clips Analyzed:** 11:00-20:00 (10 clips)

---

## 📊 Summary

**31 events missed by AI**

After analyzing observations and narrative:
- ❌ **~80% NOT DESCRIBED AT ALL** in Stage 1 observations
- ⚠️ **~20% DESCRIBED but NOT CLASSIFIED** in Stage 3

**The problem is primarily in Stage 1 (Clip Analysis)**

---

## 🔬 Detailed Examples

### Example 1: 11:48 - Opp Regain Won ⚠️ PARTIAL

**Professional Event:** Blue team regains possession at 11:48

**Stage 1 Observations (clip_011m00s.mp4):**
```
0:51 - A Blue player in the midfield controls the ball and begins to move forward.
0:56 - A White player intercepts a pass outside their penalty area.
```

**Stage 2 Narrative:**
```
0:51 - The Blue team gains possession in the midfield and starts an attack.
```

**Analysis:**
- ✅ AI sees possession change
- ❌ Not explicitly identified as "Regain Won"
- ⚠️ Timing slightly off (0:51 vs 0:48 expected)

---

### Example 2: 12:01 - Opp Cross ❌ MISSING

**Professional Event:** Blue team crosses at 12:01

**Stage 1 Observations (clip_012m00s.mp4):**
```
0:00 - The Blue team is setting up for a free kick in their attacking third.
0:33 - A Blue player takes the free kick, sending the ball towards the goal.
0:35 - A White defender heads the ball away from the goal.
```

**Stage 2 Narrative:**
```
0:00 - The Blue team sets up for a free kick in their attacking third.
0:33 - The Blue player takes the free kick towards the goal.
0:35 - A White defender heads the ball away, ending the immediate threat.
```

**Analysis:**
- ❌ No cross mentioned at 0:01 (12:01)
- AI focuses on free kick at 0:33 instead
- **Event completely invisible to AI**

---

### Example 3: 12:33 - Opp Corner ❌ MISSING

**Professional Event:** Blue team corner kick at 12:33

**Stage 1 Observations (clip_012m00s.mp4):**
```
0:32 - The referee blows the whistle to signal the restart.
0:33 - A Blue player takes the free kick, sending the ball towards the goal.
0:35 - A White defender heads the ball away from the goal.
```

**Stage 2 Narrative:**
```
0:33 - The Blue player takes the free kick towards the goal.
0:35 - A White defender heads the ball away, ending the immediate threat.
```

**Analysis:**
- ❌ AI thinks it's a free kick, NOT a corner
- Professional tagger marked it as a corner
- **Misidentification of event type**

---

### Example 4: 14:44-14:45 - Opp Cross + Shot ❌ MISSING

**Professional Events:** Blue crosses at 14:44, Blue shoots at 14:45

**Stage 1 Observations (clip_014m00s.mp4):**
```
0:41 - The White team recovers the loose ball and maintains possession in the attacking half.
0:48 - A White player on the right wing delivers a cross into the penalty area.
0:51 - A White player in the box attempts a header at goal.
0:52 - The header goes wide of the goal.
```

**Stage 2 Narrative:**
```
0:48 - The White team regains possession and delivers a cross into the box.
0:51 - **INFERRED EVENT:** A White player attempts a header at goal, but it goes wide.
```

**Analysis:**
- ❌ AI sees WHITE crossing/shooting, not Blue
- Professional says Blue crossed and shot at 0:44-0:45
- **Complete miss - wrong team or wrong time**

---

## 📈 Event Type Breakdown

### Missed Event Categories:

**1. Regain Won (15 missed) - PARTIALLY OBSERVED**
- AI describes possession changes: "team gains possession", "intercepts", "wins the ball"
- But doesn't explicitly classify as "Regain Won"
- **Fix:** Teach Stage 3 to recognize possession change language as "Regain Won"

**2. Crosses (4 missed) - NOT OBSERVED**
- AI completely misses these crosses
- Might confuse with passes or other actions
- **Fix:** Improve Stage 1 prompt to better identify crosses

**3. Corners (1 missed) - MISIDENTIFIED**
- AI called it a "free kick" instead of "corner"
- **Fix:** Better set-piece identification in Stage 1

**4. A3 Entry (3 missed) - NOT OBSERVED**
- Attacking third entry is subtle - hard to detect visually
- **Fix:** Infer from "team advances into attacking third" language

**5. Throw-ins (1 missed) - NOT OBSERVED**
- Throw-in at 17:10 completely missed
- **Fix:** Better sideline event detection

**6. Shots (1 missed) - NOT OBSERVED**
- Shot at 14:45 not seen
- **Fix:** Better shooting action detection

**7. Fouls (1 missed) - NOT OBSERVED**
- Foul at 17:47 not detected
- **Fix:** Better referee whistle / foul detection

**8. Free Kicks (1 missed) - NOT OBSERVED**
- Free kick at 18:37 missed
- **Fix:** Related to foul detection

---

## 🎯 Root Cause Analysis

### Stage 1 (Observations) - **PRIMARY PROBLEM**

**Issues:**
1. **Missing visual events** - AI doesn't see ~25 of 31 missed events
2. **Wrong event type** - Confuses corners with free kicks
3. **Timing inconsistencies** - Events off by 3-10 seconds
4. **Generic descriptions** - Says "gains possession" instead of "Regain Won"

**Why this happens:**
- Gemini Pro video analysis isn't granular enough
- Prompt doesn't explicitly ask for ALL event types
- 60-second clips make precise timing hard
- No explicit instructions to identify possession changes as events

### Stage 2 (Narrative) - **MINIMAL IMPACT**

**Issues:**
- Mostly just summarizes Stage 1
- Doesn't add many new insights
- Doesn't fix Stage 1 misses

**Why this is OK:**
- Stage 2 is designed for coherence, not new detection
- Can't infer events that weren't observed

### Stage 3 (Classification) - **MINOR PROBLEM**

**Issues:**
- Doesn't recognize possession change language as "Regain Won"
- Could be more aggressive in inferring events from context

---

## 💡 Optimization Priorities

### 🔥 Priority 1: Fix Stage 1 Observations (CRITICAL)

**Target: Detect 15+ more events**

1. **Enhance prompt for "Regain Won"**
   - Explicitly ask: "When does possession change hands?"
   - "Who intercepts, tackles, or wins the ball?"

2. **Better cross detection**
   - Ask: "Are there any crosses (balls delivered from wide areas into the box)?"

3. **Set-piece identification**
   - Clearly distinguish: corners, free kicks, throw-ins, goal kicks

4. **Temporal precision**
   - Ask for exact timestamps when events occur

**Potential gain:** +20% recall (29.5% → 50%+)

---

### 🔶 Priority 2: Improve Stage 3 Classification

**Target: Reduce false positives, better inference**

1. **Possession change → Regain Won mapping**
   - If narrative says "team intercepts" or "wins the ball" → classify as "Regain Won"

2. **Context-based inference**
   - Free kick → likely preceded by foul
   - Goal kick → likely preceded by shot or cross

3. **Stricter validation**
   - Remove impossible sequences (e.g., two kickoffs in a row)

**Potential gain:** +10% precision, +5% recall

---

### 🔷 Priority 3: Test at Scale

**Validate improvements on longer segments**

1. Run optimized pipeline on 20-30 minutes
2. Measure if improvements hold at scale
3. Check for new failure modes

---

## 📝 Next Steps

1. **Rewrite Stage 1 prompt** with explicit event type questions
2. **Test on same 10 clips** to compare before/after
3. **Enhance Stage 3** to map possession language to "Regain Won"
4. **Re-evaluate** and measure improvement
5. **Scale to full half** if improvements are significant

---

**Expected Improvement:**
- **Recall:** 29.5% → 50-55% (+20-25 points)
- **Precision:** 36.1% → 45-50% (+10-15 points)
- **F1 Score:** 32.5% → 47-52% (+15-20 points)

