#!/usr/bin/env python3
"""
Stage 0: Generate Overlapping Clips & Calibration Frames

NEW APPROACH: 30-second clips with 5-second overlap
- Each clip is 40s total (5s before + 30s focus + 5s after)
- Clips overlap by 10s (5s on each side)
- Better context, less hallucination
- Narrative can see events that span clip boundaries
"""

import subprocess
import argparse
import time
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument('--game', required=True, help='Game name (folder in games/)')
parser.add_argument('--duration', type=int, help='Duration in minutes to process from game start (e.g., 15 for first 15 min)')
ARGS = parser.parse_args()

# Paths
PROD_ROOT = Path(__file__).parent.parent.parent
GAME_ROOT = PROD_ROOT / "games" / ARGS.game
VIDEO_PATH = GAME_ROOT / "inputs" / "video.mp4"
CLIPS_DIR = GAME_ROOT / "inputs" / "clips-v2"  # Production2 uses clips-v2
FRAMES_DIR = GAME_ROOT / "inputs" / "calibration_frames"

# Clip settings
CLIP_INTERVAL = 30  # 30 seconds of "focus" content per clip
OVERLAP = 5         # 5 seconds of overlap on each side
CLIP_DURATION = CLIP_INTERVAL + (2 * OVERLAP)  # 40 seconds total per clip

def get_video_duration(video_path):
    """Get video duration in seconds"""
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(video_path)
    ]
    
    try:
        result = subprocess.check_output(cmd, text=True).strip()
        return int(float(result))
    except:
        print("⚠️  Could not get duration")
        return None

def generate_overlapping_clips(video_path, clips_dir, video_duration, game_start=0, game_end=None):
    """
    Generate 30s clips with 5s overlap using GPU
    
    Example:
    - Clip 1: 10:55 → 11:35 (focus: 11:00-11:30)
    - Clip 2: 11:25 → 12:05 (focus: 11:30-12:00)
                ↑ 10s overlap with Clip 1
    """
    print(f"\n🎬 Generating 30s clips with 5s overlap (40s total per clip)")
    
    # Use game profile times if available
    if game_start > 0:
        print(f"📅 Using calibrated game time: {game_start//60}:{game_start%60:02d} - {(game_end or video_duration)//60}:{(game_end or video_duration)%60:02d}")
    
    clips_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if clips already exist (new naming format)
    existing = list(clips_dir.glob('clip_*m*s-*m*s.mp4'))
    if existing:
        print(f"✅ Found {len(existing)} existing clips - skipping generation")
        return len(existing)
    
    # Calculate all clip times starting from game start
    clip_times = []
    current_time = game_start
    end_time = game_end or video_duration
    
    while current_time < end_time:
        # Focus range
        focus_start = current_time
        focus_end = min(current_time + CLIP_INTERVAL, end_time)
        
        # Actual clip with overlap
        clip_start = max(0, focus_start - OVERLAP)
        clip_end = min(end_time, focus_end + OVERLAP)
        
        clip_times.append({
            'focus_start': focus_start,
            'focus_end': focus_end,
            'clip_start': clip_start,
            'clip_end': clip_end
        })
        
        current_time += CLIP_INTERVAL
    
    print(f"📊 Creating {len(clip_times)} clips (30s content + 10s overlap each)")
    
    def create_clip(clip_info):
        """Create single clip with GPU"""
        focus_start = clip_info['focus_start']
        focus_end = clip_info['focus_end']
        clip_start = clip_info['clip_start']
        clip_end = clip_info['clip_end']
        
        # Name shows ACTUAL clip time (with overlap): clip_010m55s-011m35s.mp4
        start_min = clip_start // 60
        start_sec = clip_start % 60
        end_min = clip_end // 60
        end_sec = clip_end % 60
        
        clip_name = f"clip_{start_min:03d}m{start_sec:02d}s-{end_min:03d}m{end_sec:02d}s.mp4"
        output_path = clips_dir / clip_name
        
        duration = clip_end - clip_start
        
        try:
            cmd = [
                'ffmpeg',
                '-hwaccel', 'cuda',
                '-ss', str(clip_start),
                '-i', str(video_path),
                '-t', str(duration),
                '-c:v', 'h264_nvenc',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-y',
                str(output_path)
            ]
            
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            return clip_name
        except subprocess.CalledProcessError:
            # Fallback to CPU
            cmd_cpu = [
                'ffmpeg',
                '-ss', str(clip_start),
                '-i', str(video_path),
                '-t', str(duration),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-y',
                str(output_path)
            ]
            subprocess.run(cmd_cpu, capture_output=True, text=True, check=True)
            return clip_name
    
    # Generate clips in parallel
    print("⚡ Generating clips in parallel with GPU...")
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(create_clip, info) for info in clip_times]
        
        completed = 0
        for future in as_completed(futures):
            future.result()
            completed += 1
            if completed % 20 == 0:
                print(f"📊 Progress: {completed}/{len(clip_times)} clips")
    
    elapsed = time.time() - start_time
    clips = sorted(clips_dir.glob('clip_*m*s-*m*s.mp4'))
    
    print(f"✅ Created {len(clips)} clips in {elapsed:.1f} seconds ({len(clips)/elapsed:.1f} clips/sec)")
    print(f"📁 Saved to: {clips_dir}")
    
    return len(clips)

