#!/usr/bin/env python3
"""
Aggressive Video Compression Script
Optimized for Tesla T4 GPU + 4-core CPU
"""

import subprocess
import os
from pathlib import Path

def compress_video_aggressive(input_file, output_file):
    """
    Aggressive compression using GPU acceleration
    Target: 2.8GB → ~300-500MB (80-90% reduction)
    """
    
    # GPU-accelerated H.265 encoding with aggressive settings
    cmd = [
        'ffmpeg',
        '-i', input_file,
        # '-c:v', 'hevc_nvenc',  # Use NVIDIA GPU encoder #ram - compatibility modification - old setting
        '-c:v', 'h264_nvenc',    #ram - compatibility modification - use H.264 for wider support
        '-pix_fmt', 'yuv420p', #ram - compatibility modification - for QuickTime
        '-preset', 'p7',        # Fastest preset for GPU
        '-rc', 'vbr',           # Variable bitrate
        '-cq', '28',            # High compression (18-28 range, higher = more compression)
        '-b:v', '800k',         # Target bitrate (very aggressive)
        '-maxrate', '1200k',    # Maximum bitrate
        '-bufsize', '1600k',    # Buffer size
        '-c:a', 'aac',          # Audio codec
        '-b:a', '64k',          # Audio bitrate (low)
        '-ar', '22050',         # Audio sample rate (reduced)
        '-ac', '1',             # Mono audio
        '-vf', 'scale=1280:720', # Downscale to 720p
        '-r', '25',             # Reduce frame rate to 25fps
        '-movflags', '+faststart', # Optimize for streaming
        '-y',                   # Overwrite output
        output_file
    ]
    
    print(f"🚀 Starting aggressive compression...")
    print(f"📁 Input: {input_file}")
    print(f"📁 Output: {output_file}")
    print(f"🎯 Target: ~300-500MB (80-90% reduction)")
    print(f"⚡ Using Tesla T4 GPU acceleration")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            # Get final file size
            output_size = os.path.getsize(output_file) / (1024 * 1024)  # MB
            input_size = os.path.getsize(input_file) / (1024 * 1024)     # MB
            reduction = ((input_size - output_size) / input_size) * 100
            
            print(f"✅ Compression complete!")
            print(f"📊 Original: {input_size:.1f}MB")
            print(f"📊 Compressed: {output_size:.1f}MB")
            print(f"📊 Reduction: {reduction:.1f}%")
            
        else:
            print(f"❌ Compression failed!")
            print(f"Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error during compression: {e}")

def compress_video_ultra_aggressive(input_file, output_file):
    """
    Ultra-aggressive compression for maximum size reduction
    Target: 2.8GB → ~150-300MB (90-95% reduction)
    """
    
    cmd = [
        'ffmpeg',
        '-i', input_file,
        # '-c:v', 'hevc_nvenc', #ram - compatibility modification - old setting
        '-c:v', 'h264_nvenc', #ram - compatibility modification - use H.264 for wider support
        '-pix_fmt', 'yuv420p', #ram - compatibility modification - for QuickTime
        '-preset', 'p7',
        '-rc', 'vbr',
        '-cq', '32',            # Even higher compression
        '-b:v', '500k',         # Very low bitrate
        '-maxrate', '800k',
        '-bufsize', '1000k',
        '-c:a', 'aac',
        '-b:a', '32k',          # Very low audio bitrate
        '-ar', '16000',         # Lower sample rate
        '-ac', '1',
        '-vf', 'scale=854:480', # Downscale to 480p
        '-r', '20',             # Lower frame rate
        '-movflags', '+faststart',
        '-y',
        output_file
    ]
    
    print(f"🔥 Starting ULTRA-aggressive compression...")
    print(f"📁 Input: {input_file}")
    print(f"📁 Output: {output_file}")
    print(f"🎯 Target: ~150-300MB (90-95% reduction)")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            output_size = os.path.getsize(output_file) / (1024 * 1024)
            input_size = os.path.getsize(input_file) / (1024 * 1024)
            reduction = ((input_size - output_size) / input_size) * 100
            
            print(f"✅ Ultra-compression complete!")
            print(f"📊 Original: {input_size:.1f}MB")
            print(f"📊 Compressed: {output_size:.1f}MB")
            print(f"📊 Reduction: {reduction:.1f}%")
            
        else:
            print(f"❌ Compression failed!")
            print(f"Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Error during compression: {e}")

def main():
    print("🎬 AGGRESSIVE VIDEO COMPRESSION")
    print("=" * 50)
    
    # Setup paths
    input_file = "downloads/kevy-game.mp4"
    downloads_dir = Path("downloads")
    
    if not Path(input_file).exists():
        print(f"❌ Input file not found: {input_file}")
        return
    
    # Check input file size
    input_size_mb = os.path.getsize(input_file) / (1024 * 1024)
    print(f"📁 Input file: {input_file}")
    print(f"📊 Size: {input_size_mb:.1f}MB")
    
    # Create compressed versions
    print("\n" + "="*50)
    
    # Option 1: Aggressive compression
    aggressive_output = "downloads/kevy-game-compressed.mp4"
    compress_video_aggressive(input_file, aggressive_output)
    
    print("\n" + "="*50)
    
    # Option 2: Ultra-aggressive compression
    ultra_output = "downloads/kevy-game-ultra-compressed.mp4"
    compress_video_ultra_aggressive(input_file, ultra_output)
    
    print("\n" + "="*50)
    print("🎉 Compression complete!")
    print("📁 Files created:")
    print(f"   - {aggressive_output}")
    print(f"   - {ultra_output}")
    print("\n💡 Choose based on your needs:")
    print("   - Aggressive: Good quality, ~300-500MB")
    print("   - Ultra: Smaller size, ~150-300MB")

if __name__ == "__main__":
    main() 