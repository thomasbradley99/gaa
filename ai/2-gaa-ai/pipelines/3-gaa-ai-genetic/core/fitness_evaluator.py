#!/usr/bin/env python3
"""
Fitness Evaluator - Runs REAL pipeline and calculates fitness metrics

This connects to the actual 2-gaa-ai pipeline:
1. Injects prompt variants into stage files
2. Runs the pipeline stages
3. Loads real evaluation metrics
4. Returns real F1 scores
"""

import subprocess
import json
import re
import shutil
from pathlib import Path
from typing import Dict, List
import xml.etree.ElementTree as ET
from datetime import datetime


class FitnessEvaluator:
    """Evaluates prompt fitness by running REAL pipeline and comparing results"""
    
    def __init__(self, game_name: str = "kilmeena-vs-cill-chomain", num_clips: int = 10):
        """
        Initialize evaluator
        
        Args:
            game_name: Name of game to test on (must have ground truth)
            num_clips: Number of clips to process (10 = first 10 minutes)
        """
        self.game_name = game_name
        self.num_clips = num_clips
        
        # Use relative paths (3-gaa-ai-genetic and 1-production are siblings)
        pipelines_dir = Path(__file__).parent.parent.parent  # Up to /pipelines/
        self.pipeline_root = pipelines_dir / "1-production"
        self.game_root = pipelines_dir.parent / "games" / game_name
        self.ground_truth_path = self.game_root / "inputs" / "ground_truth_detectable_first_10min.xml"
        
        # Stage file paths
        self.stage_files = {
            1: self.pipeline_root / "1_clips_to_descriptions.py",
            2: self.pipeline_root / "2_create_coherent_narrative.py",
            3: self.pipeline_root / "3_event_classification.py"
        }
        
        # Backup originals
        self.backup_dir = Path("/tmp/gaa_ai_backups")
        self.backup_dir.mkdir(exist_ok=True)
    
    def evaluate_variant(self, stage: int, prompt: str, variant_id: str) -> Dict:
        """
        Evaluate a single prompt variant by running REAL pipeline
        
        Args:
            stage: Which stage (1, 2, or 3)
            prompt: Prompt text to test
            variant_id: Unique identifier for this variant
        
        Returns:
            Dict with fitness metrics and metadata
        """
        print(f"  🧪 Testing {variant_id}...", flush=True)
        
        try:
            # 1. Backup original file
            self._backup_stage_file(stage)
            
            # 2. Inject prompt into stage file
            self._inject_prompt(stage, prompt)
            
            # 3. Run pipeline (stages based on what changed)
            cost = self._run_pipeline(stage)
            
            # 4. Load evaluation metrics from real output
            metrics = self._load_real_metrics()
            
            # 5. Calculate fitness
            fitness = self._calculate_fitness(metrics)
            
            # 6. Restore original file
            self._restore_stage_file(stage)
            
            print(f"    ✅ F1={fitness:.3f} (P={metrics['precision']:.2f}, R={metrics['recall']:.2f})")
            
            return {
                'variant_id': variant_id,
                'stage': stage,
                'fitness': fitness,
                'metrics': metrics,
                'cost': cost,
                'success': True
            }
        
        except Exception as e:
            print(f"    ❌ Error: {e}")
            # Make sure we restore the file even on error
            try:
                self._restore_stage_file(stage)
            except:
                pass
            
            return {
                'variant_id': variant_id,
                'stage': stage,
                'fitness': 0.0,
                'metrics': {},
                'cost': 0.0,
                'success': False,
                'error': str(e)
            }
    
    def _backup_stage_file(self, stage: int):
        """Backup the original stage file"""
        original = self.stage_files[stage]
        backup = self.backup_dir / f"stage{stage}_backup.py"
        shutil.copy2(original, backup)
    
    def _restore_stage_file(self, stage: int):
        """Restore the original stage file from backup"""
        backup = self.backup_dir / f"stage{stage}_backup.py"
        original = self.stage_files[stage]
        if backup.exists():
            shutil.copy2(backup, original)
    
    def _inject_prompt(self, stage: int, prompt: str):
        """
        Inject prompt into the appropriate stage file
        
        This modifies the Python file to use the new prompt.
        """
        stage_file = self.stage_files[stage]
        
        # Read the file
        with open(stage_file, 'r') as f:
            content = f.read()
        
        # The prompt is embedded in the Python code as a string
        # We need to replace it carefully
        
        if stage == 1:
            # Stage 1: prompt is in the analyze_single_clip function
            # Look for: prompt = f"""..."""
            # We need to preserve the f-string variables
            
            # Find the prompt assignment
            pattern = r'(prompt = f""")(.*?)(""")'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                # Replace the prompt content while keeping f-string wrapper
                new_content = content[:match.start(2)] + prompt + content[match.end(2):]
                
                with open(stage_file, 'w') as f:
                    f.write(new_content)
            else:
                raise ValueError(f"Could not find prompt in stage {stage} file")
        
        elif stage == 2:
            # Stage 2: prompt is in _build_stage2_prompt function
            pattern = r'(return f""")(.*?)(""")'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                new_content = content[:match.start(2)] + prompt + content[match.end(2):]
                with open(stage_file, 'w') as f:
                    f.write(new_content)
            else:
                raise ValueError(f"Could not find prompt in stage {stage} file")
        
        elif stage == 3:
            # Stage 3: prompt is in _build_stage3_prompt function
            pattern = r'(return f""")(.*?)(""")'
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                new_content = content[:match.start(2)] + prompt + content[match.end(2):]
                with open(stage_file, 'w') as f:
                    f.write(new_content)
            else:
                raise ValueError(f"Could not find prompt in stage {stage} file")
    
    def _run_pipeline(self, stage: int) -> float:
        """
        Run the pipeline stages
        
        Args:
            stage: Which stage was modified (determines what to run)
        
        Returns:
            Cost in dollars
        """
        print(f"    🚀 Running pipeline...", flush=True)
        
        # Determine which stages to run
        if stage == 1:
            # Modified stage 1: run 1-7
            stages_to_run = [
                (1, f"python3 1_clips_to_descriptions.py --game {self.game_name} --start-clip 0 --end-clip {self.num_clips - 1}"),
                (2, f"python3 2_create_coherent_narrative.py --game {self.game_name}"),
                (3, f"python3 3_event_classification.py --game {self.game_name}"),
                (4, None),  # Auto-runs from stage 3
                (5, None),  # Auto-runs from stage 3
                (7, f"python3 7_evaluate.py --game {self.game_name} --time-range 0-600")
            ]
        elif stage == 2:
            # Modified stage 2: run 2-7 (assume 1 output exists)
            stages_to_run = [
                (2, f"python3 2_create_coherent_narrative.py --game {self.game_name}"),
                (3, f"python3 3_event_classification.py --game {self.game_name}"),
                (4, None),
                (5, None),
                (7, f"python3 7_evaluate.py --game {self.game_name} --time-range 0-600")
            ]
        else:
            # Modified stage 3: run 3-7
            stages_to_run = [
                (3, f"python3 3_event_classification.py --game {self.game_name}"),
                (4, None),
                (5, None),
                (7, f"python3 7_evaluate.py --game {self.game_name} --time-range 0-600")
            ]
        
        # Run each stage
        for stage_num, cmd in stages_to_run:
            if cmd is None:
                continue  # Auto-run stages
            
            try:
                result = subprocess.run(
                    cmd,
                    shell=True,
                    cwd=self.pipeline_root,
                    capture_output=True,
                    text=True,
                    timeout=600  # 10 min timeout
                )
                
                if result.returncode != 0:
                    print(f"      ⚠️  Stage {stage_num} warning (continuing...)")
                    # Don't fail - some warnings are ok
                
            except subprocess.TimeoutExpired:
                raise RuntimeError(f"Stage {stage_num} timed out")
            except Exception as e:
                raise RuntimeError(f"Stage {stage_num} failed: {e}")
        
        # Calculate cost
        stage_costs = {
            1: 0.26,  # 10 clips × $0.026
            2: 0.02,
            3: 0.02,
            4: 0.0,
            5: 0.0,
            7: 0.0
        }
        
        total_cost = sum(stage_costs.get(s[0], 0) for s in stages_to_run if s[1] is not None)
        return total_cost
    
    def _load_real_metrics(self) -> Dict:
        """Load evaluation metrics from the most recent pipeline run"""
        
        # Find the most recent output folder
        outputs_dir = self.game_root / "outputs"
        
        # Look for .current_run.txt to find active run
        current_run_file = outputs_dir / ".current_run.txt"
        if current_run_file.exists():
            run_folder = current_run_file.read_text().strip()
            run_dir = outputs_dir / run_folder
        else:
            # Find most recent folder
            run_dirs = sorted([d for d in outputs_dir.iterdir() if d.is_dir()], 
                            key=lambda x: x.stat().st_mtime, reverse=True)
            if not run_dirs:
                raise FileNotFoundError("No output folders found")
            run_dir = run_dirs[0]
        
        # Look for evaluation metrics
        eval_file = run_dir / "7_evaluation_metrics.json"
        if not eval_file.exists():
            # Try alternative names
            eval_file = run_dir / "6_evaluation_metrics.json"
        
        if not eval_file.exists():
            raise FileNotFoundError(f"Evaluation metrics not found in {run_dir}")
        
        # Load metrics
        with open(eval_file, 'r') as f:
            metrics = json.load(f)
        
        # Extract summary metrics (they're stored as strings with %)
        summary = metrics.get('summary', {})
        
        # Parse percentage strings to floats
        def parse_percent(value):
            if isinstance(value, str):
                return float(value.replace('%', '')) / 100.0
            return float(value) if value else 0.0
        
        precision = parse_percent(summary.get('precision', 0))
        recall = parse_percent(summary.get('recall', 0))
        f1 = parse_percent(summary.get('f1_score', 0))
        
        # Calculate TP, FP, FN from per-event breakdown
        per_event = metrics.get('per_event', {})
        tp = sum(event_data.get('TP', 0) for event_data in per_event.values())
        fp = sum(event_data.get('FP', 0) for event_data in per_event.values())
        fn = sum(event_data.get('FN', 0) for event_data in per_event.values())
        
        return {
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'true_positives': tp,
            'false_positives': fp,
            'false_negatives': fn,
            'ground_truth_count': summary.get('total_pro_events', 20)
        }
    
    def _calculate_fitness(self, metrics: Dict) -> float:
        """
        Calculate fitness score from metrics
        
        Args:
            metrics: Dict with precision, recall, f1
        
        Returns:
            Fitness score (0.0 - 1.0)
        """
        # Primary fitness = F1 score
        f1 = metrics.get('f1', 0.0)
        
        # Could also use weighted combination:
        # precision = metrics.get('precision', 0.0)
        # recall = metrics.get('recall', 0.0)
        # fitness = 0.3 * precision + 0.5 * recall + 0.2 * f1
        
        return f1
    
    def evaluate_population(self, stage: int, variants: List[Dict]) -> List[Dict]:
        """
        Evaluate all variants in a population
        
        Args:
            stage: Which stage (1, 2, or 3)
            variants: List of variant dicts with 'prompt' and 'id'
        
        Returns:
            List of results sorted by fitness (best first)
        """
        results = []
        
        for i, variant in enumerate(variants, 1):
            print(f"\n  [{i}/{len(variants)}] Evaluating {variant['id']}...")
            
            result = self.evaluate_variant(
                stage=stage,
                prompt=variant['prompt'],
                variant_id=variant['id']
            )
            result['variant'] = variant  # Keep original variant info
            results.append(result)
        
        # Sort by fitness (descending)
        results.sort(key=lambda x: x['fitness'], reverse=True)
        
        # Print summary
        print(f"\n  📊 Population Results:")
        for i, result in enumerate(results, 1):
            status = "✅" if result['success'] else "❌"
            f1 = result['fitness']
            print(f"    {i}. {status} {result['variant_id']}: F1={f1:.3f}")
        
        return results


