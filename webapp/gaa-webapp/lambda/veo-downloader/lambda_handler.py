#!/usr/bin/env python3
"""
GAA VEO Downloader Lambda Function
Downloads GAA match videos from VEO URLs and uploads to S3 for display.

This Lambda function:
1. Extracts direct video URL from VEO match page
2. Downloads the video file
3. Uploads to S3 bucket (clann-gaa-videos-nov25)
4. Updates game record in database with S3 key

Part of: GAA Webapp - Video Display System
"""

import json
import os
import re
import tempfile
import boto3
import psycopg2
import requests
import gc
import subprocess
from pathlib import Path

# AWS clients
s3_client = boto3.client('s3')

# Environment variables
BUCKET_NAME = os.environ['BUCKET_NAME']
DATABASE_URL = os.environ['DATABASE_URL']
AWS_REGION = os.environ.get('AWS_REGION', 'eu-west-1')
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://localhost:4011')  # Backend API URL
LAMBDA_API_KEY = os.environ.get('LAMBDA_API_KEY', 'gaa-lambda-secret-key-change-in-production')  # API key for backend


class VeoDownloader:
    """
    GAA VEO Video Downloader
    
    Extracts direct video URLs from VEO match pages and downloads GAA match videos.
    Used by Lambda function to download videos for storage in S3.
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })
    
    def extract_video_url(self, veo_url):
        """
        Extract direct video URL from GAA VEO match page
        
        Uses multiple methods to find the video ID and construct the CDN URL:
        1. Open Graph meta tags (primary method)
        2. Alternative URL patterns
        3. Video ID patterns in page content
        
        Returns direct MP4 URL or None if extraction fails.
        """
        print(f"🔍 Extracting video URL from: {veo_url}")
        
        try:
            # Fetch VEO page
            response = self.session.get(veo_url, timeout=30)
            response.raise_for_status()
            page_content = response.text
            
            # Method 1: Look for video ID in Open Graph meta tags
            og_image_pattern = r'content="https://c\.veocdn\.com/([a-f0-9\-]+)/[^"]*thumbnail\.jpg"'
            match = re.search(og_image_pattern, page_content)
            
            if match:
                video_id = match.group(1)
                print(f"✅ Found video ID: {video_id}")
                
                # Try primary video URL pattern
                video_url = f"https://c.veocdn.com/{video_id}/standard/human/1cc5edba/video.mp4"
                
                # Verify URL is accessible
                if self.verify_url(video_url):
                    return video_url
                
                # Try alternative patterns
                alternatives = [
                    f"https://c.veocdn.com/{video_id}/standard/human/video.mp4",
                    f"https://c.veocdn.com/{video_id}/standard/video.mp4",
                    f"https://c.veocdn.com/{video_id}/video.mp4"
                ]
                
                for alt_url in alternatives:
                    print(f"   🔍 Trying alternative: {alt_url}")
                    if self.verify_url(alt_url):
                        return alt_url
            
            print(f"❌ Could not extract video URL from VEO page")
            return None
            
        except Exception as e:
            print(f"❌ Error extracting video URL: {e}")
            return None
    
    def verify_url(self, url):
        """Verify video URL is accessible"""
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            return response.status_code == 200
        except:
            return False
    
    def download_video(self, video_url, output_path):
        """Download video from URL"""
        print(f"📥 Downloading video from: {video_url}")
        
        try:
            response = self.session.get(video_url, stream=True, timeout=300)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            if downloaded % (10 * 1024 * 1024) == 0:  # Log every 10MB
                                print(f"   Progress: {percent:.1f}% ({downloaded / 1024 / 1024:.1f} MB)")
            
            file_size_mb = output_path.stat().st_size / 1024 / 1024
            print(f"✅ Downloaded {file_size_mb:.1f} MB")
            return True
            
        except Exception as e:
            print(f"❌ Error downloading video: {e}")
            return False


def upload_to_s3(local_path, s3_key):
    """
    Upload GAA video file to S3 bucket
    
    Uploads downloaded video to: videos/{game_id}/video.mp4
    """
    try:
        print(f"📤 Uploading to S3: {s3_key}")
        s3_client.upload_file(
            Filename=str(local_path),
            Bucket=BUCKET_NAME,
            Key=s3_key,
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        print(f"✅ Uploaded to S3: {s3_key}")
        return True
    except Exception as e:
        print(f"❌ Failed to upload to S3: {e}")
        return False


def extract_thumbnail(video_path, thumbnail_path, timestamp=5):
    """
    Extract a thumbnail frame from video at specified timestamp
    
    Args:
        video_path: Path to video file
        thumbnail_path: Path to save thumbnail
        timestamp: Time in seconds to extract frame (default: 5)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"🖼️  Extracting thumbnail at {timestamp}s...")
        
        # Use ffmpeg to extract frame (if available in Lambda layer or bin directory)
        # Check for ffmpeg in bin directory first (bundled static binary)
        ffmpeg_path = '/var/task/bin/ffmpeg' if os.path.exists('/var/task/bin/ffmpeg') else 'ffmpeg'
        
        try:
            cmd = [
                ffmpeg_path,
                '-i', str(video_path),
                '-ss', str(timestamp),
                '-vframes', '1',
                '-vf', 'scale=480:-1',
                '-q:v', '2',
                str(thumbnail_path),
                '-y'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=30
            )
            
            if result.returncode == 0 and thumbnail_path.exists():
                print(f"✅ Thumbnail extracted: {thumbnail_path.stat().st_size / 1024:.1f} KB")
                return True
            else:
                print(f"⚠️  ffmpeg not available, skipping thumbnail")
                return False
                
        except FileNotFoundError:
            print(f"⚠️  ffmpeg not found, skipping thumbnail")
            return False
            
    except Exception as e:
        print(f"❌ Error extracting thumbnail: {e}")
        return False


