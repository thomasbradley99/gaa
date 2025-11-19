-- Migration: Make secondary color optional
-- Some teams only wear one color

ALTER TABLE teams
ALTER COLUMN secondary_color DROP NOT NULL;

COMMENT ON COLUMN teams.secondary_color IS 'Optional secondary jersey color (can be NULL for single-color kits)';

