# todo

## critical
- verify event timestamps sync with video playback
- fix team colors metadata (lambda → backend)

## ai quality
- improve event detection accuracy
- better event descriptions (more detailed)
- fix score accuracy (missing points/goals)

## crm
- get crm link in the sales accounts 

## user experience
- add hls streaming (large videos are slow)
- fix presigned url expiry (videos break after 1 hour)
- show "only first 10 mins analyzed" banner
- google auth on frontend
- password reset
- download functionality on videos
- stats editing system
  - allow users to edit event stats (scores, fouls, etc.)
  - commit stat changes to database
  - ai coach reads current stats from db (including user edits)
  - mark edited events (useredited flag in metadata)
- user company / sales / admin accounts
- user adds colour to team and ai picks it up
- // make scraper for team colours and autofill 

## nice to have
- keyboard shortcuts help ("?" overlay)
- thumbnail fallbacks for missing images
- event validation status badges
- player name detection

## future enhancements
- club color database for automatic home/away detection
- "swap teams" button (manual override)
