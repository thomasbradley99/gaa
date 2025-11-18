#!/usr/bin/env python3
"""
Stage 0.1: Extract First 10 Minutes
Extracts the first 10 minutes of the first half from VEO URL
"""

import subprocess
from pathlib import Path


def run(video_url, game_profile, work_dir):
    """
    Extract first 10 minutes of match based on calibrated start time
    
    Args:
        video_url: VEO video URL
        game_profile: Calibrated game profile with match start time
        work_dir: Working directory
        
    Returns:
        video_path: Path to extracted 10-minute video file
    """
    output_path = work_dir / "first_10mins.mp4"
    
    # Get match start time from profile
    start_time = game_profile['match_times']['start']
    
    # Extract 10 minutes from start_time
    duration = 600  # 10 minutes in seconds
    
    print(f"📹 Extracting first 10 minutes from VEO URL")
    print(f"   Start time: {start_time}s ({start_time//60}m{start_time%60:02d}s)")
    print(f"   Duration: {duration}s (10 minutes)")
    
    cmd = [
        'ffmpeg',
        '-ss', str(start_time),       # Start at match beginning
        '-i', video_url,                # Input from VEO URL
        '-t', str(duration),            # Duration: 10 minutes
        '-c', 'copy',                   # Stream copy (no re-encoding, super fast!)
        '-y',
        str(output_path)
    ]
    
    try:
        print("⚡ Streaming and extracting...")
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            check=True,
            timeout=180  # 3 minute timeout
        )
        
        # Check file size
        file_size_mb = output_path.stat().st_size / 1024 / 1024
        print(f"✅ Extracted {file_size_mb:.1f} MB")
        
        return output_path
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("Timeout extracting video - VEO URL may be slow or inaccessible")
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg stderr: {e.stderr}")
        raise RuntimeError(f"Failed to extract video: {e}")

