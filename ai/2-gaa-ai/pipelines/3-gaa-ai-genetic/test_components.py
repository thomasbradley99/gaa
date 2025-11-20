#!/usr/bin/env python3
"""
Test script for genetic optimization components
Tests each component individually before running full optimization
"""

import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from core.mutation_engine import MutationEngine
from core.prompt_manager import PromptManager
from core.fitness_evaluator import FitnessEvaluator


def test_mutation_engine():
    """Test the mutation engine with a simple prompt"""
    print("=" * 80)
    print("TEST 1: MUTATION ENGINE (using Flash)")
    print("=" * 80)
    
    engine = MutationEngine(model_name='gemini-2.5-flash')
    
    # Simple test prompt
    test_prompt = """Watch this GAA clip. Report these events:

**SHOTS:** Who shoots? Outcome (Point/Goal/Wide)?
**KICKOUTS:** Direction? Distance? Outcome?
**FOULS:** Who fouled? Where?

Example:
11:25 - White shoots from 20m - POINT scored
11:42 - Black keeper kicks out LONG to CENTRE - White WINS"""
    
    print("\n📝 Original prompt:")
    print("-" * 80)
    print(test_prompt)
    print("-" * 80)
    
    # Test one mutation
    print("\n🧬 Generating mutation (strategy: add_shot_examples)...")
    mutated = engine.mutate(test_prompt, "add_shot_examples", generation=1)
    
    print("\n📝 Mutated prompt:")
    print("-" * 80)
    print(mutated)
    print("-" * 80)
    
    print(f"\n✅ Mutation successful! Length: {len(test_prompt)} → {len(mutated)} chars")
    return True


def test_prompt_manager():
    """Test the prompt manager"""
    print("\n" + "=" * 80)
    print("TEST 2: PROMPT MANAGER")
    print("=" * 80)
    
    manager = PromptManager()
    
    # Try to load baseline (may not exist yet)
    print("\n📂 Checking for baselines...")
    for stage in [1, 2, 3]:
        baseline_file = manager.baselines_dir / f"stage{stage}_baseline.txt"
        if baseline_file.exists():
            print(f"  ✅ Stage {stage} baseline exists ({baseline_file.stat().st_size} bytes)")
        else:
            print(f"  ⚠️  Stage {stage} baseline not found (run --extract-baselines)")
    
    # Test saving a variant
    print("\n💾 Testing variant save...")
    test_variant = {
        'id': 'test_variant_001',
        'prompt': 'Test prompt content',
        'generation': 1,
        'strategy': 'test_strategy'
    }
    manager.save_variant(stage=1, variant=test_variant, fitness=0.65)
    print("  ✅ Variant saved successfully")
    
    # Test genealogy tracking
    print("\n📊 Testing genealogy tracking...")
    test_variants = [test_variant]
    test_results = [{'fitness': 0.65, 'metrics': {'f1': 0.65}}]
    manager.track_genealogy(generation=1, stage=1, variants=test_variants, results=test_results)
    print("  ✅ Genealogy tracked successfully")
    
    return True


def test_fitness_evaluator():
    """Test the fitness evaluator (simulated)"""
    print("\n" + "=" * 80)
    print("TEST 3: FITNESS EVALUATOR (Simulated)")
    print("=" * 80)
    
    evaluator = FitnessEvaluator()
    
    print("\n🎮 Game:", evaluator.game_name)
    print("📁 Pipeline root:", evaluator.pipeline_root)
    print("🎯 Ground truth:", evaluator.ground_truth_path)
    
    # Test with mock variants
    print("\n🧪 Testing variant evaluation (simulated)...")
    test_variants = [
        {
            'id': 'test_baseline',
            'prompt': 'Baseline prompt',
            'generation': 1,
            'strategy': 'baseline'
        },
        {
            'id': 'test_variant_A',
            'prompt': 'Variant A prompt',
            'generation': 1,
            'strategy': 'add_examples'
        }
    ]
    
    results = evaluator.evaluate_population(stage=1, variants=test_variants)
    
    print(f"\n✅ Evaluation complete!")
    print(f"   Best: {results[0]['variant_id']} (F1={results[0]['fitness']:.3f})")
    
    return True


def test_population_generation():
    """Test generating a full population of variants"""
    print("\n" + "=" * 80)
    print("TEST 4: POPULATION GENERATION")
    print("=" * 80)
    
    engine = MutationEngine(model_name='gemini-2.5-flash')
    
    base_prompt = """Watch this GAA clip carefully.

Report SHOTS (with outcomes), KICKOUTS (with direction), FOULS."""
    
    print(f"\n🧬 Generating population of 3 variants...")
    population = engine.generate_population(
        base_prompt=base_prompt,
        population_size=3,
        generation=1
    )
    
    print(f"\n✅ Generated {len(population)} variants:")
    for i, variant in enumerate(population, 1):
        print(f"   {i}. {variant['id']} ({variant['strategy']}) - {len(variant['prompt'])} chars")
    
    return True


def main():
    """Run all tests"""
    print("\n🧪 TESTING GENETIC OPTIMIZATION COMPONENTS")
    print("Using Gemini 2.5 Flash (cheap & fast for testing)")
    print()
    
    try:
        # Test 1: Mutation Engine
        if not test_mutation_engine():
            print("❌ Mutation engine test failed")
            return False
        
        # Test 2: Prompt Manager
        if not test_prompt_manager():
            print("❌ Prompt manager test failed")
            return False
        
        # Test 3: Fitness Evaluator
        if not test_fitness_evaluator():
            print("❌ Fitness evaluator test failed")
            return False
        
        # Test 4: Population Generation
        if not test_population_generation():
            print("❌ Population generation test failed")
            return False
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80)
        print("\nNext steps:")
        print("1. Extract baselines: python core/prompt_manager.py --extract-baselines")
        print("2. Test stage optimizer: python optimizers/optimize_stage1.py --test")
        print("3. Run small optimization: python optimizers/optimize_stage1.py --generations 1 --population 3")
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

