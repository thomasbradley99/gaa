# 3-gaa-ai-genetic: Genetic Algorithm for Prompt Optimization

Automated genetic algorithm system for optimizing the GAA AI event detection pipeline prompts.

## 🎯 Goal

Use genetic algorithms to automatically optimize the three prompt stages in the GAA AI pipeline:
- **Stage 1:** Video clip descriptions (detect events from video)
- **Stage 2:** Narrative validation (filter hallucinations)
- **Stage 3:** Event classification (extract structured codes)

**Target:** Improve F1 score from ~0.40 to >0.70

---

## 📂 Project Structure

```
3-gaa-ai-genetic/
├── README.md                    ← You are here
├── orchestrator.py              ← Master control script
│
├── core/                        ← Core genetic algorithm components
│   ├── mutation_engine.py       ← LLM-powered prompt mutations
│   ├── fitness_evaluator.py     ← Run pipeline & calculate metrics
│   ├── prompt_manager.py        ← Load/save/track prompt variants
│   ├── recombinator.py          ← Breed top prompts together
│   └── utils.py                 ← Shared utilities
│
├── optimizers/                  ← Stage-specific optimizers
│   ├── optimize_stage1.py       ← Optimize video descriptions
│   ├── optimize_stage2.py       ← Optimize narrative validation
│   ├── optimize_stage3.py       ← Optimize event classification
│   └── shared_config.py         ← Shared configuration
│
├── prompts/                     ← Prompt storage & tracking
│   ├── baselines/               ← Current baseline prompts
│   │   ├── stage1_baseline.txt
│   │   ├── stage2_baseline.txt
│   │   └── stage3_baseline.txt
│   ├── stage1/                  ← Stage 1 variants
│   │   ├── gen_001_variant_A.txt
│   │   ├── gen_001_variant_B.txt
│   │   └── ...
│   ├── stage2/                  ← Stage 2 variants
│   ├── stage3/                  ← Stage 3 variants
│   └── winners/                 ← Best performers
│       ├── stage1_best.txt
│       ├── stage2_best.txt
│       └── stage3_best.txt
│
├── experiments/                 ← Experiment tracking
│   ├── logs/                    ← Run logs per generation
│   │   ├── gen_001_stage1.json
│   │   └── ...
│   ├── metrics/                 ← Performance metrics
│   │   ├── fitness_history.csv
│   │   └── per_event_breakdown.csv
│   └── genealogy/               ← Prompt family tree
│       └── evolution_tree.json
│
├── results/                     ← Final outputs
│   ├── best_prompts/            ← Final optimized prompts
│   └── visualizations/          ← Charts & graphs
│       ├── fitness_over_time.png
│       └── stage_comparison.png
│
└── docs/                        ← Documentation
    ├── GENETIC_OPTIMIZATION_STRATEGY.md  ← Strategy & architecture
    ├── SETUP.md                          ← Setup instructions
    └── MUTATION_STRATEGIES.md            ← Mutation techniques
```

---

## 🚀 Quick Start

### 1. Setup
```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/3-gaa-ai-genetic

# Install dependencies (if needed)
pip install google-generativeai python-dotenv

# Extract baseline prompts from current pipeline
python core/prompt_manager.py --extract-baselines
```

### 2. Run Single Stage Optimization
```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/3-gaa-ai-genetic

# Optimize Stage 1 only (5 variants, 1 generation)
python3 optimizers/optimize_stage1.py --generations 1 --population 5

# Optimize Stage 2 only
python optimizers/optimize_stage2.py --generations 1 --population 5

# Optimize Stage 3 only
python optimizers/optimize_stage3.py --generations 1 --population 5
```

### 3. Run Full Genetic Algorithm
```bash
# Run the full orchestrator (isolate → recombine → repeat)
python orchestrator.py --cycles 10 --population 5
```

---

## 🧬 How It Works

