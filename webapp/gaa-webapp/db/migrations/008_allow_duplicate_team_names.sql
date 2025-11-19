-- Migration: Allow duplicate team names for easier dev testing
-- Multiple teams can now claim to be "Kilmeena GAA", etc.

ALTER TABLE teams
DROP CONSTRAINT IF EXISTS unique_team_name;

COMMENT ON COLUMN teams.name IS 'Team name (can be duplicated - teams are identified by ID and invite_code)';

