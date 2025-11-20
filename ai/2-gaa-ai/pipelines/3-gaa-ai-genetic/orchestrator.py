#!/usr/bin/env python3
"""
Master Orchestrator for Genetic Prompt Optimization

Coordinates the full genetic algorithm cycle:
1. Optimize Stage 1 (5 generations)
2. Optimize Stage 2 (5 generations)
3. Optimize Stage 3 (5 generations)
4. Recombine top performers
5. Repeat until convergence

Usage:
    python orchestrator.py --cycles 10 --population 5
"""

import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

# Import stage optimizers
from optimizers.optimize_stage1 import optimize_stage1
from optimizers.optimize_stage2 import optimize_stage2
from optimizers.optimize_stage3 import optimize_stage3
from core.recombinator import recombine_winners
from core.utils import log_cycle, load_history


def main():
    parser = argparse.ArgumentParser(description='Genetic Algorithm Orchestrator')
    parser.add_argument('--cycles', type=int, default=10, help='Number of full cycles to run')
    parser.add_argument('--population', type=int, default=5, help='Population size per stage')
    parser.add_argument('--generations-per-stage', type=int, default=5, help='Generations per stage before recombination')
    parser.add_argument('--target-f1', type=float, default=0.70, help='Target F1 score to achieve')
    parser.add_argument('--max-cost', type=float, default=100.0, help='Maximum cost budget ($)')
    args = parser.parse_args()
    
    print("=" * 80)
    print("🧬 GENETIC PROMPT OPTIMIZATION ORCHESTRATOR")
    print("=" * 80)
    print(f"Target: F1 > {args.target_f1}")
    print(f"Budget: ${args.max_cost}")
    print(f"Cycles: {args.cycles}")
    print(f"Population: {args.population} variants per stage")
    print()
    
    total_cost = 0.0
    best_f1 = 0.0
    no_improvement_count = 0
    
    for cycle in range(args.cycles):
        print(f"\n{'=' * 80}")
        print(f"CYCLE {cycle + 1}/{args.cycles}")
        print(f"{'=' * 80}\n")
        
        # Phase 1: Optimize Stage 1
        print(f"📹 PHASE 1: Optimizing Stage 1 (Video Descriptions)...")
        stage1_result = optimize_stage1(
            generations=args.generations_per_stage,
            population=args.population
        )
        total_cost += stage1_result['cost']
        print(f"✅ Stage 1 Best F1: {stage1_result['best_f1']:.3f}")
        print()
        
        # Phase 2: Optimize Stage 2
        print(f"🧠 PHASE 2: Optimizing Stage 2 (Narrative Validation)...")
        stage2_result = optimize_stage2(
            generations=args.generations_per_stage,
            population=args.population
        )
        total_cost += stage2_result['cost']
        print(f"✅ Stage 2 Best F1: {stage2_result['best_f1']:.3f}")
        print()
        
        # Phase 3: Optimize Stage 3
        print(f"🏷️  PHASE 3: Optimizing Stage 3 (Event Classification)...")
        stage3_result = optimize_stage3(
            generations=args.generations_per_stage,
            population=args.population
        )
        total_cost += stage3_result['cost']
        print(f"✅ Stage 3 Best F1: {stage3_result['best_f1']:.3f}")
        print()
        
        # Phase 4: Recombination
        print(f"🧬 PHASE 4: Recombining top performers...")
        recombination_result = recombine_winners(
            stage1_winners=stage1_result['top_3'],
            stage2_winners=stage2_result['top_3'],
            stage3_winners=stage3_result['top_3'],
            num_hybrids=3
        )
        total_cost += recombination_result['cost']
        
        cycle_best_f1 = recombination_result['best_f1']
        print(f"✅ Recombination Best F1: {cycle_best_f1:.3f}")
        print()
        
        # Check for improvement
        if cycle_best_f1 > best_f1:
            print(f"🎉 IMPROVEMENT! F1: {best_f1:.3f} → {cycle_best_f1:.3f}")
            best_f1 = cycle_best_f1
            no_improvement_count = 0
        else:
            print(f"📊 No improvement (Best: {best_f1:.3f})")
            no_improvement_count += 1
        
        # Log cycle
        log_cycle(cycle + 1, {
            'stage1': stage1_result,
            'stage2': stage2_result,
            'stage3': stage3_result,
            'recombination': recombination_result,
            'best_f1': cycle_best_f1,
            'total_cost': total_cost
        })
        
        # Check stopping criteria
        print(f"\n💰 Total Cost: ${total_cost:.2f} / ${args.max_cost:.2f}")
        print(f"🎯 Best F1: {best_f1:.3f} / {args.target_f1:.3f}")
        print(f"📊 No improvement streak: {no_improvement_count}")
        
        # Stop if target reached
        if best_f1 >= args.target_f1:
            print(f"\n🎉 TARGET REACHED! F1 = {best_f1:.3f}")
            break
        
        # Stop if no improvement for 3 cycles
        if no_improvement_count >= 3:
            print(f"\n⏸️  CONVERGENCE: No improvement for 3 cycles")
            break
        
        # Stop if budget exceeded
        if total_cost >= args.max_cost:
            print(f"\n💸 BUDGET EXCEEDED: ${total_cost:.2f}")
            break
    
    # Final summary
    print(f"\n{'=' * 80}")
    print("🏁 OPTIMIZATION COMPLETE")
    print(f"{'=' * 80}")
    print(f"Final F1 Score: {best_f1:.3f}")
    print(f"Total Cycles: {cycle + 1}")
    print(f"Total Cost: ${total_cost:.2f}")
    print(f"Best prompts saved to: results/best_prompts/")
    print()


if __name__ == "__main__":
    main()

