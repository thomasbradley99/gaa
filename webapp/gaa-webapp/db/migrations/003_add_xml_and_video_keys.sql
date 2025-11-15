-- Add S3 keys for video and XML analysis files
-- Migration: 003_add_xml_and_video_keys.sql

-- Add s3_key for video file location
ALTER TABLE games ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);

-- Add xml_s3_key for XML analysis file location
ALTER TABLE games ADD COLUMN IF NOT EXISTS xml_s3_key VARCHAR(500);

-- Add location and opponent fields for better game metadata
ALTER TABLE games ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent VARCHAR(255);
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_date DATE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add index for faster S3 key lookups
CREATE INDEX IF NOT EXISTS idx_games_s3_key ON games(s3_key);
CREATE INDEX IF NOT EXISTS idx_games_xml_s3_key ON games(xml_s3_key);
CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date);

COMMENT ON COLUMN games.s3_key IS 'S3 path to video file (e.g., videos/{game_id}/video.mp4)';
COMMENT ON COLUMN games.xml_s3_key IS 'S3 path to XML analysis file (e.g., videos/{game_id}/analysis.xml)';
COMMENT ON COLUMN games.location IS 'Game location/venue';
COMMENT ON COLUMN games.opponent IS 'Opponent team name';
COMMENT ON COLUMN games.game_date IS 'Date the game was played';
COMMENT ON COLUMN games.duration_seconds IS 'Video duration in seconds';

