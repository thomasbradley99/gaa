-- Migration: Add team color fields to support GAA team colors
-- Teams like Dublin (blue), Kerry (green/gold), etc.

-- Add color fields to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS home_color VARCHAR(7) DEFAULT '#016F32',  -- GAA green default
ADD COLUMN IF NOT EXISTS away_color VARCHAR(7) DEFAULT '#FFFFFF',  -- White default
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);                   -- Optional third color

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_teams_colors ON teams(home_color, away_color);

-- Add comments
COMMENT ON COLUMN teams.home_color IS 'Primary team color (hex format, e.g., #0066CC for Dublin blue)';
COMMENT ON COLUMN teams.away_color IS 'Secondary team color (hex format, e.g., #FFFFFF for white)';
COMMENT ON COLUMN teams.accent_color IS 'Optional accent/third color for teams with 3+ colors';

