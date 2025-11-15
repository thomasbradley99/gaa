-- Add unique constraint on team name to prevent duplicate clubs
ALTER TABLE teams
ADD CONSTRAINT unique_team_name UNIQUE (name);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

