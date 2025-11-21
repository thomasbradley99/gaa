# Mutation Mechanism Analysis

## Current State (Basic)

### What It Does:
- ✅ 8 hardcoded strategies
- ✅ Uses Flash (fast/cheap)
- ✅ Simple instruction-based mutations
- ❌ **NO context from previous results**
- ❌ **NO reasoning about what worked**
- ❌ **NO learning from evolution**

### Quality: **2/10** (Functional but dumb)

---

## What We Need (Intelligent)

### Should Have:
- ✅ Context: Previous generation results
- ✅ Analysis: What improved? Why?
- ✅ Reasoning: Why this mutation makes sense
- ✅ Learning: Build on successful patterns
- ✅ Anti-overfitting: Stay general, avoid game-specific

### Quality: **8/10** (Intelligent and adaptive)

---

## Comparison

| Feature | Current (Basic) | Needed (Intelligent) |
|---------|----------------|---------------------|
| **Context** | ❌ None | ✅ Full evolution history |
| **Reasoning** | ❌ "Add examples" | ✅ "Add examples because X worked" |
| **Learning** | ❌ No memory | ✅ Build on winners |
| **Analysis** | ❌ Blind | ✅ Analyzes metrics (FP/FN) |
| **Explanation** | ❌ None | ✅ Logs WHY it mutated |
| **Anti-overfit** | ❌ No checks | ✅ Explicit general-only rule |

---

## Current Mutation Flow:

```
1. Pick strategy (rotation: A, B, C, D...)
2. Look up instruction ("Add examples")
3. Send to LLM: "Add examples to this prompt"
4. LLM blindly adds examples
5. Return mutated prompt

Result: Random changes, no learning
```

---

## Needed Mutation Flow:

```
1. Load all previous results (evolution history)
2. Analyze: What improved F1? Why?
3. Identify problem: Too many FPs? Too many FNs?
4. Reason: "Adding examples worked (+0.013 F1). 
            But still have FP problem (12 FPs).
            Need selectivity that targets specific FPs."
5. Generate mutation with reasoning
6. Log: Why this mutation makes sense
7. Return mutated prompt + reasoning

Result: Targeted improvements, builds on success
```

---

## The Gap

**Current:** Pattern matching ("add examples" → adds examples)

**Needed:** Reasoning engine ("examples worked, but FPs still high → add targeted selectivity")

---

## Recommendation

**Upgrade mutation engine to:**
1. Take evolution history as input
2. Use Pro model (better reasoning) with temp 0.3
3. Analyze previous results before mutating
4. Generate mutations WITH explanations
5. Log reasoning for each mutation

This turns it from a **dumb pattern matcher** into an **intelligent evolution engine**.

