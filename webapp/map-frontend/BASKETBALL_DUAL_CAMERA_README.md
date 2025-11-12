# Basketball Dual Camera Analysis

This branch implements dual camera analysis for basketball games, allowing users to view and analyze multiple video feeds simultaneously.

## 🏀 Features

### Dual Camera Layouts
- **Side-by-Side**: Two video feeds displayed side by side
- **Picture-in-Picture**: Main camera with secondary camera overlay
- **Primary Only**: Single camera view
- **Secondary Only**: Single camera view (when available)

### Keyboard Shortcuts
- `F`: Toggle fullscreen
- `Escape`: Exit fullscreen
- `1`: Switch to primary camera only
- `2`: Switch to secondary camera only
- `3`: Switch to side-by-side layout
- `4`: Switch to picture-in-picture layout

### Synchronized Playback
- Both video feeds are synchronized
- Single timeline controls both videos
- Events and tagging work across both feeds

## 📁 New Components

### `DualCameraBasketballPlayer`
- Main component for dual camera analysis
- Located: `src/components/video-player/DualCameraBasketballPlayer.tsx`
- Supports multiple layout modes
- Handles synchronized video playback

### Basketball Dashboard
- Enhanced dashboard with dual camera options
- Located: `src/components/dashboard/basketball/basketball-dashboard.tsx`
- Shows video count and dual camera availability
- Provides easy access to single and dual camera views

## 🛣️ New Routes

### Dual Camera Route
```
/dashboard/basketball/games/{gameId}/dual-video/{primaryVideoId}/{secondaryVideoId}
```

### Single Camera Route (existing)
```
/dashboard/basketball/games/{gameId}/video/{videoId}
```

## 🚀 Usage

### Adding a New Basketball Game

1. **Create Game Record**
   ```typescript
   // Use the CreateGameDialog component
   // Set gameType to 'basketball' or appropriate type
   ```

2. **Upload Videos**
   ```typescript
   // Upload primary camera feed
   // Upload secondary camera feed (optional)
   // Wait for processing (status: processing → ready)
   ```

3. **View Analysis**
   ```typescript
   // Single camera: /dashboard/basketball/games/{gameId}/video/{videoId}
   // Dual camera: /dashboard/basketball/games/{gameId}/dual-video/{primaryVideoId}/{secondaryVideoId}
   ```

## 🎯 Benefits for Basketball Analysis

### Dual Camera Advantages
- **Better Player Tracking**: Main camera for overall play, close camera for individual moves
- **Basket Analysis**: Close-up view of shooting form and accuracy
- **Defensive Analysis**: Different angles show defensive positioning
- **Referee Review**: Multiple angles help with call analysis

### Layout Options
- **Side-by-Side**: Compare two angles simultaneously
- **Picture-in-Picture**: Focus on main view with secondary context
- **Single Camera**: Traditional single feed analysis

## 🔧 Technical Implementation

### Video Synchronization
- Both videos use the same timeline
- Events are synchronized across feeds
- Playback controls affect both videos simultaneously

### Adaptive Streaming
- Supports HLS and MP4 formats
- Automatic quality adaptation
- Fallback to progressive download

### Event Management
- Basketball-specific event tagging
- Quarter-based time tracking
- Team score management
- Possession tracking

## 📊 Future Enhancements

- **Camera Switching**: Allow users to swap primary/secondary feeds
- **Custom Layouts**: User-defined camera arrangements
- **Split Screen**: More than two camera feeds
- **Camera Labels**: Identify camera positions (e.g., "Basket View", "Sideline")
- **Synchronization Controls**: Fine-tune video sync if needed

## 🎮 Testing

To test the dual camera feature:

1. Create a basketball game
2. Upload two video files
3. Wait for processing to complete
4. Navigate to the basketball dashboard
5. Click "Dual Camera" button
6. Test different layout modes and keyboard shortcuts

## 📝 Notes

- The dual camera feature requires at least 2 processed videos
- Both videos should be from the same game/timeline
- The primary video is used for event tagging and timeline control
- Secondary video is synchronized but doesn't generate events 