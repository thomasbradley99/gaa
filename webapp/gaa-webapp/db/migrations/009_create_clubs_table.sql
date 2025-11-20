-- Create clubs table to store GAA clubs from pitch finder data
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_name VARCHAR(500) NOT NULL,
  pitch_name VARCHAR(500),
  code VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  province VARCHAR(100),
  country VARCHAR(100),
  division VARCHAR(100),
  county VARCHAR(100),
  directions TEXT,
  twitter TEXT,
  elevation DECIMAL(10, 2),
  annual_rainfall DECIMAL(10, 2),
  rain_days DECIMAL(10, 2),
  uses_veo BOOLEAN DEFAULT FALSE,
  veo_recordings INTEGER DEFAULT 0,
  veo_club_identifier VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_clubs_uses_veo ON clubs(uses_veo);
CREATE INDEX idx_clubs_county ON clubs(county);
CREATE INDEX idx_clubs_province ON clubs(province);
CREATE INDEX idx_clubs_club_name ON clubs(club_name);

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

