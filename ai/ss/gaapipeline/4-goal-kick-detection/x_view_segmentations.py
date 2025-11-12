#!/usr/bin/env python3
"""
x_view_segmentations.py - Visualize Segmentation Masks on Video Clips
"""

import os
import cv2
import json
import numpy as np
import pycocotools.mask as mask_util
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# --- Configuration ---
RESULTS_DIR = Path("results/object_detections")
CLIPS_DIR = Path("../3.5-video-splitting/clips/first_half")
OUTPUT_DIR = Path("results/segmented_videos")
TEMP_DIR = Path("results/temp_segmented_videos")
MAX_WORKERS = os.cpu_count() or 4
DOWNSCALE_HEIGHT = 480


def rle_to_mask(rle, height, width):
    """
    Converts a Run-Length Encoding (RLE) dictionary to a binary mask.
    """
    return mask_util.decode(rle)


def draw_masks(frame, annotations, alpha=0.5, scale_factor=1.0):
    """
    Draws segmentation masks on a single frame.
    """
    overlay = frame.copy()
    for ann in annotations:
        mask = rle_to_mask(ann['segmentation'], int(frame.shape[0] / scale_factor), int(frame.shape[1] / scale_factor))
        
        # Resize mask to downscaled frame size
        mask = cv2.resize(mask, (frame.shape[1], frame.shape[0]), interpolation=cv2.INTER_NEAREST)

        color = np.random.randint(0, 256, (3,), dtype=np.uint8).tolist()

        # Ensure the mask is a 3-channel image to blend with the frame
        colored_mask = np.zeros_like(frame, dtype=np.uint8)
        colored_mask[mask > 0] = color

        # Blend the mask with the frame
        overlay = cv2.addWeighted(overlay, 1, colored_mask, alpha, 0)

        # Draw bounding box and label
        x1, y1, x2, y2 = [int(c * scale_factor) for c in ann['bbox']]
        label = f"{ann['class_name']} {ann['grounding_dino_score']:.2f}"
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
        cv2.putText(overlay, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    return overlay


def process_and_save_clip(json_path):
    """
    Processes a single clip: loads annotations, draws masks, and saves a temporary video.
    Returns the path to the temporary video file, or None if an error occurs.
    """
    clip_name = json_path.stem + ".mp4"
    clip_path = CLIPS_DIR / clip_name
    temp_video_path = TEMP_DIR / clip_name

    if not clip_path.exists():
        print(f"⚠️  Warning: Clip not found for {json_path.name}. Skipping.")
        return None

    if temp_video_path.exists() and temp_video_path.stat().st_size > 0:
        return str(temp_video_path)

    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
            annotations_by_frame = data.get("annotations_by_frame", {})

        if not annotations_by_frame:
            tqdm.write(f"⚠️  Warning: No frame-based annotations in {json_path.name}. Skipping.")
            return None

        # Convert string keys from JSON to int keys for frame indexing
        frame_annotations = {int(k): v for k, v in annotations_by_frame.items()}
        sorted_frame_indices = sorted(frame_annotations.keys())

        cap = cv2.VideoCapture(str(clip_path))
        orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        scale_factor = DOWNSCALE_HEIGHT / orig_height
        width = int(orig_width * scale_factor)
        height = DOWNSCALE_HEIGHT
        
        if not fps > 0:
            fps = 30  # Default FPS if invalid

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(temp_video_path), fourcc, fps, (width, height))

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        with tqdm(total=frame_count, desc=f'Processing {clip_name}', leave=False, unit='frame', ncols=100) as pbar_frames:
            current_frame_idx = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Find the most recent annotations for the current frame index
                active_annotations = []
                for idx in sorted_frame_indices:
                    if idx <= current_frame_idx:
                        active_annotations = frame_annotations[idx]
                    else:
                        break # Stop when we pass the current frame index

                downscaled_frame = cv2.resize(frame, (width, height))
                annotated_frame = draw_masks(downscaled_frame, active_annotations, scale_factor=scale_factor)
                out.write(annotated_frame)
                
                pbar_frames.update(1)
                current_frame_idx += 1

        cap.release()
        out.release()
        return str(temp_video_path)

    except Exception as e:
        print(f"❌ Error processing {clip_name}: {e}")
        return None


def main():
    """
    Main function to process clips in parallel and save a single combined video.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    print("🎭 GAA Segmentation Video Creator")
    print("=" * 40)
    print(f"Loading results from: {RESULTS_DIR}")
    print(f"Saving combined video to: {OUTPUT_DIR}")
    print(f"🧵 Using up to {MAX_WORKERS} threads for processing")

    json_files = sorted(RESULTS_DIR.glob("*.json"))
    if not json_files:
        print("\n❌ No JSON result files found in the results directory.")
        return

    print(f"\nFound {len(json_files)} detection files to process.")

    processed_video_paths = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_path = {executor.submit(process_and_save_clip, json_path): json_path for json_path in json_files}
        
        for future in tqdm(as_completed(future_to_path), total=len(json_files), desc="Overall Progress", unit="clip"):
            json_path = future_to_path[future]
            try:
                result = future.result()
                if result:
                    processed_video_paths.append(result)
            except Exception as e:
                clip_name = json_path.stem + ".mp4"
                tqdm.write(f"💥 Error processing {clip_name}: {e}")

    print("\n\n✅ All clips processed.")

    if not processed_video_paths:
        print("❌ No videos were processed successfully.")
        return

    processed_video_paths.sort()

    print("\n🎥 Combining all processed clips into a single video...")
    final_video_path = OUTPUT_DIR / "combined_segmented_video.mp4"
    file_list_path = TEMP_DIR / "temp_file_list.txt"

    with open(file_list_path, "w") as f:
        for path in processed_video_paths:
            f.write(f"file '{os.path.abspath(path)}'\n")

    ffmpeg_command = f"ffmpeg -y -f concat -safe 0 -i \"{file_list_path}\" -c copy \"{final_video_path}\""
    os.system(ffmpeg_command)

    print(f"\n🎉 Combined video saved to: {final_video_path}")

    print("🗑️  Cleaning up temporary files...")
    for path in processed_video_paths:
        os.remove(path)
    os.remove(file_list_path)
    os.rmdir(TEMP_DIR)

    print("✅ Done.")


if __name__ == "__main__":
    main()
