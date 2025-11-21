# GAA Anadi Production Pipeline

**Goal:** Reliable Anadi XML generation from GAA (Gaelic Athletic Association) match videos with accurate cost tracking

---

## Aims

- Consistent 60%+ F1 score vs professional analysts
- Accurate cost reporting for every run
- Clean Anadi XML output
- Verified schemas and formats
- Production-ready system

---

## Current Status

**Verified 5-minute test:**
- Precision: 66.7%
- F1: 6.8% (low recall because only 5 min analyzed)
- Cost: $0.1490 (with 2.5 Pro)
- All token tracking working

**Needs:**
- Full 60-minute GAA match run to verify F1 score
- Verify output XML format matches Anadi requirements
- Optimize costs with model changes

---

## Structure

```
pipelines/production1/    - 7 working scripts with token tracking
docs/                     - Verified Google pricing and rates
schemas/                  - Event type definitions
games/kevy-game/         - Test game with ground truth
```

---

## Next Steps

1. Run full 90-minute pipeline
2. Verify XML output format
3. Confirm F1 score ≥ 60%
4. Document final costs
5. Mark as production-ready

---

**Status:** IN PROGRESS - Verified 5-min test, need full run