def test_real_evaluation():
    """Test the fitness evaluator with REAL pipeline"""
    print("Testing REAL pipeline evaluation...")
    print("This will actually run the pipeline - may take a few minutes")
    print()
    
    evaluator = FitnessEvaluator(num_clips=1)  # Just 1 clip for testing
    
    # Load a baseline prompt
    from prompt_manager import PromptManager
    manager = PromptManager()
    
    try:
        baseline_prompt = manager.load_baseline(stage=1)
    except:
        print("❌ No baseline found. Run: python3 core/prompt_manager.py --extract-baselines")
        return
    
    # Test with baseline
    test_variant = {
        'id': 'real_test_baseline',
        'prompt': baseline_prompt,
        'generation': 0,
        'strategy': 'baseline'
    }
    
    result = evaluator.evaluate_variant(
        stage=1,
        prompt=baseline_prompt,
        variant_id='real_test_baseline'
    )
    
    print(f"\n✅ Real evaluation complete!")
    print(f"   F1: {result['fitness']:.3f}")
    print(f"   Precision: {result['metrics']['precision']:.3f}")
    print(f"   Recall: {result['metrics']['recall']:.3f}")
    print(f"   Cost: ${result['cost']:.2f}")


if __name__ == "__main__":
    test_real_evaluation()
