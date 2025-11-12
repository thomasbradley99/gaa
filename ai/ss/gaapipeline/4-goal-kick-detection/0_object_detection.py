#!/usr/bin/env python3
"""
0_object_detection.py - GroundedSAM2 Object Detection for GAA Clips
Takes video clips as input and produces JSON files containing object detections.
This is the first step in the kickout detection pipeline.
"""

import os
import sys
import cv2
import json
import torch
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time
import logging
import tempfile
import numpy as np
import pycocotools.mask as mask_util
from tqdm import tqdm

# --- Add this import for batched post-processing ---
from groundingdino.util.utils import get_phrase

# --- Setup logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Add models directory to Python path ---
# This allows importing GroundingDINO and SAM2 modules.
# It assumes the script is run from the '4-goal-kick-detection' directory.
MODELS_DIR = Path(__file__).resolve().parent.parent / 'Grounded-SAM-2'
if str(MODELS_DIR) not in sys.path:
    sys.path.append(str(MODELS_DIR))

try:
    from grounding_dino.groundingdino.util.inference import load_model, predict, load_image
    from grounding_dino.groundingdino.datasets import transforms as T
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    from torchvision.ops import box_convert
    from PIL import Image
except ImportError as e:
    logging.error(f"Failed to import a required model library: {e}")
    logging.error("Please ensure the 'models' directory is correctly structured and all dependencies from INSTALL.md are installed.")
    sys.exit(1)

# --- Configuration ---
# Input and Output
SCRIPT_DIR = Path(__file__).resolve().parent
CLIPS_BASE_DIR = SCRIPT_DIR.parent / "3.5-video-splitting/clips/first_half"
OUTPUT_DIR = SCRIPT_DIR / "results/object_detections"
TIME_LIMIT_MINUTES = 10  # Must match the clip analysis script for consistency
MAX_WORKERS = 1          # GPU-heavy task; limit workers to avoid OOM errors
BATCH_SIZE = 16          # Process frames in batches for performance

# Model Configuration (paths relative to the '4-goal-kick-detection' directory)
# We now define the root directory to locate the model checkpoints
MODELS_DIR = SCRIPT_DIR.parent / 'Grounded-SAM-2'
SAM2_CHECKPOINT = MODELS_DIR / "checkpoints/sam2.1_hiera_large.pt"
GROUNDING_DINO_CONFIG = MODELS_DIR / "grounding_dino/groundingdino/config/GroundingDINO_SwinB_cfg.py"
GROUNDING_DINO_CHECKPOINT = MODELS_DIR / "gdino_checkpoints/groundingdino_swinb_cogcoor.pth"

# Detection Parameters
TEXT_PROMPT = """
player. football player. footballer.
goalkeeper. goalkeeper in colored jersey. goalie near the goal. 
ball. white round ball. small white football. football on the pitch. 
goalpost. white goal frame. netted goal. crossbar of the goal. football goal. upright posts on the football pitch. goalpost on the pitch.
referee. referee in black. match official on field.
pitch line. sideline marking. endline. halfway line. white pitch lines.  
grass. green grass field. turf. playing surface. pitch grass.
"""
BOX_THRESHOLD = 0.25
TEXT_THRESHOLD = 0.25
# Add FPS constant for analysis
VIDEO_FPS = 30 # Approximate FPS for analysis
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# def single_mask_to_rle(mask):
#     """
#     Converts a single binary mask to Run-Length Encoding (RLE).
#     """
#     rle = mask_util.encode(np.array(mask[:, :, None], order="F", dtype="uint8"))[0]
#     rle["counts"] = rle["counts"].decode("utf-8")
#     return rle

