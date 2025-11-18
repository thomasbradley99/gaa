#!/usr/bin/env python3
"""
Stage 0.0: Download Calibration Frames
Extracts a few frames from the video for team detection and half identification
"""

import subprocess
from pathlib import Path


def run(video_url, work_dir):
    """
    Extract calibration frames from video without downloading entire file
    
    Args:
        video_url: VEO video URL
        work_dir: Working directory path
        
    Returns:
        frames_dir: Path to directory containing calibration frames
    """
    frames_dir = work_dir / "calibration_frames"
    frames_dir.mkdir(exist_ok=True)
    
    print(f"📸 Extracting calibration frames from: {video_url}")
    
    # Extract frames at strategic timestamps
    # Frame 1: 30s (start of game, teams in position)
    # Frame 2: 5 minutes (gameplay established)
    # Frame 3: 25 minutes (mid-first-half, check if half still ongoing)
    
    timestamps = [
        (30, "00m30s"),      # 30 seconds
        (300, "05m00s"),     # 5 minutes
        (1500, "25m00s"),    # 25 minutes
    ]
    
    for seconds, label in timestamps:
        output_path = frames_dir / f"frame_{label}.jpg"
        
        cmd = [
            'ffmpeg',
            '-ss', str(seconds),
            '-i', video_url,
            '-frames:v', '1',
            '-q:v', '2',  # High quality
            '-y',
            str(output_path)
        ]
        
        try:
            print(f"   Extracting frame at {label}...")
            subprocess.run(cmd, capture_output=True, check=True, timeout=30)
            print(f"   ✅ Saved {output_path.name}")
        except subprocess.TimeoutExpired:
            print(f"   ⚠️  Timeout extracting frame at {label}, skipping")
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️  Failed to extract frame at {label}: {e}")
    
    # Verify we got at least one frame
    frames = list(frames_dir.glob("*.jpg"))
    if not frames:
        raise RuntimeError("Failed to extract any calibration frames")
    
    print(f"✅ Extracted {len(frames)} calibration frames")
    return frames_dir

