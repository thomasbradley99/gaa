const express = require('express');
const { query } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's games
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    let queryText = `
      SELECT 
        g.*,
        t.name as team_name
      FROM games g
      INNER JOIN team_members tm ON g.team_id = tm.team_id
      INNER JOIN teams t ON g.team_id = t.id
      WHERE tm.user_id = $1
    `;
    
    const params = [req.user.userId];
    
    // Filter by team if teamId provided
    if (teamId) {
      queryText += ` AND g.team_id = $2`;
      params.push(teamId);
    }
    
    queryText += ` ORDER BY g.created_at DESC`;
    
    const result = await query(queryText, params);

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// Create game (supports VEO URL or file upload)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, teamId, videoUrl } = req.body;

    if (!title || !teamId) {
      return res.status(400).json({ error: 'Title and team ID are required' });
    }

    // Verify user is member of team
    const memberResult = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }

    // Determine file type based on videoUrl
    let fileType = 'upload'; // default for file uploads
    if (videoUrl) {
      if (videoUrl.includes('veo.co') || videoUrl.includes('app.veo.co')) {
        fileType = 'veo';
      } else if (videoUrl.includes('traceup.com')) {
        fileType = 'trace';
      } else if (videoUrl.includes('spiideo.com')) {
        fileType = 'spiideo';
      } else {
        fileType = 'veo'; // default for external URLs
      }
    }

    const result = await query(
      `INSERT INTO games (title, description, team_id, created_by, video_url, file_type, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $4, 'pending')
       RETURNING *`,
      [title, description || null, teamId, req.user.userId, videoUrl || null, fileType]
    );

    res.status(201).json({ game: result.rows[0] });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get demo games (public, no auth required)
router.get('/demo', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.title, g.description, g.thumbnail_url, g.duration, g.status, g.video_url, g.file_type, g.created_at
       FROM games g
       WHERE g.is_demo = true AND g.status = 'analyzed'
       ORDER BY g.created_at DESC
       LIMIT 5`
    );

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get demo games error:', error);
    res.status(500).json({ error: 'Failed to get demo games' });
  }
});

// Get single game
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        g.*,
        t.name as team_name
       FROM games g
       INNER JOIN team_members tm ON g.team_id = tm.team_id
       INNER JOIN teams t ON g.team_id = t.id
       WHERE g.id = $1 AND tm.user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];
    
    // TODO: Generate presigned S3 URLs if s3_key exists
    // For now, return game data as-is
    // When S3 integration is added, we'll generate presigned URLs here
    
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

module.exports = router;

