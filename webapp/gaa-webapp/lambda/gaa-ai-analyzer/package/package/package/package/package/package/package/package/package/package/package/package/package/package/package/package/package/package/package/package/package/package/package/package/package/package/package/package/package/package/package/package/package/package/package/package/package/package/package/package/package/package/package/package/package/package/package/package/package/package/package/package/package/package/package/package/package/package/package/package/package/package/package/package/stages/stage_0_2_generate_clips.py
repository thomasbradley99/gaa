#!/usr/bin/env python3
"""
Stage 0.2: Generate Clips
Splits 10-minute video into 60-second clips
"""

import subprocess
import time
from pathlib import Path


def run(video_path, work_dir):
    """
    Generate 10 x 60-second clips from 10-minute video
    
    Args:
        video_path: Path to 10-minute video file
        work_dir: Working directory
        
    Returns:
        clips_dir: Directory containing generated clips
    """
    clips_dir = work_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    
    print(f"✂️  Generating 60-second clips from {video_path.name}")
    
    # Use ffmpeg segment mode - ULTRA FAST (stream copy, no re-encoding)
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-f', 'segment',
        '-segment_time', '60',          # 60 second clips
        '-segment_format', 'mp4',
        '-c', 'copy',                   # Stream copy - NO RE-ENCODING!
        '-reset_timestamps', '1',
        '-segment_start_number', '0',
        '-y',
        str(clips_dir / 'temp_clip_%02d.mp4')
    ]
    
    try:
        print("⚡ Running ffmpeg segmentation (stream copy - ultra fast)...")
        start_time = time.time()
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=60  # Should be very fast with stream copy
        )
        
        elapsed = time.time() - start_time
        
        # Rename clips to standard format (clip_000.mp4, clip_001.mp4, etc.)
        temp_clips = sorted(clips_dir.glob('temp_clip_*.mp4'))
        
        for i, temp_clip in enumerate(temp_clips):
            final_name = clips_dir / f"clip_{i:03d}.mp4"
            temp_clip.rename(final_name)
        
        clips = sorted(clips_dir.glob('clip_*.mp4'))
        
        print(f"✅ Generated {len(clips)} clips in {elapsed:.1f}s")
        
        # Verify we have clips
        if len(clips) == 0:
            raise RuntimeError("No clips were generated")
        
        return clips_dir
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("Timeout generating clips")
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg stderr: {e.stderr}")
        raise RuntimeError(f"Failed to generate clips: {e}")

