-- Migration: Add team color fields to support GAA team colors
-- GAA teams have ONE kit with TWO colors (e.g., Kerry: green & gold, Dublin: sky blue & navy)

-- Drop generated columns first if they exist (can't have both generated and regular columns)
ALTER TABLE teams DROP COLUMN IF EXISTS home_color CASCADE;
ALTER TABLE teams DROP COLUMN IF EXISTS away_color CASCADE;

-- Add color fields to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#016F32',  -- GAA green default
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#FFD700',  -- Gold default
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);                       -- Optional third color

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_teams_colors ON teams(primary_color, secondary_color);

-- Add comments
COMMENT ON COLUMN teams.primary_color IS 'Primary kit color (hex format, e.g., #016F32 for Kerry green)';
COMMENT ON COLUMN teams.secondary_color IS 'Secondary kit color (hex format, e.g., #FFD700 for Kerry gold)';
COMMENT ON COLUMN teams.accent_color IS 'Optional accent/third color for teams with 3+ colors';

