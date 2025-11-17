#!/usr/bin/env python3
"""
GAA AI Analyzer Lambda - S3 Version
Analyzes videos already in S3 (uploaded by veo-downloader Lambda)
"""

import json
import os
import tempfile
import requests
import boto3
from pathlib import Path
from utils import (
    update_video_status,
    update_processing_progress,
    update_thumbnail,
    extract_thumbnail,
    upload_to_s3
)
from stages import (
    stage_0_0_download_calibration_frames,
    stage_0_5_calibrate_game,
    stage_0_1_extract_first_10mins,
    stage_0_2_generate_clips,
    stage_1_clips_to_descriptions,
    stage_2_create_coherent_narrative,
    stage_3_event_classification,
    stage_4_json_extraction,
    stage_5_export_to_anadi_xml
)

# Environment variables
BACKEND_API_URL = os.environ.get('BACKEND_API_URL', 'http://localhost:4011')
LAMBDA_API_KEY = os.environ.get('LAMBDA_API_KEY', 'gaa-lambda-secret-key')
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']
BUCKET_NAME = os.environ.get('AWS_BUCKET_NAME', 'clann-gaa-videos-nov25')
AWS_REGION = os.environ.get('AWS_REGION', 'eu-west-1')

# S3 client
s3_client = boto3.client('s3', region_name=AWS_REGION)


def download_video_from_s3(s3_key, local_path):
    """Download video from S3 to local file"""
    try:
        print(f"📥 Downloading from S3: {s3_key}")
        print(f"   Bucket: {BUCKET_NAME}")
        print(f"   Local path: {local_path}")
        
        # Get file size first
        head = s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        file_size_mb = head['ContentLength'] / 1024 / 1024
        print(f"   File size: {file_size_mb:.1f} MB")
        
        # Download with progress tracking
        s3_client.download_file(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Filename=str(local_path)
        )
        
        downloaded_size_mb = Path(local_path).stat().st_size / 1024 / 1024
        print(f"✅ Downloaded {downloaded_size_mb:.1f} MB from S3")
        return True
        
    except Exception as e:
        print(f"❌ Failed to download from S3: {e}")
        return False


def post_results_to_backend(game_id, events_json, team_mapping=None):
    """Post analysis results back to backend API"""
    try:
        payload = {
            'events': events_json.get('events', []),
            'match_info': {
                'title': events_json.get('title', 'GAA Match'),
                'total_events': len(events_json.get('events', [])),
                'analysis_method': 'Gemini AI - First 10 minutes',
                'created_at': events_json.get('timestamp')
            }
        }
        
        # Add team mapping if available
        if team_mapping:
            payload['team_mapping'] = team_mapping
        
        print(f"📤 Posting {len(payload['events'])} events to backend...")
        
        response = requests.post(
            f"{BACKEND_API_URL}/api/games/{game_id}/events",
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': LAMBDA_API_KEY
            },
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        print(f"✅ Posted events to backend for game {game_id}")
        
    except Exception as e:
        print(f"❌ Failed to post results to backend: {e}")
        raise


