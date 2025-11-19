# TODO

## Critical
- [ ] Verify event timestamps sync with video playback
- [ ] Fix team colors metadata (Lambda → Backend)
- [ ] Implement club color matching for home/away detection
  - [ ] Add color columns to teams table
  - [ ] Seed club jersey colors in database
  - [ ] Pass club colors to Lambda
  - [ ] Lambda matches detected colors to club
  - [ ] Auto-assign club = home, opponent = away

## AI Quality
- [ ] Improve event detection accuracy
- [ ] Better event descriptions (more detailed)
- [ ] Fix score accuracy (missing points/goals)

## User Experience
- [ ] Add HLS streaming (large videos are slow)
- [ ] Fix presigned URL expiry (videos break after 1 hour)
- [ ] Show "Only first 10 mins analyzed" banner
- [ ] Sort out editing of stats
- [ ] User company / sales / admin accounts

## Nice to Have
- [ ] Keyboard shortcuts help ("?" overlay)
- [ ] Thumbnail fallbacks for missing images
- [ ] Event validation status badges
- [ ] Player name detection
- [ ] "Swap Teams" button (manual override if color matching fails)

