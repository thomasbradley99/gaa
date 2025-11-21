#!/usr/bin/env python3
"""
Stage 0.1: Generate Clips and Calibration Frames
Splits video into 60-second clips and extracts frames for game profiling
"""

import sys
import os
import json
import subprocess
import time
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Parse arguments
parser = argparse.ArgumentParser(description='Generate clips and calibration frames from raw video')
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
ARGS = parser.parse_args()

# Setup paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
INPUTS_DIR = GAME_ROOT / "inputs"
CLIPS_DIR = INPUTS_DIR / "clips"
FRAMES_DIR = INPUTS_DIR / "calibration_frames"

def find_video_file():
    """Find the video file - check video_source.json first, then look for any .mp4"""
    # First, try to get target from video_source.json
    video_source_json = INPUTS_DIR / "video_source.json"
    if video_source_json.exists():
        try:
            with open(video_source_json) as f:
                config = json.load(f)
                downloads = config.get('downloads', [])
                if downloads:
                    target = downloads[0].get('target')
                    if target:
                        video_path = INPUTS_DIR / target
                        if video_path.exists():
                            return video_path
        except:
            pass
    
    # Fallback: check for video.mp4 (backwards compatibility)
    video_path = INPUTS_DIR / "video.mp4"
    if video_path.exists():
        return video_path
    
    # Last resort: find any .mp4 file in inputs/
    mp4_files = list(INPUTS_DIR.glob("*.mp4"))
    if mp4_files:
        return mp4_files[0]  # Use first one found
    
    return None

def get_video_duration(video_path):
    """Get video duration in seconds using ffprobe"""
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        str(video_path)
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        duration = float(data['format']['duration'])
        return duration
    except (subprocess.CalledProcessError, KeyError, ValueError):
        print("⚠️  Could not determine video duration, using 90 minutes default")
        return 5400  # 90 minutes default

