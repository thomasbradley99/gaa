# Setup Guide - Genetic Prompt Optimization

## Quick Setup

### 1. Install Dependencies
```bash
pip install google-generativeai python-dotenv
```

### 2. Extract Baseline Prompts
Extract the current prompts from the production pipeline:

```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/3-gaa-ai-genetic
python3 core/prompt_manager.py --extract-baselines
```

This will create:
- `prompts/baselines/stage1_baseline.txt`
- `prompts/baselines/stage2_baseline.txt`
- `prompts/baselines/stage3_baseline.txt`

### 3. Test Individual Components

Test mutation engine:
```bash
python3 core/mutation_engine.py
```

Test fitness evaluator:
```bash
python3 core/fitness_evaluator.py
```

Test prompt manager:
```bash
python3 core/prompt_manager.py --show-history
```

### 4. Run First Optimization Cycle

Start with a single stage to test:
```bash
python3 optimizers/optimize_stage1.py --generations 1 --population 3
```

### 5. Run Full Orchestrator

Once components are working:
```bash
python3 orchestrator.py --cycles 3 --population 5
```

---

## Project Structure Created

```
3-gaa-ai-genetic/
├── core/                        ✅ Core genetic algorithm components
│   ├── mutation_engine.py       ✅ LLM-powered prompt mutations
│   ├── fitness_evaluator.py     ✅ Run pipeline & calculate metrics
│   ├── prompt_manager.py        ✅ Load/save/track prompt variants
│   ├── recombinator.py          ⏳ TODO: Breed top prompts
│   └── utils.py                 ⏳ TODO: Shared utilities
│
├── optimizers/                  ⏳ TODO: Stage-specific optimizers
│   ├── optimize_stage1.py       ⏳ Optimize video descriptions
│   ├── optimize_stage2.py       ⏳ Optimize narrative validation
│   ├── optimize_stage3.py       ⏳ Optimize event classification
│   └── shared_config.py         ⏳ Shared configuration
│
├── prompts/                     ✅ Prompt storage
│   ├── baselines/               ✅ Will hold baseline prompts
│   ├── stage1/                  ✅ Will hold Stage 1 variants
│   ├── stage2/                  ✅ Will hold Stage 2 variants
│   ├── stage3/                  ✅ Will hold Stage 3 variants
│   └── winners/                 ✅ Will hold best performers
│
├── experiments/                 ✅ Experiment tracking
│   ├── logs/                    ✅ Run logs per generation
│   ├── metrics/                 ✅ Performance metrics
│   └── genealogy/               ✅ Prompt family tree
│
├── results/                     ✅ Final outputs
│   ├── best_prompts/            ✅ Final optimized prompts
│   └── visualizations/          ✅ Charts & graphs
│
├── docs/                        ✅ Documentation
│   ├── GENETIC_OPTIMIZATION_STRATEGY.md  ✅ Strategy & architecture
│   └── SETUP.md                          ✅ This file
│
├── README.md                    ✅ Project overview
└── orchestrator.py              ✅ Master control script
```

---

## Next Steps

### Immediate (to make it runnable):
1. ⏳ Implement `optimize_stage1.py` (uses mutation_engine + fitness_evaluator)
2. ⏳ Implement `optimize_stage2.py` (same pattern)
3. ⏳ Implement `optimize_stage3.py` (same pattern)
4. ⏳ Implement `recombinator.py` (breeds top prompts)
5. ⏳ Implement `utils.py` (logging, visualization helpers)

### Integration (connect to real pipeline):
1. ⏳ Make `fitness_evaluator._inject_prompt()` actually modify pipeline files
2. ⏳ Make `fitness_evaluator._run_pipeline()` actually execute pipeline stages
3. ⏳ Make `fitness_evaluator._load_metrics()` parse real evaluation output
4. ⏳ Make `prompt_manager._extract_prompt_from_file()` properly parse Python strings

