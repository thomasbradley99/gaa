-- Migration: Add video-related fields to games table
-- Run this after initial schema.sql

-- Add video-related fields to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'veo', -- 'veo', 'upload', 'trace', 'spiideo'
ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS duration INTEGER, -- Duration in seconds
ADD COLUMN IF NOT EXISTS ai_analysis JSONB, -- AI-generated analysis
ADD COLUMN IF NOT EXISTS metadata JSONB, -- Additional metadata
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS transcoded_key VARCHAR(500), -- HLS transcoded version
ADD COLUMN IF NOT EXISTS hls_url VARCHAR(500); -- HLS manifest URL

-- Update status column if needed (should already be there, but ensure default)
ALTER TABLE games
ALTER COLUMN status SET DEFAULT 'pending';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_is_demo ON games(is_demo);
CREATE INDEX IF NOT EXISTS idx_games_uploaded_by ON games(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_games_s3_key ON games(s3_key);
CREATE INDEX IF NOT EXISTS idx_games_file_type ON games(file_type);
CREATE INDEX IF NOT EXISTS idx_games_team_id_status ON games(team_id, status);