def generate_clips_ultra_fast(video_path, clips_dir, clip_duration=60):
    """ULTRA FAST: Single ffmpeg command to generate all clips at once"""
    print(f"🚀 ULTRA FAST MODE: Generating {clip_duration}s clips using ffmpeg segment")
    
    try:
        # Single GPU-accelerated command to create ALL clips
        cmd = [
            'ffmpeg',
            '-hwaccel', 'cuda',  # GPU acceleration
            '-i', str(video_path),
            '-f', 'segment',
            '-segment_time', str(clip_duration),
            '-segment_format', 'mp4',
            '-c', 'copy',  # Stream copy - no re-encoding
            '-reset_timestamps', '1',
            '-segment_start_number', '0',
            '-y',
            str(clips_dir / 'temp_clip_%04d.mp4')
        ]
        
        print("⚡ Running ffmpeg segmentation...")
        start_time = time.time()
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        segment_time = time.time() - start_time
        print(f"✅ Segmentation complete in {segment_time:.1f} seconds!")
        
        # Rename clips to time-based format
        print("🔄 Renaming clips to time-based format...")
        rename_start = time.time()
        
        temp_clips = sorted(clips_dir.glob('temp_clip_*.mp4'))
        renamed_count = 0
        
        for i, temp_clip in enumerate(temp_clips):
            start_seconds = i * clip_duration
            minutes = int(start_seconds // 60)
            seconds = int(start_seconds % 60)
            
            new_name = f"clip_{minutes:03d}m{seconds:02d}s.mp4"
            new_path = clips_dir / new_name
            
            temp_clip.rename(new_path)
            renamed_count += 1
        
        rename_time = time.time() - rename_start
        total_time = time.time() - start_time
        
        print(f"✅ Renamed {renamed_count} clips in {rename_time:.1f} seconds")
        print(f"🚀 TOTAL TIME: {total_time:.1f} seconds ({renamed_count/total_time:.1f} clips/sec)")
        
        return renamed_count
        
    except subprocess.CalledProcessError as e:
        print(f"❌ GPU mode failed: {e.stderr if e.stderr else str(e)}")
        print("🔄 Falling back to CPU processing...")
        
        # CPU fallback
        cmd_cpu = [
            'ffmpeg',
            '-i', str(video_path),
            '-f', 'segment',
            '-segment_time', str(clip_duration),
            '-segment_format', 'mp4',
            '-c', 'copy',
            '-reset_timestamps', '1',
            '-segment_start_number', '0',
            '-y',
            str(clips_dir / 'temp_clip_%04d.mp4')
        ]
        
        try:
            subprocess.run(cmd_cpu, capture_output=True, text=True, check=True)
            
            # Rename clips
            temp_clips = sorted(clips_dir.glob('temp_clip_*.mp4'))
            for i, temp_clip in enumerate(temp_clips):
                start_seconds = i * clip_duration
                minutes = int(start_seconds // 60)
                seconds = int(start_seconds % 60)
                new_name = f"clip_{minutes:03d}m{seconds:02d}s.mp4"
                temp_clip.rename(clips_dir / new_name)
            
            return len(temp_clips)
        except subprocess.CalledProcessError as e2:
            print(f"❌ CPU mode also failed: {e2.stderr if e2.stderr else str(e2)}")
            return None

def extract_calibration_frames_from_clips(clips_dir, frames_dir):
    """Extract 2 frames per clip (0s and 30s) - ULTRA FAST"""
    print(f"\n📸 Extracting calibration frames from clips (2 per clip)...")
    
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    clips = sorted(clips_dir.glob('clip_*m*s.mp4'))
    print(f"📊 Found {len(clips)} clips → will extract {len(clips) * 2} frames")
    
    def extract_frame_from_clip(clip_path, offset_seconds):
        """Extract single frame from a clip at given offset"""
        # Parse clip start time from filename (clip_011m00s.mp4 → 660s)
        import re
        match = re.search(r'clip_(\d+)m(\d+)s\.mp4', clip_path.name)
        if match:
            clip_start = int(match.group(1)) * 60 + int(match.group(2))
        else:
            return None
        
        # Calculate absolute timestamp
        frame_timestamp = clip_start + offset_seconds
        
        output_path = frames_dir / f"frame_{frame_timestamp:05d}s.jpg"
        
        # Skip if exists
        if output_path.exists():
            return output_path.name
        
        cmd = [
            'ffmpeg',
            '-ss', str(offset_seconds),
            '-i', str(clip_path),
            '-vframes', '1',
            '-q:v', '5',  # Good quality, fast encoding
            '-y',
            str(output_path)
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return output_path.name
    
    try:
        start_time = time.time()
        frame_count = 0
        
        # Extract frames in parallel (2 frames per clip)
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = []
            for clip_path in clips:
                futures.append(executor.submit(extract_frame_from_clip, clip_path, 0))   # 0s
                futures.append(executor.submit(extract_frame_from_clip, clip_path, 30))  # 30s
            
            for i, future in enumerate(as_completed(futures), 1):
                result = future.result()
                if result:
                    frame_count += 1
                if i % 40 == 0:
                    print(f"📊 Progress: {i}/{len(futures)} frames")
        
        frames = sorted(frames_dir.glob('frame_*s.jpg'))
        elapsed = time.time() - start_time
        
        print(f"✅ Extracted {len(frames)} frames in {elapsed:.1f} seconds ({len(frames)/elapsed:.1f} frames/sec)")
        print(f"📁 Saved to: {frames_dir}")
        
        return len(frames)
    except Exception as e:
        print(f"❌ Frame extraction failed: {str(e)}")
        return 0

def main():
    """Generate clips and calibration frames"""
    print(f"🎬 STAGE 0.1: GENERATE CLIPS & CALIBRATION FRAMES")
    print(f"Game: {ARGS.game}")
    print("=" * 70)
    
    # Find video file
    VIDEO_PATH = find_video_file()
    if not VIDEO_PATH:
        print(f"❌ Video not found in: {INPUTS_DIR}")
        print(f"Expected: video.mp4 or check video_source.json for target filename")
        return False
    
    # Get video duration
    video_duration = get_video_duration(VIDEO_PATH)
    print(f"📹 Video: {VIDEO_PATH.name}")
    print(f"⏱️  Duration: {video_duration/60:.1f} minutes ({video_duration:.0f} seconds)")
    print()
    
    # Create output directories
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Generate clips (skip if they exist)
    print("=" * 70)
    print("STEP 1: GENERATING 60-SECOND CLIPS")
    print("=" * 70)
    
    existing_clips = list(CLIPS_DIR.glob('clip_*m*s.mp4'))
    if existing_clips:
        print(f"✅ Found {len(existing_clips)} existing clips - skipping generation")
        print(f"📁 Clips already exist in: {CLIPS_DIR}")
        clip_count = len(existing_clips)
    else:
        clip_count = generate_clips_ultra_fast(VIDEO_PATH, CLIPS_DIR, clip_duration=60)
    
    if not clip_count:
        print("❌ Clip generation failed")
        return False
    
    print(f"\n✅ Created {clip_count} clips")
    print(f"📁 Saved to: {CLIPS_DIR}")
    
    # 2. Extract calibration frames from clips (skip if they exist)
    print("\n" + "=" * 70)
    print("STEP 2: EXTRACTING CALIBRATION FRAMES FROM CLIPS")
    print("=" * 70)
    
    existing_frames = list(FRAMES_DIR.glob('frame_*s.jpg'))
    if existing_frames:
        print(f"✅ Found {len(existing_frames)} existing frames - skipping extraction")
        print(f"📁 Frames already exist in: {FRAMES_DIR}")
        frame_count = len(existing_frames)
    else:
        frame_count = extract_calibration_frames_from_clips(CLIPS_DIR, FRAMES_DIR)
    
    if frame_count == 0:
        print("❌ Frame extraction failed")
        return False
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ PREPROCESSING COMPLETE!")
    print("=" * 70)
    print(f"📊 Clips: {clip_count} clips (60s each)")
    print(f"📸 Frames: {frame_count} frames (2 per clip at 0s and 30s)")
    print(f"⚡ Speed: Extracted from clips (ultra-fast)")
    print()
    print(f"Next step: python3 0.5_calibrate_game.py --game {ARGS.game}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

