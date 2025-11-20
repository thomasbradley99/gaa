#!/usr/bin/env python3
"""
Mutation Engine - LLM-powered intelligent prompt mutations

Generates prompt variants using various mutation strategies:
- Add/remove examples
- Change emphasis (SHOTS vs KICKOUTS)
- Adjust selectivity
- Modify validation logic
"""

import os
from typing import List, Dict
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('/home/ubuntu/clann/CLANNAI/.env')


class MutationEngine:
    """Generates intelligent prompt mutations using LLM"""
    
    MUTATION_STRATEGIES = [
        "add_shot_examples",
        "add_kickout_examples", 
        "emphasize_selectivity",
        "emphasize_completeness",
        "simplify_language",
        "add_gaa_context",
        "modify_output_format",
        "adjust_validation_logic"
    ]
    
    def __init__(self, model_name='gemini-2.5-flash'):
        """Initialize mutation engine with API access"""
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name,
            generation_config={"temperature": 0.7, "top_p": 0.9}  # Creative mutations
        )
    
    def mutate(self, prompt: str, strategy: str, generation: int) -> str:
        """
        Generate a mutated variant of the prompt
        
        Args:
            prompt: Current prompt text
            strategy: Mutation strategy to apply
            generation: Current generation number (for tracking)
        
        Returns:
            Mutated prompt text
        """
        mutation_prompt = self._build_mutation_prompt(prompt, strategy)
        
        try:
            response = self.model.generate_content(mutation_prompt)
            mutated_prompt = response.text.strip()
            
            # Remove markdown code blocks if present
            if mutated_prompt.startswith('```'):
                lines = mutated_prompt.split('\n')
                mutated_prompt = '\n'.join(lines[1:-1])
            
            return mutated_prompt
        
        except Exception as e:
            print(f"⚠️  Mutation failed: {e}")
            return prompt  # Return original if mutation fails
    
    def generate_population(self, base_prompt: str, population_size: int, 
                          generation: int) -> List[Dict]:
        """
        Generate a population of prompt variants
        
        Args:
            base_prompt: Starting prompt
            population_size: Number of variants to generate
            generation: Current generation number
        
        Returns:
            List of variant dicts with prompt and metadata
        """
        variants = []
        
        # Always include baseline
        variants.append({
            'prompt': base_prompt,
            'strategy': 'baseline',
            'generation': generation,
            'id': f"gen_{generation:03d}_baseline"
        })
        
        # Generate mutated variants
        for i in range(population_size - 1):
            strategy = self.MUTATION_STRATEGIES[i % len(self.MUTATION_STRATEGIES)]
            mutated = self.mutate(base_prompt, strategy, generation)
            
            variants.append({
                'prompt': mutated,
                'strategy': strategy,
                'generation': generation,
                'id': f"gen_{generation:03d}_variant_{chr(65 + i)}"
            })
        
        return variants
    
    def _build_mutation_prompt(self, prompt: str, strategy: str) -> str:
        """Build the meta-prompt for generating mutations"""
        
        strategy_instructions = {
            "add_shot_examples": """
                Add 2-3 more specific examples of shot detection.
                Include different scenarios: long-range shots, close-range goals, wide shots.
                Make examples concrete with timestamps and outcomes.
            """,
            "add_kickout_examples": """
                Add 2-3 more specific examples of kickout detection.
                Include different types: long/mid/short kickouts, won/lost outcomes.
                Show how to identify kickout direction (left/centre/right).
            """,
            "emphasize_selectivity": """
                Make the prompt MORE selective - reduce over-detection.
                Add warnings about common false positives.
                Emphasize "only report what you're CONFIDENT about".
            """,
            "emphasize_completeness": """
                Make the prompt MORE comprehensive - reduce under-detection.
                Encourage reporting ALL potential events.
                Add "when in doubt, report it" guidance.
            """,
            "simplify_language": """
                Simplify the language and instructions.
                Remove redundant explanations.
                Make it more concise while keeping key information.
            """,
            "add_gaa_context": """
                Add more GAA domain knowledge.
                Include GAA-specific terminology and patterns.
                Add context about typical game flow.
            """,
            "modify_output_format": """
                Adjust the output format requirements.
                Make formatting clearer and more structured.
                Add examples of ideal output format.
            """,
            "adjust_validation_logic": """
                Modify the validation rules (for Stage 2 narrative prompts).
                Adjust how hallucinations are detected.
                Change the criteria for keeping/removing events.
            """
        }
        
        instruction = strategy_instructions.get(strategy, "Improve the prompt for better event detection")
        
        return f"""You are optimizing a prompt for GAA (Gaelic Athletic Association) sports event detection.

Current prompt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{prompt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mutation strategy: {strategy}

Instructions:
{instruction}

Requirements:
1. Keep the core structure and purpose of the prompt
2. Make targeted improvements based on the strategy
3. Maintain clarity and specificity
4. Don't remove critical information
5. Output ONLY the improved prompt (no explanations)

Generate the improved prompt:"""


def test_mutation():
    """Test the mutation engine"""
    engine = MutationEngine()
    
    test_prompt = """Watch this GAA clip. Report SHOTS, KICKOUTS, FOULS.

Example:
11:25 - White shoots - POINT scored"""
    
    print("Original prompt:")
    print(test_prompt)
    print("\n" + "="*80 + "\n")
    
    mutated = engine.mutate(test_prompt, "add_shot_examples", 1)
    print("Mutated prompt:")
    print(mutated)


if __name__ == "__main__":
    test_mutation()

