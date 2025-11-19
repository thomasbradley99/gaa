#!/usr/bin/env python3
"""
Create Hero Video - Combine multiple videos into a single hero video for the landing page
"""

import os
import subprocess
from pathlib import Path
import sys

def get_video_files(source_dir):
    """Get all video files from source directory"""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.webm']
    video_files = []
    
    for ext in video_extensions:
        video_files.extend(source_dir.glob(f'*{ext}'))
        video_files.extend(source_dir.glob(f'*{ext.upper()}'))
    
    # Sort by name to ensure consistent ordering
    return sorted(video_files)


def transcode_to_common_format(input_file, output_file, fps=30):
    """Transcode video to common format (h264, 30fps)"""
    cmd = [
        'ffmpeg',
        '-i', str(input_file),
        '-r', str(fps),
        '-vcodec', 'libx264',
        '-crf', '23',
        '-preset', 'medium',
        '-acodec', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        str(output_file)
    ]
    
    print(f"  Transcoding: {input_file.name}")
    subprocess.run(cmd, check=True, capture_output=True)


def concatenate_videos(video_list_file, output_file, fps=30):
    """Concatenate videos using ffmpeg concat demuxer"""
    cmd = [
        'ffmpeg',
        '-f', 'concat',
        '-safe', '0',
        '-i', str(video_list_file),
        '-c', 'copy',
        '-y',
        str(output_file)
    ]
    
    print(f"\n🔗 Concatenating {len(open(video_list_file).readlines())} videos...")
    subprocess.run(cmd, check=True, capture_output=True)


def optimize_for_web(input_file, output_file):
    """Final optimization for web delivery"""
    cmd = [
        'ffmpeg',
        '-i', str(input_file),
        '-vcodec', 'libx264',
        '-crf', '28',  # More compression for web
        '-preset', 'slow',  # Better compression
        '-profile:v', 'main',
        '-level', '4.0',
        '-pix_fmt', 'yuv420p',
        '-acodec', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart',  # Enable streaming
        '-y',
        str(output_file)
    ]
    
    print(f"\n🎬 Optimizing for web...")
    subprocess.run(cmd, check=True, capture_output=True)


def main():
    # Paths
    script_dir = Path(__file__).parent
    source_dir = script_dir / 'hero-video-source'
    cache_dir = script_dir / '.hero-video-cache'
    output_file = script_dir / 'gaa-webapp' / 'frontend' / 'public' / 'hero-video.mp4'
    
    print(f"\n🎥 Hero Video Creator")
    print(f"=" * 60)
    print(f"Source directory: {source_dir}")
    print(f"Output file: {output_file}")
    print(f"=" * 60 + "\n")
    
    # Check if source directory exists
    if not source_dir.exists():
        print(f"❌ Error: Source directory not found: {source_dir}")
        print(f"\nPlease create the directory and add your video files:")
        print(f"  mkdir -p {source_dir}")
        sys.exit(1)
    
    # Get video files
    video_files = get_video_files(source_dir)
    
    if not video_files:
        print(f"❌ Error: No video files found in {source_dir}")
        print(f"\nSupported formats: .mp4, .mov, .avi, .mkv, .m4v, .webm")
        sys.exit(1)
    
    print(f"📹 Found {len(video_files)} video file(s):")
    for vf in video_files:
        size_mb = vf.stat().st_size / (1024 * 1024)
        print(f"  - {vf.name} ({size_mb:.1f} MB)")
    
    # Create cache directory
    cache_dir.mkdir(exist_ok=True)
    
    # Step 1: Transcode all videos to common format
    print(f"\n📝 Step 1: Transcoding to common format (30fps, h264)...")
    transcoded_files = []
    
    for i, video_file in enumerate(video_files):
        transcoded_file = cache_dir / f"transcoded_{i}.mp4"
        transcode_to_common_format(video_file, transcoded_file)
        transcoded_files.append(transcoded_file)
    
    print(f"✅ Transcoding complete")
    
    # Step 2: Create concat list
    concat_list_file = cache_dir / 'concat_list.txt'
    with open(concat_list_file, 'w') as f:
        for tf in transcoded_files:
            f.write(f"file '{tf.absolute()}'\n")
    
    # Step 3: Concatenate videos
    temp_output = cache_dir / 'concatenated.mp4'
    concatenate_videos(concat_list_file, temp_output)
    print(f"✅ Concatenation complete")
    
    # Step 4: Optimize for web
    optimize_for_web(temp_output, output_file)
    
    # Get final file size
    final_size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"✅ Optimization complete")
    
    print(f"\n{'=' * 60}")
    print(f"✨ SUCCESS! Hero video created:")
    print(f"   {output_file}")
    print(f"   Size: {final_size_mb:.1f} MB")
    print(f"{'=' * 60}\n")
    
    # Cleanup cache
    print(f"🧹 Cleaning up cache...")
    import shutil
    shutil.rmtree(cache_dir)
    print(f"✅ Done!\n")


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as e:
        print(f"\n❌ FFmpeg error: {e}")
        print(f"Command: {' '.join(e.cmd)}")
        if e.stderr:
            print(f"Error output: {e.stderr.decode()}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