def update_database(game_id, s3_key):
    """
    Update GAA game record in database
    
    Sets s3_key and status='analyzed' after successful video download.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        
        # Update s3_key and status
        cur.execute(
            "UPDATE games SET s3_key = %s, status = 'analyzed', updated_at = NOW() WHERE id = %s",
            (s3_key, game_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Updated database: game {game_id} → s3_key: {s3_key}")
        return True
    except Exception as e:
        print(f"❌ Failed to update database: {e}")
        return False


def store_events_via_api(game_id, events_data):
    """
    Store events in database via backend API endpoint
    
    Alternative to direct DB write - uses API endpoint for better security.
    
    Args:
        game_id: Game UUID
        events_data: Dictionary with 'events', 'match_info', 'team_mapping'
    
    Returns:
        True if successful, False otherwise
    """
    try:
        api_url = f"{BACKEND_API_URL}/api/games/{game_id}/events"
        
        print(f"📤 Sending events to backend API: {api_url}")
        print(f"   Events count: {len(events_data.get('events', []))}")
        
        response = requests.post(
            api_url,
            json=events_data,
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': LAMBDA_API_KEY
            },
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ Events stored via API: {result.get('events_count', 0)} events")
        return True
        
    except Exception as e:
        print(f"❌ Failed to store events via API: {e}")
        return False


def generate_xml_from_events(events, match_info=None):
    """
    Generate iSportsAnalysis-style XML from AI-generated events
    
    Args:
        events: List of event dictionaries from AI analysis
        match_info: Optional match metadata
    
    Returns:
        XML string in Anadi's format
    """
    try:
        from xml.etree.ElementTree import Element, SubElement, tostring
        from xml.dom import minidom
        
        # Create root element
        root = Element('file')
        all_instances = SubElement(root, 'ALL_INSTANCES')
        
        # Add each event as an instance
        for idx, event in enumerate(events, 1):
            instance = SubElement(all_instances, 'instance')
            
            # ID
            id_elem = SubElement(instance, 'ID')
            id_elem.text = str(idx)
            
            # Timestamps
            start_elem = SubElement(instance, 'start')
            start_elem.text = str(event.get('timestamp', 0))
            
            end_elem = SubElement(instance, 'end')
            end_elem.text = str(event.get('timestamp', 0) + event.get('duration', 5))
            
            # Event code
            code_elem = SubElement(instance, 'code')
            code_elem.text = event.get('type', 'Unknown')
            
            # Labels from metadata
            if event.get('metadata'):
                label_elem = SubElement(instance, 'label')
                group_elem = SubElement(label_elem, 'group')
                group_elem.text = 'Tags'
                
                # Add labels from metadata
                for key, value in event.get('metadata', {}).items():
                    if isinstance(value, str) and value:
                        text_elem = SubElement(label_elem, 'text')
                        text_elem.text = str(value)
        
        # Convert to pretty XML string
        xml_str = tostring(root, encoding='utf-8')
        parsed = minidom.parseString(xml_str)
        pretty_xml = parsed.toprettyxml(indent='  ', encoding='utf-8').decode('utf-8')
        
        return pretty_xml
        
    except Exception as e:
        print(f"❌ Failed to generate XML: {e}")
        return None


def upload_xml_to_s3(xml_content, s3_key):
    """
    Upload XML analysis to S3
    
    Args:
        xml_content: XML string content
        s3_key: S3 key path (e.g., 'videos/{game_id}/analysis.xml')
    
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"📤 Uploading XML to S3: {s3_key}")
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=xml_content.encode('utf-8'),
            ContentType='application/xml'
        )
        
        print(f"✅ XML uploaded to S3: {s3_key}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to upload XML to S3: {e}")
        return False


