#!/usr/bin/env python3
"""
1_analyze_clips.py - Clean GAA Kickout Analysis
Video clips → Text descriptions of kickouts
"""

import os
import time
import json
import google.generativeai as genai
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")
genai.configure(api_key=GEMINI_API_KEY)

def analyze_clip_for_kickouts(clip_path, timestamp, half_name):
    """Analyze a single clip for GAA kickouts"""
    try:
        # Upload video to Gemini
        video_file = genai.upload_file(path=clip_path)
        
        # Wait for processing
        while video_file.state.name == "PROCESSING":
            time.sleep(1)
            video_file = genai.get_file(video_file.name)
        
        if video_file.state.name == "FAILED":
            return f"❌ Failed to process {clip_path}"
        
        # --- Load pre-computed object detections ---
        object_detections_text = "Not available."
        detection_json_path = Path("results/object_detections") / f"{Path(clip_path).stem}.json"
        
        if detection_json_path.exists():
            try:
                with open(detection_json_path, 'r') as f:
                    detection_data = json.load(f)
                    # Use the new "annotations_by_frame" structure
                    annotations_by_frame = detection_data.get("annotations_by_frame", {})
                    
                    # To keep the prompt consistent, we'll use the detections 
                    # from the *first* analyzed frame.
                    if annotations_by_frame:
                        # Get the annotations from the earliest frame index
                        first_frame_idx = sorted(annotations_by_frame.keys())[0]
                        first_frame_annotations = annotations_by_frame[first_frame_idx]
                        
                        detected_objects = [
                            f"{ann['class_name']} ({ann['grounding_dino_score']:.2f})"
                            for ann in first_frame_annotations
                        ]
                        object_detections_text = "\n".join(f"- {obj}" for obj in detected_objects)
                    else:
                        object_detections_text = "No objects were detected in the pre-analysis step."
            except Exception as e:
                object_detections_text = f"Could not load detection data: {e}"
        
        # GAA kickout analysis prompt - ULTRA STRICT
        prompt = f"""
        You are an expert gaelic football analyst watching a 15-second clip from the {half_name} at {timestamp}.

        **GOAL:**
        Using all information and context provided below, determine if a kickout has occured within this 15 second clip and provide your response in the format described below.

        **PRE-DETECTED OBJECTS:**
        A separate, specialized object detection and segmentation model (GroundedSAM2) has identified the following objects (their bounding boxes and segmentation masks) in a frame from this clip. Use this as a strong prior for your analysis. 
        You must perform your own frame analysis and not solely rely on the pre-detected objects. The segmentation has only been computed once per second on this 30fps footage.
        {object_detections_text} It is vital to recall that the goalkeeper will most likely be mistaken for a player in the detections, but will consistently be found next to their goal.


        **CAMERA SYSTEM:**
        - The provided footage has been obtained from a Veo Sports Camera. 
        - It is positioned on the near sideline of pitch at the halfway mark. 
        - The camera is fixed in place, but swivels to follow the ball, thus the region of the pitch being observed can change from frame to frame.
        - You must use optical flow to determine the region of the pitch being observed. Prioritise optical flow of stationary objects to clearly identify the region of the pitch being observed.
        - Object detections may be small compared to overall frame size. Enlarge each frame to an optimal size to improve detection accuracy.
        - You are permitted to use multiple overlapping crops of the frame when analysiing it. 
        - The camera is at a height of approximately 10ft above the pitch. This will strongly impact your abaility to judge distances, especially for players moving away from the goalpost. Factor this into your considerations.
        - In most cases the camera will pnly be able to capture 30% of the entire pitch area at once. This should be factored hwen considering pitch regions, player movements etc 

        VISUAL AND CONTEXTUAL DESCRIPTIONS
        1. PLAYER: 
        - There are multiple players in the clip, who play for two teams - their jersey colours identify their team affiliation. 
        - Players will typically congregate near the ball, and they may be seen holding or kicking it to shoot or pass.
        - Players will be recipients of kickouts but will never be the one to kick the ball in that scenario.
        - Players are the most common person detection in the clip.

        2. GOALKEEPER: 
        - There are two goalkeepers. They typically wear jerseys with a bright colour and are consistently found next to their goal, and no where else. 
        - The goalkeeper may be mistaken for a player in the detections, but will consistently be found next to their goal.
        - It is highly unlikely that there will be more than one goalkeeper in a frame. 
        - The goalkeeper will typically stand right in front of their goalpost.
        - The goalkeeper moves forward and away from their goal when placing the ball down for a kickout.

        3. BALL: 
        - The ball is small and usually white in colour. 
        - There is only one ball within the pitch at all times.
        - The ball can be held in hand or kicked. 

        4. PITCH: 
        - The pitch is the green, grassy surface that the players are playing on.
        - There are faint pitch lines present but the lines may not be clearly visible in this footage.
    
        5. GOALPOST: 
        - The goalposts are white in colour and resemble a football goal closely.
        - They resemble a football goal with the sidebars extended verticall upwards to form upright posts as usually seen in rugby games.
        - There are two goalposts, found at each end of the pitch.
        - The goalkeeper will typically stand right in front of their goalpost.

        6. TEAM:
        - There are two teams, each with 15 players. 
        - The teams have their own unique jersey colours.
        - Goalkeepers for each time will wear different colours to their team's main colours.

        7. REFEREE:
        - The referee is the man dressed in black. who will always be found near the middle of the pithc, never near the outer edges. 
        - When the ball goes out of play, the referee blows his whistle and signals a kickout.
        - The referee is not part of either team, and is not a player, goalkeeper, staff or the crowd.

        8. CROWD:
        - The crowd is the people watching the game.
        - The crowd is not part of either team, and is not a player, goalkeeper, staff or the referee.
        - The crowd will be observed at the edges of the pitch, but never within the pitch.

        **KICKOUT DEFINITION:**
        - A kickout is the restart of play taken by the goalkeeper after the opposition has scored a point or goal, or after a wide ball. 
        - The camera may see the kickout from either half of the field depending on which team is taking it. 


        **KICKOUT SEQUENCE:**
        - The ball goes out of play, either due to a goal, a point, or a missed shot.
        - The referee blows his whistle and signals a kickout. You may observe the referee moving arms to make this signal.
        - All players will be observed to move away from the goalpost and spread out across the pitch, possibly off frame.
        - The goalkeeper ( ikely mistaken for a football player in the detections) moves away from their goalpost, placing the ball down around the 20m line, and performing a quick runup before kicking the ball.
        - The ball is kicked, and the players on the pitch contest for the ball.


        ** ADDITIONAL GUIDELINES:*`*
        - If you observe the goalkeeper kick a ball on the pitch with less than 4 players in their vicinity (500 pixels), mark it as a kickout.
        - It is not compulsory to observe all events of the kickout sequence within the clip. The most essential action to observe is the goalkeeper (which may be mistaken for a player in the detections) kicking a stationary ball. 
        - The ball will always be present in the clip as the camera swivels to follow it.
        - There wont be more than 3 players in the vicinity of the goalkeeper when the ball is kicked.
        - You must prioritise the goalkeeper kicking the ball over any other action in the event sequence.
        - Zoom or enlarge frame as necessary to improve detection accuracy and confidence.
        - If you ever observe the ball going out of play after a shot, point or goal, mark the current clip, or its successor, as a kickout.
        - It is very possible for the goalkeeper to be detected as a football player, so if you see a player move towards a stationary ball and kick it then mark it as a kickout. 



        **CONTEXTUAL IMPROVEMENTS:**
        - Utilise the context of the previous 15 seconds of footage to predict if a kickout is likely to occur in the next clip.
        - It is possible that some kickout sequence events will be missed by you due to a lack of accurate object detection. Factor this into your confidence score. This means even partial sequence detections could indicate a kickout.
        
        

        **OUTPUT FORMAT:**
        KICKOUT: [YES/NO]
        CONFIDENCE: [1-10]
        HALF: {half_name}
        CLIP_TIME: {timestamp}
        DETECTIONS: [List of all detections in the clip, player, ball, goalpost, grass etc]
        MISSED_DETECTIONS: [List of expected detections based on this prompt that were not observed.]

        
        IF KICKOUT = YES:
        TRIGGER_EVENT: [What caused it]
        EXACT_CONTACT_TIME: [X.X seconds when foot touches ball]
        KICKING_TEAM: [Team A/Team B based on goalkeeper jersey]
        PLAYER_POSITIONING: [Did players clear and spread? YES/NO]
        
        KICK_ANALYSIS:
        KICK_DISTANCE: [Short/Medium/Long]
        KICK_DIRECTION: [Left/Center/Right]
        KICK_ACCURACY: [On target/Off target/Contested]
        
        POSSESSION_OUTCOME:
        POSSESSION_WON_BY: [Team A/Team B/Contested/Unclear]
        POSSESSION_LOCATION: [Field position where caught]
        NEXT_ACTION: [What happened after possession]
        
        JERSEY_COLORS:
        TEAM_A_COLORS: [Describe colors]
        TEAM_B_COLORS: [Describe colors]
        GOALKEEPER_JERSEY: [Color of kicking goalkeeper]
        
        TACTICAL_CONTEXT: [Full sequence description]

        IF KICKOUT = NO:
        REASONING: [Why not an official kickout]

    
        """
        
        # Generate analysis
        model = genai.GenerativeModel("gemini-2.0-flash") #was gemini-2.5-pro
        response = model.generate_content([video_file, prompt])
        
        # Clean up
        genai.delete_file(video_file.name)
        
        return response.text
        
    except Exception as e:
        return f"❌ Error analyzing {clip_path}: {str(e)}"

