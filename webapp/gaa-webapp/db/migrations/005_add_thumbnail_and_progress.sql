-- Add thumbnail and progress tracking fields
-- Migration: 005_add_thumbnail_and_progress.sql

-- Add thumbnail_key for thumbnail image location
ALTER TABLE games ADD COLUMN IF NOT EXISTS thumbnail_key VARCHAR(500);

-- Add processing_progress for real-time progress tracking
ALTER TABLE games ADD COLUMN IF NOT EXISTS processing_progress JSONB;

-- Add index for thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_games_thumbnail_key ON games(thumbnail_key);

COMMENT ON COLUMN games.thumbnail_key IS 'S3 path to thumbnail image (e.g., videos/{game_id}/thumbnail.jpg)';
COMMENT ON COLUMN games.processing_progress IS 'Real-time processing progress: {stage, percent, data}';