class ObjectDetector:
    """
    A wrapper class for GroundingDINO and SAM2 models to perform object detection.
    """
    _instance = None
    _model_loaded = False # Use a class variable to ensure model is loaded only once

    def __new__(cls):
        # This singleton ensures models are loaded only once, even with multiple workers.
        if cls._instance is None:
            cls._instance = super(ObjectDetector, cls).__new__(cls)
            cls._instance.sam2_predictor = None
            cls._instance.grounding_model = None
        return cls._instance

    def _load_models_if_needed(self):
        """Loads the GroundingDINO model if it hasn't been loaded."""
        if ObjectDetector._model_loaded:
            return

        logging.info(f"Loading models to device: {DEVICE}")
        try:
            # # Build SAM2 image predictor (Commented out)
            # sam2_model_cfg = "configs/sam2.1/sam2.1_hiera_l.yaml"
            # sam2_model = build_sam2(sam2_model_cfg, str(SAM2_CHECKPOINT), device=DEVICE)
            # self.sam2_predictor = SAM2ImagePredictor(sam2_model)
            # logging.info("SAM2 model loaded successfully.")

            # Build Grounding DINO model
            self.grounding_model = load_model(
                model_config_path=str(GROUNDING_DINO_CONFIG),
                model_checkpoint_path=str(GROUNDING_DINO_CHECKPOINT),
                device=DEVICE
            )
            logging.info("GroundingDINO model loaded successfully.")

            if torch.cuda.is_available() and torch.cuda.get_device_properties(0).major >= 8:
                logging.info("Enabling TF32 for Ampere GPU.")
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
            
            ObjectDetector._model_loaded = True

        except Exception as e:
            logging.error(f"Error loading models: {e}")
            raise

    def detect_objects_in_batch(self, frame_batch_bgr):
        """
        Detects objects in a batch of BGR image frames.
        Args:
            frame_batch_bgr: A list of numpy arrays, each representing an image in BGR format.
        Returns:
            A list of lists of dictionaries, each containing detection info.
        """
        self._load_models_if_needed()

        # Prepare image transforms for batching
        transform = T.Compose(
            [
                T.Resize((800, 800)),  # Resize to a fixed size for batching
                T.ToTensor(),
                T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ]
        )

        # Transform all frames and stack them into a single tensor
        image_pil_batch = [Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)) for frame in frame_batch_bgr]
        image_tensor_batch = torch.stack([transform(img, None)[0] for img in image_pil_batch])

        try:
            autocast_dtype = torch.float32
            with torch.autocast(device_type=DEVICE, dtype=autocast_dtype):
                outputs = self.grounding_model(image_tensor_batch.to(DEVICE), captions=[TEXT_PROMPT.lower()] * len(frame_batch_bgr))
        except Exception as e:
            logging.error(f"Error during prediction: {e}")
            return [[] for _ in frame_batch_bgr]

        # Post-process results for each image in the batch
        batch_detections = []
        prediction_logits = outputs["pred_logits"].cpu().sigmoid()
        prediction_boxes = outputs["pred_boxes"].cpu()
        tokenizer = self.grounding_model.tokenizer
        tokenized_prompt = tokenizer(TEXT_PROMPT.lower(), padding="longest", return_tensors="pt")

        for i, (image_pil, frame_bgr) in enumerate(zip(image_pil_batch, frame_batch_bgr)):
            logits_i = prediction_logits[i]
            boxes_i = prediction_boxes[i]
            
            # Filter by box threshold
            mask = logits_i.max(dim=1)[0] > BOX_THRESHOLD
            logits_filt = logits_i[mask]
            boxes_filt = boxes_i[mask]

            if logits_filt.shape[0] == 0:
                batch_detections.append([])
                continue

            # Get labels for filtered boxes
            pred_phrases = []
            for logit_row in logits_filt:
                pred_phrases.append(get_phrase(logit_row, tokenized_prompt, tokenizer, TEXT_THRESHOLD))
            
            grounding_dino_scores = logits_filt.max(dim=1)[0]
            
            # Convert boxes to original image coordinates
            original_h, original_w, _ = frame_bgr.shape
            boxes_filt = boxes_filt * torch.Tensor([original_w, original_h, original_w, original_h])
            input_boxes = box_convert(boxes=boxes_filt, in_fmt="cxcywh", out_fmt="xyxy").numpy()
            
            frame_detections = [
                {
                    "class_name": label,
                    "bbox": box.tolist(),
                    "grounding_dino_score": gd_score.item(),
                }
                for label, box, gd_score in zip(pred_phrases, input_boxes, grounding_dino_scores)
            ]
            batch_detections.append(frame_detections)

        return batch_detections


def extract_frames_from_clip(clip_path):
    """
    Extracts every frame from a video clip.

    Args:
        clip_path (Path): Path to the video clip.

    Yields:
        A tuple of (frame_index, frame_bgr_numpy_array).
    """
    try:
        cap = cv2.VideoCapture(str(clip_path))
        if not cap.isOpened():
            logging.error(f"Cannot open video file: {clip_path}")
            return

        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            yield frame_count, frame.copy()
            frame_count += 1
            
        cap.release()
    except Exception as e:
        logging.error(f"Failed to extract frames from {clip_path.name}: {e}")
        return


