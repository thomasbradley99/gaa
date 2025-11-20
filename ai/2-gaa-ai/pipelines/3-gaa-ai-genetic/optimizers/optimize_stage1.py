#!/usr/bin/env python3
"""
Stage 1 Optimizer - Optimize video clip description prompts

Keeps Stage 2 & 3 frozen while optimizing Stage 1 only.

Usage:
    python optimizers/optimize_stage1.py --generations 5 --population 5
    python optimizers/optimize_stage1.py --test  # Quick test mode
"""

import sys
import argparse
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.mutation_engine import MutationEngine
from core.fitness_evaluator import FitnessEvaluator
from core.prompt_manager import PromptManager


def optimize_stage1(generations: int = 5, population: int = 5, test_mode: bool = False):
    """
    Optimize Stage 1 prompts using genetic algorithm
    
    Args:
        generations: Number of generations to evolve
        population: Number of variants per generation
        test_mode: If True, use Flash and simulated evaluation (fast/cheap)
    
    Returns:
        Dict with best_f1, top_3 winners, and cost
    """
    print("=" * 80)
    print("🧬 OPTIMIZING STAGE 1: VIDEO CLIP DESCRIPTIONS")
    print("=" * 80)
    print(f"Generations: {generations}")
    print(f"Population: {population}")
    print(f"Mode: {'TEST (Flash + simulated)' if test_mode else 'PRODUCTION (Pro + real pipeline)'}")
    print()
    
    # Initialize components
    model = 'gemini-2.5-flash' if test_mode else 'gemini-2.5-pro'
    engine = MutationEngine(model_name=model)
    evaluator = FitnessEvaluator()
    manager = PromptManager()
    
    # Load baseline or current winner
    try:
        base_prompt = manager.load_winner(stage=1)
        print(f"📖 Loaded current winner ({len(base_prompt)} chars)")
    except FileNotFoundError:
        try:
            base_prompt = manager.load_baseline(stage=1)
            print(f"📖 Loaded baseline ({len(base_prompt)} chars)")
        except FileNotFoundError:
            print("❌ No baseline found! Run: python core/prompt_manager.py --extract-baselines")
            return {
                'best_f1': 0.0,
                'top_3': [],
                'cost': 0.0
            }
    
    total_cost = 0.0
    best_fitness = 0.0
    best_variant = None
    all_top_variants = []
    
    # Evolution loop
    for gen in range(generations):
        print(f"\n{'─' * 80}")
        print(f"GENERATION {gen + 1}/{generations}")
        print(f"{'─' * 80}")
        
        # Generate population
        print(f"\n🧬 Generating {population} variants...")
        variants = engine.generate_population(
            base_prompt=base_prompt,
            population_size=population,
            generation=gen + 1
        )
        
        for i, v in enumerate(variants, 1):
            print(f"   {i}. {v['id']} ({v['strategy']})")
        
        # Evaluate population
        print(f"\n🧪 Evaluating population...")
        results = evaluator.evaluate_population(stage=1, variants=variants)
        
        # Track costs
        gen_cost = sum(r.get('cost', 0.0) for r in results)
        total_cost += gen_cost
        print(f"💰 Generation cost: ${gen_cost:.2f}")
        
        # Track genealogy
        manager.track_genealogy(
            generation=gen + 1,
            stage=1,
            variants=variants,
            results=results
        )
        
        # Save all variants
        for variant, result in zip(variants, results):
            manager.save_variant(
                stage=1,
                variant=variant,
                fitness=result['fitness']
            )
        
        # Get best from this generation
        gen_best = results[0]
        print(f"\n🏆 Generation winner: {gen_best['variant_id']} (F1={gen_best['fitness']:.3f})")
        
        # Track top 3 from this generation
        all_top_variants.extend(results[:3])
        
        # Update best overall
        if gen_best['fitness'] > best_fitness:
            best_fitness = gen_best['fitness']
            best_variant = gen_best['variant']
            print(f"   🎉 NEW BEST! F1: {best_fitness:.3f}")
            
            # Save as winner
            manager.save_winner(
                stage=1,
                variant=best_variant,
                fitness=best_fitness
            )
        
        # Use best from this generation as base for next
        base_prompt = gen_best['variant']['prompt']
    
    # Get top 3 overall
    all_top_variants.sort(key=lambda x: x['fitness'], reverse=True)
    top_3 = [
        {
            'variant': r['variant'],
            'fitness': r['fitness']
        }
        for r in all_top_variants[:3]
    ]
    
    # Summary
    print(f"\n{'=' * 80}")
    print(f"✅ STAGE 1 OPTIMIZATION COMPLETE")
    print(f"{'=' * 80}")
    print(f"Best F1: {best_fitness:.3f}")
    print(f"Total Cost: ${total_cost:.2f}")
    print(f"Best variant: {best_variant['id'] if best_variant else 'None'}")
    print()
    
    return {
        'best_f1': best_fitness,
        'top_3': top_3,
        'cost': total_cost,
        'best_variant': best_variant
    }


def main():
    parser = argparse.ArgumentParser(description='Optimize Stage 1 prompts')
    parser.add_argument('--generations', type=int, default=5, help='Number of generations')
    parser.add_argument('--population', type=int, default=5, help='Population size')
    parser.add_argument('--test', action='store_true', help='Test mode (Flash + simulated)')
    args = parser.parse_args()
    
    result = optimize_stage1(
        generations=args.generations,
        population=args.population,
        test_mode=args.test
    )
    
    if result['best_f1'] > 0:
        print(f"Success! Best F1: {result['best_f1']:.3f}")
    else:
        print("Optimization failed or no improvement")
        sys.exit(1)


if __name__ == "__main__":
    main()