def extract_calibration_frames(clips_dir, frames_dir):
    """Extract 2 frames per clip (at overlap points)"""
    print(f"\n📸 Extracting calibration frames (2 per clip)...")
    
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    clips = sorted(clips_dir.glob('clip_*m*s-*m*s.mp4'))
    print(f"📊 Found {len(clips)} clips → will extract {len(clips) * 2} frames")
    
    def extract_frame(clip_path, offset_seconds):
        """Extract frame from clip"""
        import re
        # Parse: clip_011m00s-011m30s.mp4 → focus starts at 11:00 = 660s
        match = re.search(r'clip_(\d+)m(\d+)s-', clip_path.name)
        if not match:
            return None
        
        focus_start = int(match.group(1)) * 60 + int(match.group(2))
        
        # Frame at focus_start + offset
        frame_timestamp = focus_start + offset_seconds
        output_path = frames_dir / f"frame_{frame_timestamp:05d}s.jpg"
        
        if output_path.exists():
            return output_path.name
        
        # Offset in clip = OVERLAP + offset_seconds
        # (clip starts 5s before focus, so offset 0 is at 5s into clip)
        clip_offset = OVERLAP + offset_seconds
        
        cmd = [
            'ffmpeg',
            '-ss', str(clip_offset),
            '-i', str(clip_path),
            '-vframes', '1',
            '-q:v', '5',
            '-y',
            str(output_path)
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            return output_path.name
        except:
            return None
    
    # Extract frames in parallel
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = []
        for clip in clips:
            futures.append(executor.submit(extract_frame, clip, 0))   # Start of focus range
            futures.append(executor.submit(extract_frame, clip, 15))  # Middle of focus range
        
        completed = 0
        for future in as_completed(futures):
            result = future.result()
            if result:
                completed += 1
            if completed % 40 == 0:
                print(f"📊 Progress: {completed}/{len(futures)} frames")
    
    frames = sorted(frames_dir.glob('frame_*s.jpg'))
    elapsed = time.time() - start_time
    
    print(f"✅ Extracted {len(frames)} frames in {elapsed:.1f} seconds ({len(frames)/elapsed:.1f} frames/sec)")
    print(f"📁 Saved to: {frames_dir}")
    
    return len(frames)

if __name__ == "__main__":
    print(f"🎬 STAGE 0: GENERATE OVERLAPPING CLIPS & CALIBRATION FRAMES")
    print(f"Game: {ARGS.game}")
    print("=" * 70)
    
    if not VIDEO_PATH.exists():
        print(f"❌ Video not found: {VIDEO_PATH}")
        exit(1)
    
    # Get duration
    duration = get_video_duration(VIDEO_PATH)
    if duration:
        print(f"📹 Video: {VIDEO_PATH.name}")
        print(f"⏱️  Duration: {duration/60:.1f} minutes ({duration} seconds)")
    else:
        print(f"❌ Could not read video duration")
        exit(1)
    
    # Load game profile if it exists
    game_profile_path = GAME_ROOT / "inputs" / "game_profile.json"
    game_start = 0
    game_end = None
    
    if game_profile_path.exists():
        with open(game_profile_path, 'r') as f:
            profile = json.load(f)
            game_start = profile['match_times']['start']
            game_end = profile['match_times']['end']
            print(f"✅ Using calibrated game times from game_profile.json")
            
            # If duration specified, limit to that many minutes from game start
            if ARGS.duration:
                game_end = min(game_start + (ARGS.duration * 60), game_end)
                print(f"📏 Limiting to first {ARGS.duration} minutes: {game_start//60}:{game_start%60:02d} - {game_end//60}:{game_end%60:02d}")
    else:
        print(f"⚠️  No game_profile.json found - generating clips from start")
        print(f"   Recommend running calibration first: python3 0.5_calibrate_game.py --game {ARGS.game}")
    
    print("=" * 70)
    print("STEP 1: GENERATING 30-SECOND CLIPS WITH 5S OVERLAP")
    print("=" * 70)
    
    num_clips = generate_overlapping_clips(VIDEO_PATH, CLIPS_DIR, duration, game_start, game_end)
    
    if num_clips:
        print(f"✅ Created {num_clips} clips")
        print(f"   - Each clip: 40s total (5s before + 30s focus + 5s after)")
        print(f"   - Overlap: 10s between consecutive clips")
        print(f"📁 Saved to: {CLIPS_DIR}")
    
    print("=" * 70)
    print("STEP 2: EXTRACTING CALIBRATION FRAMES FROM CLIPS")
    print("=" * 70)
    
    num_frames = extract_calibration_frames(CLIPS_DIR, FRAMES_DIR)
    
    print("=" * 70)
    print("✅ PREPROCESSING COMPLETE!")
    print("=" * 70)
    print(f"📊 Clips: {num_clips} clips (30s content + 10s overlap)")
    print(f"📸 Frames: {num_frames} frames (2 per clip)")
    print(f"⚡ NEW: 5-second overlap between clips for better context")
    
    if game_profile_path.exists():
        print(f"\n✅ Clips start at {game_start//60}:{game_start%60:02d} (calibrated game start)")
        print(f"\nNext: python3 1_clips_to_descriptions.py --game {ARGS.game} --start-clip 1 --end-clip {num_clips}")
    else:
        print(f"\n⚠️  Clips start at 0:00 (no calibration)")
        print(f"   Recommend: python3 0.5_calibrate_game.py --game {ARGS.game}")


