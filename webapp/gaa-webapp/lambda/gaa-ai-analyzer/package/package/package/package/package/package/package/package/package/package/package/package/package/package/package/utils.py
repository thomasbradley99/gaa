"""
Utility functions for GAA AI Analyzer Lambda
- Database operations (status, progress, thumbnail)
- Thumbnail generation with ffmpeg
- Video download
"""

import json
import subprocess
import psycopg2
import requests
from pathlib import Path

# Database connection from environment (set by Lambda)
import os
DATABASE_URL = os.environ.get('DATABASE_URL')


def update_video_status(game_id, status, error=None):
    """Update game processing status"""
    if not DATABASE_URL:
        print(f"⚠️ No DATABASE_URL - skipping status update to '{status}'")
        return
        
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        
        if error:
            error_metadata = json.dumps({
                'error': str(error),
                'status': status
            })
            cur.execute("""
                UPDATE games 
                SET status = %s, 
                    processing_progress = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (status, error_metadata, game_id))
        else:
            cur.execute("""
                UPDATE games 
                SET status = %s, updated_at = NOW()
                WHERE id = %s
            """, (status, game_id))
        
        conn.commit()
        print(f"✅ Status updated to '{status}' for game {game_id}")
        
    except Exception as e:
        print(f"❌ Failed to update status: {str(e)}")
    finally:
        if conn:
            conn.close()


def update_processing_progress(game_id, stage, percent, data=None):
    """
    Update incremental processing progress in database
    Allows frontend to show real-time progress and partial data
    """
    if not DATABASE_URL:
        print(f"⚠️ No DATABASE_URL - skipping progress update")
        return
        
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        
        # Build progress data
        progress_data = {
            'stage': stage,
            'percent': percent,
            'updated_at': 'NOW()'
        }
        
        # Add optional data
        if data:
            progress_data.update(data)
        
        cur.execute("""
            UPDATE games
            SET processing_progress = %s
            WHERE id = %s
        """, (json.dumps(progress_data), game_id))
        
        conn.commit()
        print(f"📊 Progress updated: {stage} ({percent}%)")
        
    except Exception as e:
        print(f"⚠️ Failed to update progress (non-critical): {str(e)}")
        # Don't fail the whole process if progress update fails
    finally:
        if conn:
            conn.close()


def update_thumbnail(game_id, thumbnail_s3_key):
    """Update game with thumbnail S3 key"""
    if not DATABASE_URL:
        print(f"⚠️ No DATABASE_URL - skipping thumbnail update")
        return
        
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        
        cur.execute("""
            UPDATE games
            SET thumbnail_key = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (thumbnail_s3_key, game_id))
        
        conn.commit()
        print(f"✅ Thumbnail updated for game {game_id}")
        
    except Exception as e:
        print(f"❌ Failed to update thumbnail: {str(e)}")
    finally:
        if conn:
            conn.close()


def extract_thumbnail(video_path, output_path, timestamp=5):
    """
    Extract a thumbnail from video at given timestamp using ffmpeg
    Args:
        video_path: Path to input video
        output_path: Path where thumbnail should be saved
        timestamp: Time in seconds to extract frame (default: 5)
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        cmd = [
            'ffmpeg',
            '-ss', str(timestamp),
            '-i', str(video_path),
            '-vframes', '1',
            '-q:v', '2',  # Quality (2 = high quality)
            '-y',  # Overwrite
            str(output_path)
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0 and Path(output_path).exists():
            size_kb = Path(output_path).stat().st_size / 1024
            print(f"✅ Thumbnail extracted: {size_kb:.1f}KB")
            return True
        else:
            print(f"⚠️ Thumbnail extraction failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"⚠️ Could not extract thumbnail: {e}")
        return False


def upload_to_s3(local_path, s3_key, bucket_name, content_type=None):
    """
    Upload a file to S3
    Args:
        local_path: Path to local file
        s3_key: S3 key (path in bucket)
        bucket_name: S3 bucket name
        content_type: MIME type (optional)
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        import boto3
        s3_client = boto3.client('s3')
        
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        with open(local_path, 'rb') as f:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=f,
                **extra_args
            )
        
        print(f"✅ Uploaded to S3: s3://{bucket_name}/{s3_key}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to upload to S3: {e}")
        return False


def download_video(video_url, output_path):
    """
    Download video from URL to local file
    Args:
        video_url: URL to download from
        output_path: Path to save video to
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"📥 Downloading video from: {video_url}")
        print(f"   Saving to: {output_path}")
        
        response = requests.get(video_url, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0 and downloaded % (10 * 1024 * 1024) == 0:  # Log every 10MB
                        progress = (downloaded / total_size) * 100
                        print(f"   📊 Downloaded {downloaded / (1024*1024):.1f}MB / {total_size / (1024*1024):.1f}MB ({progress:.0f}%)")
        
        file_size = Path(output_path).stat().st_size
        print(f"✅ Video downloaded: {file_size / (1024*1024):.1f}MB")
        return True
        
    except Exception as e:
        print(f"❌ Failed to download video: {e}")
        return False