### Testing:
1. ⏳ Test with 1 clip only (super cheap, fast iteration)
2. ⏳ Test full cycle with 10 clips
3. ⏳ Run overnight optimization

---

## Component Details

### Mutation Engine
- Uses Gemini 2.5 Flash to generate prompt variants
- 8 mutation strategies (add examples, change emphasis, etc.)
- Creative temperature (0.7) for diversity

### Fitness Evaluator
- Runs full pipeline (stages 1-7)
- Compares AI output vs ground truth XML
- Returns Precision, Recall, F1 scores
- Tracks cost per variant

### Prompt Manager
- Extracts baseline prompts from pipeline
- Saves variants with metadata
- Tracks genealogy (family tree)
- Provides winner history

### Orchestrator
- Coordinates 3-stage optimization
- Runs recombination every 5 cycles
- Checks convergence criteria
- Budget management

---

## Cost Management

### Test Mode (1 clip):
- ~$0.03 per variant (super cheap for testing)
- 5 variants × 3 stages = $0.45 per cycle

### Production Mode (10 clips):
- ~$0.31 per variant
- 5 variants × 3 stages = $4.65 per cycle
- 10 cycles + recombination = ~$62 total

### Budget Controls
```bash
# Set max budget
python orchestrator.py --max-cost 50.0

# Smaller population (faster/cheaper)
python orchestrator.py --population 3
```

---

## Troubleshooting

### "No baseline prompts found"
```bash
python3 core/prompt_manager.py --extract-baselines
```

### "Pipeline execution failed"
Check that 1-production pipeline is working:
```bash
cd /home/ubuntu/clann/gaa/ai/2-gaa-ai/pipelines/1-production
python3 1_clips_to_descriptions.py --game kilmeena-vs-cill-chomain --start-clip 0 --end-clip 0
```

### "API quota exceeded"
Check Gemini API usage:
- Gemini 2.5 Pro: 2M tokens/day (free tier) or unlimited (paid)
- Optimize in smaller batches

---

## Configuration

Edit `optimizers/shared_config.py`:
```python
# Population size
POPULATION_SIZE = 5

# Mutation strategies to use
ENABLED_MUTATIONS = [
    "add_shot_examples",
    "emphasize_selectivity",
    # ... etc
]

# Fitness function weights
FITNESS_WEIGHTS = {
    'precision': 0.3,
    'recall': 0.5,
    'f1': 0.2
}

# Cost limits
MAX_COST_PER_VARIANT = 0.50
```

---

## Monitoring

### View Progress
```bash
# Show fitness history
python3 core/prompt_manager.py --show-history

# View genealogy
cat experiments/genealogy/evolution_tree.json

# Check latest results
ls -lt experiments/logs/
```

### Real-time Logs
The orchestrator prints progress:
```
═══════════════════════════════════════════════════
CYCLE 1/10
═══════════════════════════════════════════════════

📹 PHASE 1: Optimizing Stage 1 (Video Descriptions)...
  🧪 Testing gen_001_variant_A...
  📊 Population Results:
    1. ✅ gen_001_variant_C: F1=0.652
    2. ✅ gen_001_variant_A: F1=0.628
    3. ✅ gen_001_baseline: F1=0.600
✅ Stage 1 Best F1: 0.652
```

---

## Success Criteria

Optimization stops when:
1. **Target reached:** F1 > 0.70
2. **Convergence:** No improvement for 3 cycles
3. **Budget:** Total cost exceeds limit
4. **Max generations:** Reached generation limit

---

## Files to Implement Next

Priority order:
1. `optimizers/optimize_stage1.py` - Test stage 1 optimization
2. `core/utils.py` - Logging and helpers
3. `optimizers/optimize_stage2.py` - Add stage 2
4. `optimizers/optimize_stage3.py` - Add stage 3
5. `core/recombinator.py` - Breed winners
6. Integration with real pipeline execution

Ready to start implementing! 🚀

