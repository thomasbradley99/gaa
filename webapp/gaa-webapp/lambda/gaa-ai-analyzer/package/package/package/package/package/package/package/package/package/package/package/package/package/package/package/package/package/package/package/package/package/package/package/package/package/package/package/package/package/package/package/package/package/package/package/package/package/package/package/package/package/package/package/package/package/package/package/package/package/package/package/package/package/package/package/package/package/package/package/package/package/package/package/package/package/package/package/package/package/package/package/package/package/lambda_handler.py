#!/usr/bin/env python3
"""
GAA AI Analyzer Lambda
Analyzes first 10 minutes of GAA matches using Gemini AI
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
    upload_to_s3,
    download_video
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

def post_results_to_backend(game_id, xml_content, events_json):
    """Post analysis results back to backend API"""
    try:
        # Post events
        response = requests.post(
            f"{BACKEND_API_URL}/api/games/{game_id}/events",
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': LAMBDA_API_KEY
            },
            json={'events': events_json},
            timeout=30
        )
        response.raise_for_status()
        print(f"✅ Posted events to backend for game {game_id}")
        
        # TODO: Post XML to S3 and update game with xml_s3_key
        # For now, just include in events metadata
        
    except Exception as e:
        print(f"❌ Failed to post results to backend: {e}")
        raise


def lambda_handler(event, context):
    """
    Main Lambda handler - orchestrates the GAA AI analysis pipeline
    
    Event format:
    {
        "game_id": "uuid",
        "video_url": "https://veo.co/...",
        "title": "Team A vs Team B"
    }
    """
    print("🎬 GAA AI Analyzer Lambda started")
    print(f"📥 Event: {json.dumps(event)}")
    
    # Extract event data
    game_id = event.get('game_id')
    video_url = event.get('video_url')
    title = event.get('title', 'Unknown Match')
    
    if not game_id or not video_url:
        raise ValueError("Missing required fields: game_id, video_url")
    
    # Update status to 'processing' 
    update_video_status(game_id, 'processing')
    update_processing_progress(game_id, 'Starting analysis', 0)
    
    # Create working directory in /tmp
    work_dir = Path(tempfile.mkdtemp(prefix='gaa-analysis-'))
    print(f"📁 Working directory: {work_dir}")
    
    # Get S3 bucket from environment
    bucket_name = os.environ.get('AWS_BUCKET_NAME', 'clann-gaa-videos-nov25')
    
    try:
        # Download full video to /tmp first (ffmpeg can't stream HTTPS reliably)
        print("\n" + "="*60)
        print("DOWNLOADING VIDEO")
        print("="*60)
        update_processing_progress(game_id, 'Downloading video from VEO', 3)
        video_file = work_dir / "full_video.mp4"
        if not download_video(video_url, str(video_file)):
            raise RuntimeError("Failed to download video")
        
        # Stage 0.0: Download calibration frames (fast - just a few frames)
        print("\n" + "="*60)
        print("STAGE 0.0: Download Calibration Frames")
        print("="*60)
        update_processing_progress(game_id, 'Extracting calibration frames', 8)
        frames_dir = stage_0_0_download_calibration_frames.run(
            video_url=str(video_file),  # Use local file instead of URL
            work_dir=work_dir
        )
        
        # Stage 0.5: Calibrate game (detect teams, identify halves)
        print("\n" + "="*60)
        print("STAGE 0.5: Calibrate Game")
        print("="*60)
        update_processing_progress(game_id, 'Calibrating game (detecting teams)', 15)
        game_profile = stage_0_5_calibrate_game.run(
            frames_dir=frames_dir,
            work_dir=work_dir,
            api_key=GEMINI_API_KEY
        )
        print(f"✅ Game calibrated: {game_profile['team_a']['jersey_color']} vs {game_profile['team_b']['jersey_color']}")
        
        # Stage 0.1: Extract first 10 minutes of first half
        print("\n" + "="*60)
        print("STAGE 0.1: Extract First 10 Minutes")
        print("="*60)
        update_processing_progress(game_id, 'Extracting first 10 minutes', 25)
        video_path = stage_0_1_extract_first_10mins.run(
            video_url=str(video_file),  # Use local file instead of URL
            game_profile=game_profile,
            work_dir=work_dir
        )
        
        # Generate and upload thumbnail
        print("\n" + "="*60)
        print("GENERATING THUMBNAIL")
        print("="*60)
        thumbnail_path = work_dir / "thumbnail.jpg"
        if extract_thumbnail(str(video_path), str(thumbnail_path), timestamp=5):
            thumbnail_s3_key = f"videos/{game_id}/thumbnail.jpg"
            if upload_to_s3(str(thumbnail_path), thumbnail_s3_key, bucket_name, 'image/jpeg'):
                update_thumbnail(game_id, thumbnail_s3_key)
                print(f"✅ Thumbnail uploaded: {thumbnail_s3_key}")
            else:
                print("⚠️ Thumbnail upload failed (continuing)")
        else:
            print("⚠️ Thumbnail extraction failed (continuing)")
        
        # Stage 0.2: Generate clips (10 x 60s clips)
        print("\n" + "="*60)
        print("STAGE 0.2: Generate Clips")
        print("="*60)
        update_processing_progress(game_id, 'Generating video clips', 35)
        clips_dir = stage_0_2_generate_clips.run(
            video_path=video_path,
            work_dir=work_dir
        )
        
        # Stage 1: Clips to descriptions (PARALLEL Gemini API calls)
        print("\n" + "="*60)
        print("STAGE 1: Clips to Descriptions (Parallel)")
        print("="*60)
        update_processing_progress(game_id, 'Analyzing clips with AI (parallel)', 45)
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
        update_processing_progress(game_id, 'Creating narrative', 60)
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
        update_processing_progress(game_id, 'Classifying events (goals, points, fouls)', 75)
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
        update_processing_progress(game_id, 'Extracting structured data', 85)
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
        update_processing_progress(game_id, 'Generating XML analysis', 92)
        xml_content = stage_5_export_to_anadi_xml.run(
            events_json=events_json,
            game_profile=game_profile,
            title=title
        )
        
        # Post results back to backend
        print("\n" + "="*60)
        print("POSTING RESULTS TO BACKEND")
        print("="*60)
        update_processing_progress(game_id, 'Saving results', 95)
        post_results_to_backend(game_id, xml_content, events_json)
        
        print("\n" + "="*60)
        print("✅ PIPELINE COMPLETE!")
        print("="*60)
        print(f"📊 Total events detected: {len(events_json.get('events', []))}")
        
        # Update status to completed
        update_processing_progress(game_id, 'Complete', 100)
        update_video_status(game_id, 'completed')
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'game_id': game_id,
                'events_count': len(events_json.get('events', [])),
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
                'error': str(e)
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
        'video_url': 'https://veo.co/teams/southport-trinity-gaa/matches/2024-07-14-southport-trinity-vs-st-chads/22dd26be',
        'title': 'Test Match'
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))

