-- Migration: Add team jersey colors
-- Allows clubs to specify their colors for automatic home/away detection

ALTER TABLE teams
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50),
ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50);

-- Create index for color lookups
CREATE INDEX IF NOT EXISTS idx_teams_colors ON teams(primary_color, secondary_color);

-- Example data for testing:
-- UPDATE teams SET primary_color = 'green', secondary_color = 'gold' WHERE name ILIKE '%kerry%';
-- UPDATE teams SET primary_color = 'blue', secondary_color = 'navy' WHERE name ILIKE '%dublin%';
-- UPDATE teams SET primary_color = 'white', secondary_color = 'black' WHERE name ILIKE '%faughanvale%';