def process_clip(clip_path, detector):
    """
    Processes a single video clip to detect objects and save the results.
    """
    output_file = OUTPUT_DIR / f"{clip_path.stem}.json"
    if output_file.exists():
        logging.info(f"Skipping {clip_path.name} (already processed)")
        return None

    logging.info(f"Processing {clip_path.name}...")
    
    # Store annotations for each sampled frame index
    annotations_by_frame = {}
    
    try:
        # Get total frame count for tqdm progress bar
        cap = cv2.VideoCapture(str(clip_path))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        frames_generator = extract_frames_from_clip(clip_path)
        
        frame_batch = []
        frame_idx_batch = []
        
        with tqdm(total=total_frames, desc=f"Analyzing {clip_path.stem}", leave=False) as pbar:
            for frame_idx, frame in frames_generator:
                frame_batch.append(frame)
                frame_idx_batch.append(frame_idx)

                if len(frame_batch) == BATCH_SIZE:
                    batch_detections = detector.detect_objects_in_batch(frame_batch)
                    for idx, detections in zip(frame_idx_batch, batch_detections):
                        annotations_by_frame[idx] = detections
                    pbar.update(len(frame_batch))
                    frame_batch, frame_idx_batch = [], []

            # Process the final partial batch
            if frame_batch:
                batch_detections = detector.detect_objects_in_batch(frame_batch)
                for idx, detections in zip(frame_idx_batch, batch_detections):
                    annotations_by_frame[idx] = detections
                pbar.update(len(frame_batch))

        # Save results to a JSON file
        result_data = {
            "clip_name": clip_path.name,
            "text_prompt": TEXT_PROMPT,
            "annotations_by_frame": annotations_by_frame,
            "box_format": "xyxy",
            # "mask_format": "rle"
        }
        with open(output_file, 'w') as f:
            json.dump(result_data, f, indent=4)
            
        return f"Successfully processed {clip_path.name}"

    except Exception as e:
        # It's useful to log the full traceback for debugging
        import traceback
        logging.error(f"Error processing {clip_path.name}: {e}\n{traceback.format_exc()}")
        return f"Error processing {clip_path.name}: {e}"


def main():
    print("🎯 GAA OBJECT DETECTION - STEP 0: VIDEO → OBJECTS (GroundedSAM2)")
    print("=" * 60)

    # Check for CUDA
    if not torch.cuda.is_available():
        print("⚠️  WARNING: CUDA not available, running on CPU. This will be very slow.")
    
    # Setup paths
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not CLIPS_BASE_DIR.exists():
        print(f"❌ Clips directory not found: {CLIPS_BASE_DIR}")
        return

    # Find clips to process
    all_clips = sorted(CLIPS_BASE_DIR.glob("*.mp4"))
    target_clips = []
    for clip in all_clips:
        if "clip_" in clip.name:
            try:
                parts = clip.stem.replace("clip_", "").split("m")
                minutes = int(parts[0])
                if minutes < TIME_LIMIT_MINUTES:
                    target_clips.append(clip)
            except (ValueError, IndexError):
                continue
    
    if not target_clips:
        print("No clips found to process in the specified time limit.")
        return

    print(f"📊 Found {len(target_clips)} clips in the first {TIME_LIMIT_MINUTES} minutes.")
    print(f"🧵 Using up to {MAX_WORKERS} threads for processing.")

    # Instantiate the detector.
    detector = ObjectDetector()

    # Eagerly load models in the main thread to avoid race conditions in workers,
    # following the pattern from the working reference script.
    print("🔧 Loading models before starting workers...")
    detector._load_models_if_needed()
    print("✅ Models loaded successfully.")

    # Process clips in parallel
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all jobs to the executor
        futures = {executor.submit(process_clip, clip, detector): clip for clip in target_clips}

        # Use tqdm for overall progress tracking
        for future in tqdm(concurrent.futures.as_completed(futures), total=len(target_clips), desc="Processing All Clips"):
            clip = futures[future]
            try:
                result = future.result()
                if result:
                    logging.info(result)
            except Exception as exc:
                logging.error(f'{clip.name} generated an exception: {exc}')

    processing_time = time.time() - start_time
    
    print("\n✅ OBJECT DETECTION COMPLETE!")
    print(f"⏱️  Total Time: {processing_time:.2f}s")
    print(f"📁 Results saved to: {OUTPUT_DIR}")
    print("\n🔄 Next step: Modify and run '1_analyze_clips.py' to use these detections.")

if __name__ == "__main__":
    # Add a guard for multiprocessing safety, though ThreadPoolExecutor is generally safe
    import concurrent.futures
    main()