### Phase 1: Isolated Optimization (Generations 0-14)
- **Gen 0-4:** Optimize Stage 1 only (Stage 2 & 3 frozen)
- **Gen 5-9:** Optimize Stage 2 only (Stage 1 & 3 frozen)
- **Gen 10-14:** Optimize Stage 3 only (Stage 1 & 2 frozen)

### Phase 2: Recombination (Generation 15)
- Collect top 3 performers from each stage
- Use LLM to breed them together
- Test hybrid combinations
- Best hybrid becomes new baseline

### Phase 3: Repeat
- Start isolation cycles again with new baseline
- Continue until convergence (F1 > 0.70 or no improvement)

---

## 📊 Fitness Function

```python
def fitness(ai_xml, ground_truth_xml):
    """
    Calculate F1 score from event detection results
    """
    precision = true_positives / (true_positives + false_positives)
    recall = true_positives / (true_positives + false_negatives)
    f1 = 2 * (precision * recall) / (precision + recall)
    return f1
```

**Target Performance:**
- Good: F1 > 0.50
- Great: F1 > 0.70

---

## 💰 Cost Estimate

### Per Test Run (10 clips, first 10 minutes):
- Stage 1: $0.26
- Stage 2: $0.02
- Stage 3: $0.02
- **Total: ~$0.31 per variant**

### Per Isolation Cycle (5 variants × 3 stages):
- 5 variants × 3 stages × $0.31 = **$4.65 per cycle**

### For 10 Full Cycles:
- 10 cycles × $4.65 = **$46.50 total**
- Plus recombination: ~$15
- **Total: ~$62 for full optimization**

---

## 🔧 Configuration

Edit `optimizers/shared_config.py` to customize:
- Population size (default: 5 variants)
- Mutation strategies
- Fitness weights
- Cost limits
- Convergence criteria

---

## 📈 Tracking Progress

### View Real-Time Metrics
```bash
# Show fitness history
python core/utils.py --show-history

# View genealogy tree
python core/utils.py --show-genealogy

# Compare stage improvements
python core/utils.py --compare-stages
```

### Experiment Logs
All runs logged to `experiments/logs/` with:
- Prompt variant used
- Fitness score (Precision, Recall, F1)
- Cost breakdown
- Timestamp
- Parent lineage

---

## 🎓 Mutation Strategies

The `mutation_engine.py` uses several intelligent strategies:

1. **Add Examples:** Insert new detection examples
2. **Remove Examples:** Simplify overly complex prompts
3. **Emphasis Shift:** Focus on specific event types (Shots vs Kickouts)
4. **Selectivity Tuning:** Adjust "be selective" vs "detect everything"
5. **Logic Changes:** Modify validation rules (Stage 2)
6. **Format Changes:** Adjust output format requirements
7. **Context Addition:** Add more GAA domain knowledge

---

## 📚 Documentation

- **Strategy:** `docs/GENETIC_OPTIMIZATION_STRATEGY.md` - Full architecture
- **Setup:** `docs/SETUP.md` - Detailed setup guide
- **Mutations:** `docs/MUTATION_STRATEGIES.md` - Mutation techniques

---

## 🎯 Success Criteria

The optimization stops when:
1. F1 score > 0.70 (target reached)
2. No improvement for 3 consecutive recombination cycles
3. Max generations reached (default: 100)
4. Cost budget exceeded

---

## 🔗 Related Projects

- **2-gaa-ai:** The production pipeline being optimized
- **1-gaa-ai:** Original pipeline (legacy)

---

## 📝 Next Steps

1. Extract baseline prompts from 2-gaa-ai
2. Implement mutation_engine.py
3. Implement fitness_evaluator.py
4. Test single stage optimization
5. Implement orchestrator.py
6. Run first full cycle
7. Monitor and iterate

---

## 🤝 Contributing

This is an experimental optimization system. Key areas for improvement:
- More sophisticated mutation strategies
- Better fitness functions (per-event weights)
- Parallel variant testing
- Cost optimization
- Visualization tools

---

**Status:** In Development 🚧

**Current Goal:** Get baseline prompts extracted and first cycle running

