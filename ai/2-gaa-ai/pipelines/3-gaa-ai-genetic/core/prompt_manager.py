#!/usr/bin/env python3
"""
Prompt Manager - Load, save, and track prompt variants

Handles all prompt file I/O and genealogy tracking.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime


class PromptManager:
    """Manages prompt storage, retrieval, and genealogy tracking"""
    
    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize prompt manager
        
        Args:
            project_root: Root of 3-gaa-ai-genetic project
        """
        if project_root is None:
            project_root = Path(__file__).parent.parent
        
        self.root = project_root
        self.prompts_dir = self.root / "prompts"
        self.baselines_dir = self.prompts_dir / "baselines"
        self.winners_dir = self.prompts_dir / "winners"
        self.genealogy_file = self.root / "experiments" / "genealogy" / "evolution_tree.json"
        
        # Ensure directories exist
        for dir_path in [self.baselines_dir, self.winners_dir, self.genealogy_file.parent]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def extract_baselines(self):
        """Extract baseline prompts from 1-production pipeline scripts"""
        print("🔍 Extracting baseline prompts from pipeline...")
        
        # Use relative path (3-gaa-ai-genetic and 1-production are siblings)
        pipelines_dir = Path(__file__).parent.parent.parent  # Up to /pipelines/
        pipeline_root = pipelines_dir / "1-production"
        
        # Extract Stage 1 prompt (lines 149-207 in 1_clips_to_descriptions.py)
        stage1_file = pipeline_root / "1_clips_to_descriptions.py"
        stage1_prompt = self._extract_prompt_from_file(stage1_file, 149, 207)
        self.save_baseline(1, stage1_prompt)
        print(f"  ✅ Stage 1 baseline extracted ({len(stage1_prompt)} chars)")
        
        # Extract Stage 2 prompt (lines 103-224 in 2_create_coherent_narrative.py)
        stage2_file = pipeline_root / "2_create_coherent_narrative.py"
        stage2_prompt = self._extract_prompt_from_file(stage2_file, 103, 224)
        self.save_baseline(2, stage2_prompt)
        print(f"  ✅ Stage 2 baseline extracted ({len(stage2_prompt)} chars)")
        
        # Extract Stage 3 prompt (lines 110-206 in 3_event_classification.py)
        stage3_file = pipeline_root / "3_event_classification.py"
        stage3_prompt = self._extract_prompt_from_file(stage3_file, 110, 206)
        self.save_baseline(3, stage3_prompt)
        print(f"  ✅ Stage 3 baseline extracted ({len(stage3_prompt)} chars)")
        
        print(f"\n💾 Baselines saved to: {self.baselines_dir}")
    
    def _extract_prompt_from_file(self, file_path: Path, start_line: int, end_line: int) -> str:
        """Extract prompt text from specific lines of a Python file"""
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        # Extract the relevant lines (convert to 0-indexed)
        prompt_lines = lines[start_line-1:end_line]
        
        # TODO: Parse the actual prompt string from the Python code
        # For now, just join the lines
        return ''.join(prompt_lines)
    
    def save_baseline(self, stage: int, prompt: str):
        """Save a baseline prompt for a stage"""
        filepath = self.baselines_dir / f"stage{stage}_baseline.txt"
        filepath.write_text(prompt)
    
    def load_baseline(self, stage: int) -> str:
        """Load the baseline prompt for a stage"""
        filepath = self.baselines_dir / f"stage{stage}_baseline.txt"
        if not filepath.exists():
            raise FileNotFoundError(f"Baseline for stage {stage} not found: {filepath}")
        return filepath.read_text()
    
    def save_variant(self, stage: int, variant: Dict, fitness: float):
        """
        Save a prompt variant
        
        Args:
            stage: Stage number (1, 2, or 3)
            variant: Variant dict with 'id', 'prompt', 'generation', etc.
            fitness: Fitness score for this variant
        """
        stage_dir = self.prompts_dir / f"stage{stage}"
        stage_dir.mkdir(exist_ok=True)
        
        # Save prompt text
        prompt_file = stage_dir / f"{variant['id']}.txt"
        prompt_file.write_text(variant['prompt'])
        
        # Save metadata
        metadata_file = stage_dir / f"{variant['id']}_meta.json"
        metadata = {
            'id': variant['id'],
            'stage': stage,
            'generation': variant.get('generation', 0),
            'strategy': variant.get('strategy', 'unknown'),
            'fitness': fitness,
            'timestamp': datetime.now().isoformat()
        }
        metadata_file.write_text(json.dumps(metadata, indent=2))
    
    def save_winner(self, stage: int, variant: Dict, fitness: float):
        """Save a winning prompt"""
        filepath = self.winners_dir / f"stage{stage}_best.txt"
        filepath.write_text(variant['prompt'])
        
        # Save metadata
        meta_file = self.winners_dir / f"stage{stage}_best_meta.json"
        metadata = {
            'id': variant['id'],
            'stage': stage,
            'fitness': fitness,
            'strategy': variant.get('strategy', 'unknown'),
            'timestamp': datetime.now().isoformat()
        }
        meta_file.write_text(json.dumps(metadata, indent=2))
        
        print(f"  🏆 Winner saved: {variant['id']} (F1={fitness:.3f})")
    
    def load_winner(self, stage: int) -> str:
        """Load the current winning prompt for a stage"""
        filepath = self.winners_dir / f"stage{stage}_best.txt"
        if filepath.exists():
            return filepath.read_text()
        else:
            # Fall back to baseline if no winner yet
            return self.load_baseline(stage)
    
    def track_genealogy(self, generation: int, stage: int, variants: List[Dict], 
                       results: List[Dict]):
        """
        Track genealogy of prompt evolution
        
        Args:
            generation: Current generation number
            stage: Stage being optimized
            variants: List of variant dicts
            results: List of result dicts with fitness scores
        """
        # Load existing genealogy
        if self.genealogy_file.exists():
            with open(self.genealogy_file, 'r') as f:
                genealogy = json.load(f)
        else:
            genealogy = {'generations': []}
        
        # Add this generation
        gen_entry = {
            'generation': generation,
            'stage': stage,
            'timestamp': datetime.now().isoformat(),
            'variants': []
        }
        
        for variant, result in zip(variants, results):
            gen_entry['variants'].append({
                'id': variant['id'],
                'strategy': variant.get('strategy', 'unknown'),
                'fitness': result['fitness'],
                'metrics': result.get('metrics', {})
            })
        
        genealogy['generations'].append(gen_entry)
        
        # Save updated genealogy
        with open(self.genealogy_file, 'w') as f:
            json.dump(genealogy, f, indent=2)
    
    def get_best_fitness_history(self, stage: Optional[int] = None) -> List[Dict]:
        """Get history of best fitness scores per generation"""
        if not self.genealogy_file.exists():
            return []
        
        with open(self.genealogy_file, 'r') as f:
            genealogy = json.load(f)
        
        history = []
        for gen in genealogy['generations']:
            if stage is None or gen['stage'] == stage:
                # Find best variant in this generation
                best_variant = max(gen['variants'], key=lambda x: x['fitness'])
                history.append({
                    'generation': gen['generation'],
                    'stage': gen['stage'],
                    'fitness': best_variant['fitness'],
                    'variant_id': best_variant['id']
                })
        
        return history


def main():
    """CLI interface for prompt manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Prompt Manager')
    parser.add_argument('--extract-baselines', action='store_true',
                       help='Extract baseline prompts from pipeline')
    parser.add_argument('--show-history', action='store_true',
                       help='Show fitness history')
    args = parser.parse_args()
    
    manager = PromptManager()
    
    if args.extract_baselines:
        manager.extract_baselines()
    
    if args.show_history:
        history = manager.get_best_fitness_history()
        if history:
            print("\n📈 Fitness History:")
            for entry in history:
                print(f"  Gen {entry['generation']:3d} | Stage {entry['stage']} | "
                      f"F1={entry['fitness']:.3f} | {entry['variant_id']}")
        else:
            print("No history yet. Run optimization first.")


if __name__ == "__main__":
    main()

