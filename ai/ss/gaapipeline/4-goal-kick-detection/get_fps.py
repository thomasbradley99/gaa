import cv2
from pathlib import Path

# --- Configuration ---
VIDEO_FILE = Path("/home/ubuntu/5th-july-gaa/1-veo-download/downloads/kevy-game.mp4")

def get_video_fps():
    """
    Reads the FPS from the specified video file.
    """
    print(f"Checking for video file: {VIDEO_FILE.resolve()}")

    if not VIDEO_FILE.is_file():
        print(f"❌ Error: Video file not found at {VIDEO_FILE}")
        return

    print(f"Reading properties from: {VIDEO_FILE.name}...")

    cap = cv2.VideoCapture(str(VIDEO_FILE))
    
    if not cap.isOpened():
        print(f"🔥 Error: Could not open video file {VIDEO_FILE}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    
    if fps > 0:
        print(f"✅ The video has an FPS of: {fps:.2f}")
    else:
        print("⚠️ Could not determine the FPS from the video file.")
        
    cap.release()

if __name__ == "__main__":
    get_video_fps() 