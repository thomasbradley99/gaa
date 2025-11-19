# TODO

## Critical
- Verify event timestamps sync with video playback
- Fix team colors metadata (Lambda → Backend)

## AI Quality
- Improve event detection accuracy
- Better event descriptions (more detailed)
- Fix score accuracy (missing points/goals)

## User Experience
- Add HLS streaming (large videos are slow)
- Fix presigned URL expiry (videos break after 1 hour)
- Show "Only first 10 mins analyzed" banner
- Stats editing system
  - Allow users to edit event stats (scores, fouls, etc.)
  - Commit stat changes to database
  - AI coach reads current stats from DB (including user edits)
  - Mark edited events (userEdited flag in metadata)
- User company / sales / admin accounts
- User adds colour to team and AI picks it up

## Nice to Have
- Keyboard shortcuts help ("?" overlay)
- Thumbnail fallbacks for missing images
- Event validation status badges
- Player name detection

## Future Enhancements
- Club color database for automatic home/away detection
- "Swap Teams" button (manual override)
