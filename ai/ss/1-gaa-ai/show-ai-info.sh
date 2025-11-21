#!/bin/bash
# Quick command to show all AI improvement info

echo "=========================================="
echo "🎯 GAA AI IMPROVEMENT - KEY INFO"
echo "=========================================="
echo ""

echo "📋 IMPROVEMENT PLAN:"
cat /home/ubuntu/clann/gaa/ai/1-gaa-ai/AI_IMPROVEMENT_PLAN.md

echo ""
echo "=========================================="
echo "📂 KEY FILES FOR AI TUNING"
echo "=========================================="
echo ""

echo "1️⃣  Stage 1 - Clip Descriptions (where AI sees the video):"
echo "    pipelines/production2/1_clips_to_descriptions.py"
echo ""

echo "2️⃣  Stage 2 - Narrative Creation (combines clips):"
echo "    pipelines/production2/2_create_coherent_narrative.py"
echo ""

echo "3️⃣  Stage 3 - Event Classification (categorizes events):"
echo "    pipelines/production2/3_event_classification.py"
echo ""

echo "4️⃣  Stage 7 - Evaluation (compares AI vs ground truth):"
echo "    pipelines/production2/7_evaluate.py"
echo ""

echo "=========================================="
echo "📊 CURRENT PERFORMANCE"
echo "=========================================="
echo ""

echo "Kilmeena game:"
cat /home/ubuntu/clann/gaa/ai/1-gaa-ai/games/kilmeena-vs-cill-chomain/outputs/production2-20251115-1638/7_evaluation_metrics.json | grep -A 10 '"summary"'

echo ""
echo "Cmull game:"
cat /home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/outputs/production2-20251114-1108/7_evaluation_metrics.json | grep -A 10 '"summary"'

echo ""
echo "=========================================="
echo "🎬 VIDEO FILES"
echo "=========================================="
echo ""

echo "Kilmeena video:"
ls -lh /home/ubuntu/clann/gaa/ai/1-gaa-ai/games/kilmeena-vs-cill-chomain/inputs/kilmeena-vs-cill-chomain.mp4 2>/dev/null || echo "Not found"

echo ""
echo "Cmull video:"
ls -lh /home/ubuntu/clann/gaa/ai/1-gaa-ai/games/cmull-vs-castleconnor/inputs/cmull-vs-castleconnor.mp4 2>/dev/null || echo "Not found"

echo ""
echo "=========================================="
echo "✅ NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Read the full plan: cat AI_IMPROVEMENT_PLAN.md"
echo "2. Start with Phase 1: Fix evaluation ground truth"
echo "3. Review Stage 1 prompts: cat pipelines/production2/1_clips_to_descriptions.py"
echo ""