def lambda_handler(event, context):
    """
    Main Lambda handler - orchestrates the GAA AI analysis pipeline
    
    Event format:
    {
        "game_id": "uuid",
        "s3_key": "videos/{game_id}/video.mp4",
        "title": "Team A vs Team B"  (optional)
    }
    """
    print("🎬 GAA AI Analyzer Lambda started (S3 Mode)")
    print(f"📥 Event: {json.dumps(event)}")
    
    # Extract event data
    game_id = event.get('game_id')
    s3_key = event.get('s3_key')
    title = event.get('title', 'Unknown Match')
    
    if not game_id or not s3_key:
        raise ValueError("Missing required fields: game_id, s3_key")
    
    # Update status to 'processing' 
    update_video_status(game_id, 'processing')
    update_processing_progress(game_id, 'Starting AI analysis', 0)
    
    # Create working directory in /tmp
    work_dir = Path(tempfile.mkdtemp(prefix='gaa-analysis-'))
    print(f"📁 Working directory: {work_dir}")
    
    try:
        # Download video from S3
        print("\n" + "="*60)
        print("DOWNLOADING VIDEO FROM S3")
        print("="*60)
        update_processing_progress(game_id, 'Downloading video from S3', 5)
        video_file = work_dir / "full_video.mp4"
        if not download_video_from_s3(s3_key, video_file):
            raise RuntimeError("Failed to download video from S3")
        
        # Stage 0.0: Download calibration frames
        print("\n" + "="*60)
        print("STAGE 0.0: Extract Calibration Frames")
        print("="*60)
        update_processing_progress(game_id, 'Extracting calibration frames', 10)
        frames_dir = stage_0_0_download_calibration_frames.run(
            video_url=str(video_file),
            work_dir=work_dir
        )
        
        # Stage 0.5: Calibrate game (detect teams, match start time)
        print("\n" + "="*60)
        print("STAGE 0.5: Calibrate Game")
        print("="*60)
        update_processing_progress(game_id, 'Calibrating game (detecting teams & start time)', 18)
        game_profile = stage_0_5_calibrate_game.run(
            frames_dir=frames_dir,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        
        team_a_color = game_profile['team_a']['jersey_color']
        team_b_color = game_profile['team_b']['jersey_color']
        match_start = game_profile['match_times']['start']
        
        print(f"✅ Game calibrated:")
        print(f"   Team A: {team_a_color}")
        print(f"   Team B: {team_b_color}")
        print(f"   Match starts at: {match_start}s ({match_start//60}m{match_start%60:02d}s)")
        
        # Stage 0.1: Extract first 10 minutes (from match start time)
        print("\n" + "="*60)
        print("STAGE 0.1: Extract First 10 Minutes")
        print("="*60)
        update_processing_progress(game_id, 'Extracting first 10 minutes of match', 28)
        video_path = stage_0_1_extract_first_10mins.run(
            video_url=str(video_file),
            game_profile=game_profile,
            work_dir=work_dir
        )
        
        # Stage 0.2: Generate clips (10 x 60s clips)
        print("\n" + "="*60)
        print("STAGE 0.2: Generate Clips")
        print("="*60)
        update_processing_progress(game_id, 'Generating video clips', 38)
        clips_dir = stage_0_2_generate_clips.run(
            video_path=video_path,
            work_dir=work_dir
        )
        
        # Stage 1: Clips to descriptions (PARALLEL Gemini API calls)
        print("\n" + "="*60)
        print("STAGE 1: Clips to Descriptions (Parallel)")
        print("="*60)
        update_processing_progress(game_id, 'Analyzing clips with AI (10 clips in parallel)', 48)
        descriptions = stage_1_clips_to_descriptions.run(
            clips_dir=clips_dir,
            game_profile=game_profile,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        
        # Stage 2: Create coherent narrative
        print("\n" + "="*60)
        print("STAGE 2: Create Coherent Narrative")
        print("="*60)
        update_processing_progress(game_id, 'Creating match narrative', 62)
        narrative = stage_2_create_coherent_narrative.run(
            descriptions=descriptions,
            game_profile=game_profile,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        
        # Stage 3: Event classification
        print("\n" + "="*60)
        print("STAGE 3: Event Classification")
        print("="*60)
        update_processing_progress(game_id, 'Classifying GAA events', 75)
        classified_events = stage_3_event_classification.run(
            narrative=narrative,
            game_profile=game_profile,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        
        # Stage 4: Extract JSON
        print("\n" + "="*60)
        print("STAGE 4: Extract JSON")
        print("="*60)
        update_processing_progress(game_id, 'Extracting structured event data', 85)
        events_json = stage_4_json_extraction.run(
            classified_events=classified_events,
            game_profile=game_profile,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        
        # Stage 5: Export to Anadi XML
        print("\n" + "="*60)
        print("STAGE 5: Export to Anadi XML")
        print("="*60)
        update_processing_progress(game_id, 'Generating XML export', 92)
        xml_content = stage_5_export_to_anadi_xml.run(
            events_json=events_json,
            game_profile=game_profile,
            title=title
        )
        
        # Upload XML to S3
        xml_s3_key = f"videos/{game_id}/analysis.xml"
        xml_path = work_dir / "analysis.xml"
        with open(xml_path, 'w') as f:
            f.write(xml_content)
        
        if upload_to_s3(str(xml_path), xml_s3_key, BUCKET_NAME, 'application/xml'):
            print(f"✅ XML uploaded to S3: {xml_s3_key}")
        
        # Create team mapping for frontend
        team_mapping = {
            'red': 'home',  # Default mapping
            'blue': 'away'
        }
        
        # Post results back to backend
        print("\n" + "="*60)
        print("POSTING RESULTS TO BACKEND")
        print("="*60)
        update_processing_progress(game_id, 'Saving results to database', 95)
        post_results_to_backend(game_id, events_json, team_mapping)
        
        print("\n" + "="*60)
        print("✅ PIPELINE COMPLETE!")
        print("="*60)
        print(f"📊 Total events detected: {len(events_json.get('events', []))}")
        print(f"⏱️  Analysis duration: First 10 minutes of match")
        print(f"🏁 Match started at: {match_start}s in recording")
        
        # Update status to analyzed
        update_processing_progress(game_id, 'Analysis complete!', 100)
        update_video_status(game_id, 'analyzed')
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'game_id': game_id,
                'events_count': len(events_json.get('events', [])),
                'match_start': match_start,
                'teams': {
                    'team_a': team_a_color,
                    'team_b': team_b_color
                },
                'message': 'Analysis complete'
            })
        }
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to failed
        update_video_status(game_id, 'failed', error=str(e))
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'game_id': game_id
            })
        }
    
    finally:
        # Cleanup /tmp directory
        import shutil
        try:
            shutil.rmtree(work_dir)
            print(f"🧹 Cleaned up working directory")
        except:
            pass


# For local testing
if __name__ == '__main__':
    test_event = {
        'game_id': 'test-game-123',
        's3_key': 'videos/test-game-123/video.mp4',
        'title': 'Test Match'
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))