def update_database_with_xml(game_id, s3_key, xml_s3_key):
    """
    Update database with both video and XML S3 keys
    
    Args:
        game_id: Game UUID
        s3_key: Video S3 key
        xml_s3_key: XML S3 key
    
    Returns:
        True if successful, False otherwise
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor()
        
        cur.execute(
            """
            UPDATE games 
            SET s3_key = %s, 
                xml_s3_key = %s,
                status = 'analyzed',
                updated_at = NOW() 
            WHERE id = %s
            """,
            (s3_key, xml_s3_key, game_id)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Updated database: game {game_id}")
        print(f"   Video S3 key: {s3_key}")
        print(f"   XML S3 key: {xml_s3_key}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update database: {e}")
        return False


def lambda_handler(event, context):
    """
    GAA VEO Downloader + AI Analysis Lambda Handler
    
    Downloads GAA match video from VEO URL, runs AI analysis, and generates XML.
    
    Expected event format:
    {
        "game_id": "uuid",                    # Game ID from database
        "video_url": "https://veo.co/..."     # VEO match URL
    }
    
    Process:
    1. Extract direct video URL from VEO page
    2. Download video file to /tmp
    3. Upload to S3: videos/{game_id}/video.mp4
    4. [TODO] Run AI analysis on video
    5. Generate XML from AI events
    6. Upload XML to S3: videos/{game_id}/analysis.xml
    7. Store events JSON via API
    8. Update database: set s3_key, xml_s3_key, status='analyzed'
    
    Returns:
    {
        "statusCode": 200,
        "body": {
            "message": "Video processed and analyzed successfully",
            "game_id": "uuid",
            "s3_key": "videos/{game_id}/video.mp4",
            "xml_s3_key": "videos/{game_id}/analysis.xml"
        }
    }
    """
    print(f"📥 Received event: {json.dumps(event)}")
    
    try:
        game_id = event['game_id']
        veo_url = event['video_url']
        
        print(f"🎬 Processing game {game_id}")
        print(f"📹 VEO URL: {veo_url}")
        
        # Initialize downloader
        downloader = VeoDownloader()
        
        # Check if URL is already a direct video URL
        if veo_url.endswith('.mp4') or 'veocdn.com' in veo_url:
            print(f"✅ Direct video URL detected, skipping extraction")
            direct_video_url = veo_url
        else:
            # Extract direct video URL from VEO page
            print(f"🔍 VEO page URL detected, extracting video URL...")
            direct_video_url = downloader.extract_video_url(veo_url)
            if not direct_video_url:
                raise Exception("Failed to extract video URL from VEO page")
        
        # Create temp directory in /tmp (Lambda has 10GB here)
        temp_dir = "/tmp/gaa-veo-download"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = Path(temp_dir)
        video_path = temp_path / "video.mp4"
        
        try:
            # Download video
            if not downloader.download_video(direct_video_url, video_path):
                raise Exception("Failed to download video")
            
            # Extract thumbnail
            thumbnail_path = temp_path / "thumbnail.jpg"
            thumbnail_s3_key = None
            if extract_thumbnail(video_path, thumbnail_path):
                # Upload thumbnail to S3
                thumbnail_s3_key = f"videos/{game_id}/thumbnail.jpg"
                try:
                    s3_client.upload_file(
                        Filename=str(thumbnail_path),
                        Bucket=BUCKET_NAME,
                        Key=thumbnail_s3_key,
                        ExtraArgs={'ContentType': 'image/jpeg'}
                    )
                    print(f"✅ Thumbnail uploaded to S3: {thumbnail_s3_key}")
                except Exception as e:
                    print(f"⚠️  Failed to upload thumbnail: {e}")
                    thumbnail_s3_key = None
            
            # Generate S3 key: videos/{game_id}/video.mp4
            s3_key = f"videos/{game_id}/video.mp4"
            
            # Upload video to S3
            if not upload_to_s3(video_path, s3_key):
                raise Exception("Failed to upload video to S3")
            
            print(f"✅ Video uploaded to S3: {s3_key}")
            
            # Update database with video and thumbnail keys
            if thumbnail_s3_key:
                try:
                    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE games 
                        SET s3_key = %s, 
                            thumbnail_key = %s,
                            status = 'downloaded',
                            updated_at = NOW()
                        WHERE id = %s
                    """, (s3_key, thumbnail_s3_key, game_id))
                    conn.commit()
                    cur.close()
                    conn.close()
                    print(f"✅ Database updated with video and thumbnail")
                except Exception as e:
                    print(f"⚠️  Failed to update thumbnail in database: {e}")
            
            # TODO: Run AI analysis on video
            # For now, use placeholder events from the existing events API
            # When AI pipeline is ready, replace this with actual analysis
            print(f"🤖 AI Analysis: Placeholder - will be integrated when AI pipeline is ready")
            
            # Example: If events are passed in, generate XML
            # This will be replaced with actual AI-generated events
            ai_events = event.get('events', [])  # Placeholder
            
            if ai_events:
                print(f"📊 Generating XML from {len(ai_events)} events")
                
                # Generate XML from events
                xml_content = generate_xml_from_events(ai_events)
                
                if xml_content:
                    # Generate XML S3 key
                    xml_s3_key = f"videos/{game_id}/analysis.xml"
                    
                    # Upload XML to S3
                    if upload_xml_to_s3(xml_content, xml_s3_key):
                        print(f"✅ XML generated and uploaded: {xml_s3_key}")
                        
                        # Store events via API
                        events_data = {
                            'events': ai_events,
                            'match_info': event.get('match_info', {}),
                            'team_mapping': event.get('team_mapping', {})
                        }
                        store_events_via_api(game_id, events_data)
                        
                        # Update database with both S3 keys
                        if not update_database_with_xml(game_id, s3_key, xml_s3_key):
                            raise Exception("Failed to update database with XML key")
                        
                        return {
                            'statusCode': 200,
                            'body': json.dumps({
                                'message': 'Video processed and analyzed successfully',
                                'game_id': game_id,
                                's3_key': s3_key,
                                'xml_s3_key': xml_s3_key,
                                'events_count': len(ai_events)
                            })
                        }
            
            # If no events, just update database with video key
            if not update_database(game_id, s3_key):
                raise Exception("Failed to update database")
            
            print(f"✅ Video download complete (no analysis yet)")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Video downloaded and uploaded successfully',
                    'game_id': game_id,
                    's3_key': s3_key,
                    'note': 'AI analysis will be added when pipeline is ready'
                })
            }
        finally:
            # Cleanup: Remove downloaded files to free up /tmp space
            if video_path.exists():
                video_path.unlink()
                print(f"🧹 Cleaned up temp video: {video_path}")
            
            thumbnail_path = temp_path / "thumbnail.jpg"
            if thumbnail_path.exists():
                thumbnail_path.unlink()
                print(f"🧹 Cleaned up temp thumbnail: {thumbnail_path}")
            
    except Exception as e:
        print(f"❌ Lambda failed: {e}")
        
        # Update database status to failed
        try:
            conn = psycopg2.connect(DATABASE_URL, sslmode='require')
            cur = conn.cursor()
            cur.execute(
                "UPDATE games SET status = 'failed', updated_at = NOW() WHERE id = %s",
                (event.get('game_id'),)
            )
            conn.commit()
            cur.close()
            conn.close()
        except:
            pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'game_id': event.get('game_id', 'unknown')
            })
        }

