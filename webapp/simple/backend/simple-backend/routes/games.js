const express = require('express');
const { query } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's games
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT g.* FROM games g
       INNER JOIN team_members tm ON g.team_id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.userId]
    );

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// Create game
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, teamId } = req.body;

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

    const result = await query(
      `INSERT INTO games (title, description, team_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description || null, teamId, req.user.userId]
    );

    res.status(201).json({ game: result.rows[0] });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get single game
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT g.* FROM games g
       INNER JOIN team_members tm ON g.team_id = tm.team_id
       WHERE g.id = $1 AND tm.user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ game: result.rows[0] });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

module.exports = router;