def main():
    print(f"🥅 GAA KICKOUT ANALYSIS - STEP 1: VIDEO → TEXT (GEMINI 2.0 FLASH)") #was gemini-2.5-pro
    print("=" * 60)
    
    # Configuration
    TIME_LIMIT_MINUTES = 10  # Analyze first 10 minutes
    MAX_WORKERS = 4  # Reduced for Pro model (slower but higher quality)
    
    # Setup paths
    clips_base = Path("../3.5-video-splitting/clips/first_half")
    output_dir = Path("results/kickout_analysis")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if not clips_base.exists():
        print(f"❌ Clips directory not found: {clips_base}")
        return
    
    # Find clips for specified time period
    all_clips = sorted(clips_base.glob("*.mp4"))
    target_clips = []
    
    for clip in all_clips:
        if "clip_" in clip.name:
            parts = clip.stem.replace("clip_", "").split("m")
            if len(parts) >= 1:
                try:
                    minutes = int(parts[0])
                    if minutes < TIME_LIMIT_MINUTES:
                        target_clips.append(clip)
                except ValueError:
                    continue
    
    print(f"📊 Found {len(target_clips)} clips in first {TIME_LIMIT_MINUTES} minutes")
    print(f"🧵 Using {MAX_WORKERS} threads for processing")
    
    # Process clips in parallel
    start_time = time.time()
    completed = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        for video_file in target_clips:
            # Skip if already processed
            output_file = output_dir / f"{video_file.stem}.txt"
            if output_file.exists():
                print(f"⏭️  Skipping {video_file.name} (already processed)")
                continue
            
            # Extract timestamp from filename
            timestamp = video_file.stem.replace('clip_', '').replace('m', ':').replace('s', '')
            
            future = executor.submit(analyze_clip_for_kickouts, str(video_file), timestamp, "first_half")
            futures.append((future, video_file, timestamp))
        
        # Collect results with progress
        for future, video_file, timestamp in futures:
            try:
                result = future.result()
                
                # Save result
                output_file = output_dir / f"{video_file.stem}.txt"
                with open(output_file, 'w') as f:
                    f.write(f"HALF: first_half\n")
                    f.write(f"TIMESTAMP: {timestamp}\n")
                    f.write(f"CLIP_FILE: {video_file.name}\n")
                    f.write(f"ANALYSIS:\n{result}\n")
                
                completed += 1
                progress = (completed / len(futures)) * 100 if futures else 0
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                
                print(f"📈 Progress: {completed}/{len(futures)} ({progress:.1f}%) | "
                      f"Rate: {rate:.1f} clips/s")
                
            except Exception as e:
                print(f"❌ Error processing {video_file}: {e}")
    
    processing_time = time.time() - start_time
    
    print(f"\n✅ CLIP ANALYSIS COMPLETE!")
    print(f"⏱️  Time: {processing_time:.1f}s")
    print(f"📁 Results saved to: {output_dir}")
    print(f"\n🔄 Next step: Run '2_synthesize_events.py' to create timeline")

if __name__ == "__main__":
    main() 